'use strict';

const _ = require('lodash');
const { parseParams } = require('../utils/param.utils');
const { parseSQLFilter } = require('../utils/filter.utils');

/**
 * Sequelize Database Adapter
 * @classdesc Adapter for Sequelize operations using Sequelize
 * @constructor
 * @param {Object} model - Sequelize model
 * @param {Object} options - Options for the Sequelize adapter
 */
function SequelizeCrudder(model, options) {
    this.model = model;
    this.options = options;
    if (!this.options) {
        this.options = {};
    }
    if (this.options.logger) {
        this.logger = this.options.logger;
    }
    if (!this.options.idField) {
        this.options.idField = '_id';
    }
    if (!this.options.permanentDeleteField) {
        this.options.permanentDeleteField = '_metadata.deleted';
    }
    if (!this.options.trackingId) {
        this.options.trackingId = 'x-request-id';
    }
    if (!this.model) {
        throw new Error('Sequelize model is required for Sequelize adapter');
    }
}

SequelizeCrudder.prototype._logError = function (req, err, message = null) {
    if (this.logger) {
        this.logger.error(`${req.headers[this.options.trackingId] || req.headers.host} - ${message || err.message}`, err);
    }
};

SequelizeCrudder.prototype._customizer = function (objValue, srcValue) {
    if (_.isArray(objValue)) {
        return srcValue;
    }
};

SequelizeCrudder.prototype.count = async function (req, res) {
    try {
        let params = parseParams(req);
        let filter = parseSQLFilter.FilterParse(params.filter);
        let count = await this.model.countDocuments(filter);
        res.status(200).json(count);
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

SequelizeCrudder.prototype.find = async function (req, res) {
    try {
        let params = parseParams(req);
        let filter = parseSQLFilter.FilterParse(params.filter);
        let query = this.model.find(filter);

        if (params.lean) {
            query.lean();
        }

        if (params.select && params.select.length > 0) {
            query.select(params.select.join(' '));
        }

        if (params.search) {
            filter['$text'] = { '$search': params.search };
        }

        if (params.sort) {
            query.sort(params.sort);
        }

        if (params.limit !== -1) {
            query.skip(params.skip).limit(params.limit);
        }
        let docs = await query.exec();
        if (!params.metadata) {
            res.status(200).json(docs);
            return;
        }
        const totalCount = await this.model.countDocuments({});
        const matched = await this.model.countDocuments(filter);
        res.status(200).json({
            _metadata: {
                page: Math.floor(params.skip / params.limit) + 1,
                count: params.limit,
                matched: matched,
                totalCount: totalCount
            },
            data: docs
        });
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

SequelizeCrudder.prototype.findById = async function (req, res) {
    try {
        let params = parseParams(req);
        let filter = {
            [this.options.idField]: params.id
        };
        let query = this.model.findOne(filter);
        if (params.select && params.select.length > 0) {
            query.select(params.select.join(' '));
        }
        let doc = await query.exec();
        if (!doc) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        res.status(200).json(doc);
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};


SequelizeCrudder.prototype.create = async function (req, res) {
    try {
        let params = parseParams(req);
        let data = params.data;
        let upsert = params.upsert;
        let documents = Array.isArray(data) ? data : [data];
        let results = [];
        await documents.reduce(async (prev, curr) => {
            await prev;
            let result, doc;
            if (upsert && curr[this.options.idField]) {
                doc = await this.model.findOne({ [this.options.idField]: curr[this.options.idField] });
                if (doc) {
                    _.mergeWith(doc, curr, this._customizer);
                }
            }
            if (!doc) {
                doc = new this.model(curr);
            }
            try {
                doc._req = req;
                result = await doc.save();
                results.push({ status: 200, data: result });
                return;
            } catch (err) {
                results.push({ status: 400, error: err });
            }
            return Promise.resolve();
        }, Promise.resolve(null));
        let errorCount = results.filter(result => result.status !== 200).length;
        let successCount = results.filter(result => result.status === 200).length;
        let successData = results.filter(result => result.status === 200).map(result => result.data);
        let errorData = results.filter(result => result.status !== 200).map(result => result.error);
        if (errorCount === successCount) {
            res.status(400).json(Array.isArray(data) ? errorData : errorData[0]);
        } else if (errorCount > 0 && errorCount !== successCount) {
            res.status(207).json(Array.isArray(data) ? successData : successData[0]);
        } else {
            res.status(200).json(Array.isArray(data) ? successData : successData[0]);
        }
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

SequelizeCrudder.prototype.updateById = async function (req, res) {
    try {
        let params = parseParams(req);
        let id = params.id;
        let data = params.data;
        let upsert = params.upsert;
        let filter = {
            [this.options.idField]: id
        };
        let document = await this.model.findOne(filter).exec();
        if (!document && !upsert) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        if (document) {
            let oldLeanDocument = document.toObject();
            let updatedLeanDocument = _.mergeWith(oldLeanDocument, data, this._customizer);
            if (_.isEqual(oldLeanDocument, updatedLeanDocument)) {
                return document;
            }
            let updatedDocument = _.mergeWith(document, data, this._customizer);
            updatedDocument._req = req;
            updatedDocument._oldDoc = oldLeanDocument;
            await updatedDocument.save();
            res.status(200).json(updatedDocument);
        } else {
            let newDocument = new this.model(data);
            newDocument._req = req;
            await newDocument.save();
            res.status(200).json(newDocument);
        }
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

SequelizeCrudder.prototype.updateByFilter = async function (req, res) {
    try {
        let params = parseParams(req);
        let filter = parseSQLFilter.FilterParse(params.filter);
        let data = params.data;
        let upsert = params.upsert;
        let documents = await this.model.find(filter).exec();
        const results = [];
        await documents.reduce(async (prev, curr) => {
            await prev;
            if (curr) {
                let oldLeanDocument = curr.toObject();
                let updatedLeanDocument = _.mergeWith(oldLeanDocument, data, this._customizer);
                if (_.isEqual(oldLeanDocument, updatedLeanDocument)) {
                    results.push({ status: 200, data: curr });
                    return;
                }
                let updatedDocument = _.mergeWith(curr, data, this._customizer);
                updatedDocument._req = req;
                updatedDocument._oldDoc = oldLeanDocument;
                await updatedDocument.save();
                results.push({ status: 200, data: updatedDocument });
            } else if (upsert) {
                let newDocument = new this.model(data);
                newDocument._req = req;
                await newDocument.save();
                results.push({ status: 200, data: newDocument });
            }
        }, Promise.resolve(null));
        let errorCount = results.filter(result => result.status !== 200).length;
        let successCount = results.filter(result => result.status === 200).length;
        let successData = results.filter(result => result.status === 200).map(result => result.data);
        let errorData = results.filter(result => result.status !== 200).map(result => result.error);
        if (errorCount === successCount) {
            res.status(400).json(Array.isArray(data) ? errorData : errorData[0]);
        } else if (errorCount > 0 && errorCount !== successCount) {
            res.status(207).json(Array.isArray(data) ? successData : successData[0]);
        } else {
            res.status(200).json(Array.isArray(data) ? successData : successData[0]);
        }
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

SequelizeCrudder.prototype.deleteById = async function (req, res) {
    try {
        let params = parseParams(req);
        let id = params.id;
        let filter = {
            [this.options.idField]: id
        };
        let document = await this.model.findOne(filter).exec();
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        document._req = req;
        document._oldDoc = document.toObject();
        if (this.options.permanentDelete) {
            await document.deleteOne();
        } else {
            document.set(this.options.permanentDeleteField, true);
            await document.save();
        }
        res.status(200).json({ message: 'Document deleted' });
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

SequelizeCrudder.prototype.deleteByFilter = async function (req, res) {
    try {
        let params = parseParams(req);
        let filter = parseSQLFilter.FilterParse(params.filter);
        let documents = await this.model.find(filter).exec();
        await documents.reduce(async (prev, curr) => {
            await prev;
            curr._req = req;
            curr._oldDoc = curr.toObject();
            if (this.options.permanentDelete) {
                await curr.deleteOne();
            } else {
                curr.set(this.options.permanentDeleteField, true);
                await curr.save();
            }
            return Promise.resolve();
        }, Promise.resolve(null));
        res.status(200).json({ message: 'Documents deleted', count: documents.length });
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};


SequelizeCrudder.prototype.bulkShowByIds = async function (req, res) {
    try {
        let params = parseParams(req);
        let ids = params.ids;
        let select = params.select;
        let sort = params.sort;
        let filter = {
            [this.options.idField]: { '$in': ids }
        };
        let query = this.model.find(filter);
        if (select && select.length > 0) {
            query = query.select(select.join(' '));
        }
        if (sort) {
            query = query.sort(sort);
        }
        const docs = await query.exec();
        res.status(200).json(docs);
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

SequelizeCrudder.prototype.bulkUpdateByIds = async function (req, res) {
    try {
        let params = parseParams(req);
        let ids = params.ids;
        let filter = {
            [this.options.idField]: { '$in': ids }
        };
        let data = params.data;
        let upsert = params.upsert;
        let documents = await this.model.find(filter).exec();
        const results = [];
        await documents.reduce(async (prev, curr) => {
            await prev;
            if (curr) {
                let oldLeanDocument = curr.toObject();
                let updatedLeanDocument = _.mergeWith(oldLeanDocument, data, this._customizer);
                if (_.isEqual(oldLeanDocument, updatedLeanDocument)) {
                    results.push({ status: 200, data: curr });
                    return;
                }
                let updatedDocument = _.mergeWith(curr, data, this._customizer);
                updatedDocument._req = req;
                updatedDocument._oldDoc = oldLeanDocument;
                await updatedDocument.save();
                results.push({ status: 200, data: updatedDocument });
            } else if (upsert) {
                let newDocument = new this.model(data);
                newDocument._req = req;
                await newDocument.save();
                results.push({ status: 200, data: newDocument });
            }
        }, Promise.resolve(null));
        let errorCount = results.filter(result => result.status !== 200).length;
        let successCount = results.filter(result => result.status === 200).length;
        let successData = results.filter(result => result.status === 200).map(result => result.data);
        let errorData = results.filter(result => result.status !== 200).map(result => result.error);
        if (errorCount === successCount) {
            res.status(400).json(Array.isArray(data) ? errorData : errorData[0]);
        } else if (errorCount > 0 && errorCount !== successCount) {
            res.status(207).json(Array.isArray(data) ? successData : successData[0]);
        } else {
            res.status(200).json(Array.isArray(data) ? successData : successData[0]);
        }
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

SequelizeCrudder.prototype.bulkDeleteByIds = async function (req, res) {
    try {
        let params = parseParams(req);
        let ids = params.ids;
        let filter = {
            [this.options.idField]: { '$in': ids }
        };
        let documents = await this.model.find(filter).exec();
        await documents.reduce(async (prev, curr) => {
            await prev;
            curr._req = req;
            curr._oldDoc = curr.toObject();
            if (this.options.permanentDelete) {
                await curr.deleteOne();
            } else {
                curr.set(this.options.permanentDeleteField, true);
                await curr.save();
            }
            return Promise.resolve();
        }, Promise.resolve(null));
        res.status(200).json({ message: 'Documents deleted', count: documents.length });
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = SequelizeCrudder;
