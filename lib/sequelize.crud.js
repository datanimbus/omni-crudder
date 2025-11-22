'use strict';

const _ = require('lodash');
const { parseParams } = require('../utils/param.utils');
const { parseSQLFilter } = require('../utils/filter.utils');

/**
 * Sequelize Database Adapter
 * @classdesc Adapter for SQL database operations using Sequelize
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
        this.options.idField = 'id';
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

/**
 * Count documents matching filter
 */
SequelizeCrudder.prototype.count = async function (req, res) {
    try {
        const { Op } = require('sequelize');
        let params = parseParams(req);
        let filter = parseSQLFilter.FilterParse(params.filter, Op);

        let count = await this.model.count({ where: filter });
        res.status(200).json(count);
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Find documents with filtering, sorting, and pagination
 */
SequelizeCrudder.prototype.find = async function (req, res) {
    try {
        const { Op } = require('sequelize');
        let params = parseParams(req);
        let filter = parseSQLFilter.FilterParse(params.filter, Op);

        const options = { where: filter };

        // Attributes (field selection)
        if (params.select && params.select.length > 0) {
            options.attributes = params.select;
        }

        // Order (sorting)
        if (params.sort) {
            options.order = Object.entries(params.sort).map(([field, dir]) => {
                // Handle both numeric (1/-1) and string ('asc'/'desc') formats
                const direction = (dir === 1 || dir === 'asc' || dir === 'ASC') ? 'ASC' : 'DESC';
                return [field, direction];
            });
        }

        // Pagination: use params.limit if provided, otherwise use defaultLimit from options, or no limit
        let limit = params.limit;
        if (limit === undefined || limit === null) {
            limit = this.options.defaultLimit || -1;
        }

        if (limit && limit !== -1) {
            options.offset = params.skip || 0;
            options.limit = limit;
        }

        let docs = await this.model.findAll(options);

        if (!params.metadata) {
            res.status(200).json(docs);
            return;
        }

        // Get total and matched counts for metadata
        const totalCount = await this.model.count();
        const matched = await this.model.count({ where: filter });

        res.status(200).json({
            _metadata: {
                page: Math.floor((params.skip || 0) / (params.limit || 1)) + 1,
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

/**
 * Find a single document by ID
 */
SequelizeCrudder.prototype.findById = async function (req, res) {
    try {
        let params = parseParams(req);

        const options = {};

        // Attributes (field selection)
        if (params.select && params.select.length > 0) {
            options.attributes = params.select;
        }

        // Use findByPk if ID field is the primary key, otherwise use findOne
        let doc;
        if (this.options.idField === 'id') {
            doc = await this.model.findByPk(params.id, options);
        } else {
            options.where = { [this.options.idField]: params.id };
            doc = await this.model.findOne(options);
        }

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

/**
 * Create one or more documents
 */
SequelizeCrudder.prototype.create = async function (req, res) {
    try {
        let params = parseParams(req);
        let data = params.data;
        let upsert = params.upsert;
        let documents = Array.isArray(data) ? data : [data];
        let results = [];

        for (const curr of documents) {
            try {
                let result;

                if (upsert && curr[this.options.idField]) {
                    // Upsert: update if exists, create if not
                    const [instance, created] = await this.model.upsert(curr, {
                        returning: true
                    });
                    result = instance;
                } else {
                    // Regular create
                    result = await this.model.create(curr);
                }

                results.push({ status: 200, data: result });
            } catch (err) {
                results.push({ status: 400, error: err });
            }
        }

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

/**
 * Update a document by ID
 */
SequelizeCrudder.prototype.updateById = async function (req, res) {
    try {
        let params = parseParams(req);
        let id = params.id;
        let data = params.data;
        let upsert = params.upsert;

        const where = { [this.options.idField]: id };
        let document = await this.model.findOne({ where });

        if (!document && !upsert) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        if (document) {
            const oldData = document.toJSON();
            const updatedData = _.mergeWith({}, oldData, data, this._customizer);

            if (_.isEqual(oldData, updatedData)) {
                res.status(200).json(document);
                return;
            }

            await document.update(data);
            res.status(200).json(document);
        } else {
            // Upsert: create new document
            data[this.options.idField] = id;
            const newDocument = await this.model.create(data);
            res.status(200).json(newDocument);
        }
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Update documents matching filter
 */
SequelizeCrudder.prototype.updateByFilter = async function (req, res) {
    try {
        const { Op } = require('sequelize');
        let params = parseParams(req);
        let filter = parseSQLFilter.FilterParse(params.filter, Op);
        let data = params.data;
        let upsert = params.upsert;

        let documents = await this.model.findAll({ where: filter });
        const results = [];

        for (const curr of documents) {
            try {
                const oldData = curr.toJSON();
                const updatedData = _.mergeWith({}, oldData, data, this._customizer);

                if (_.isEqual(oldData, updatedData)) {
                    results.push({ status: 200, data: curr });
                    continue;
                }

                await curr.update(data);
                results.push({ status: 200, data: curr });
            } catch (err) {
                results.push({ status: 400, error: err });
            }
        }

        // Handle upsert if no documents found
        if (documents.length === 0 && upsert) {
            try {
                const newDocument = await this.model.create(data);
                results.push({ status: 200, data: newDocument });
            } catch (err) {
                results.push({ status: 400, error: err });
            }
        }

        let errorCount = results.filter(result => result.status !== 200).length;
        let successCount = results.filter(result => result.status === 200).length;
        let successData = results.filter(result => result.status === 200).map(result => result.data);
        let errorData = results.filter(result => result.status !== 200).map(result => result.error);

        if (errorCount === successCount) {
            res.status(400).json(errorData);
        } else if (errorCount > 0 && errorCount !== successCount) {
            res.status(207).json(successData);
        } else {
            res.status(200).json(successData);
        }
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Delete a document by ID
 */
SequelizeCrudder.prototype.deleteById = async function (req, res) {
    try {
        let params = parseParams(req);
        let id = params.id;

        const where = { [this.options.idField]: id };
        let document = await this.model.findOne({ where });

        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        if (this.options.permanentDelete) {
            await document.destroy();
        } else {
            // Soft delete: set deleted flag
            const deleteField = this.options.permanentDeleteField;
            await document.update({ [deleteField]: true });
        }

        res.status(200).json({ message: 'Document deleted' });
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Delete documents matching filter
 */
SequelizeCrudder.prototype.deleteByFilter = async function (req, res) {
    try {
        const { Op } = require('sequelize');
        let params = parseParams(req);
        let filter = parseSQLFilter.FilterParse(params.filter, Op);

        let documents = await this.model.findAll({ where: filter });

        for (const curr of documents) {
            if (this.options.permanentDelete) {
                await curr.destroy();
            } else {
                // Soft delete: set deleted flag
                const deleteField = this.options.permanentDeleteField;
                await curr.update({ [deleteField]: true });
            }
        }

        res.status(200).json({ message: 'Documents deleted', count: documents.length });
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Bulk show documents by IDs
 */
SequelizeCrudder.prototype.bulkShowByIds = async function (req, res) {
    try {
        const { Op } = require('sequelize');
        let params = parseParams(req);
        let ids = params.ids;
        let select = params.select;
        let sort = params.sort;

        const options = {
            where: {
                [this.options.idField]: { [Op.in]: ids }
            }
        };

        // Attributes (field selection)
        if (select && select.length > 0) {
            options.attributes = select;
        }

        // Order (sorting)
        if (sort) {
            options.order = Object.entries(sort).map(([field, dir]) => {
                const direction = (dir === 1 || dir === 'asc' || dir === 'ASC') ? 'ASC' : 'DESC';
                return [field, direction];
            });
        }

        const docs = await this.model.findAll(options);
        res.status(200).json(docs);
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Bulk update documents by IDs
 */
SequelizeCrudder.prototype.bulkUpdateByIds = async function (req, res) {
    try {
        const { Op } = require('sequelize');
        let params = parseParams(req);
        let ids = params.ids;
        let data = params.data;
        let upsert = params.upsert;

        const where = {
            [this.options.idField]: { [Op.in]: ids }
        };

        let documents = await this.model.findAll({ where });
        const results = [];

        for (const curr of documents) {
            try {
                const oldData = curr.toJSON();
                const updatedData = _.mergeWith({}, oldData, data, this._customizer);

                if (_.isEqual(oldData, updatedData)) {
                    results.push({ status: 200, data: curr });
                    continue;
                }

                await curr.update(data);
                results.push({ status: 200, data: curr });
            } catch (err) {
                results.push({ status: 400, error: err });
            }
        }

        // Handle upsert if needed
        if (documents.length < ids.length && upsert) {
            const existingIds = documents.map(doc => doc[this.options.idField]);
            const missingIds = ids.filter(id => !existingIds.includes(id));

            for (const id of missingIds) {
                try {
                    const newData = { ...data, [this.options.idField]: id };
                    const newDocument = await this.model.create(newData);
                    results.push({ status: 200, data: newDocument });
                } catch (err) {
                    results.push({ status: 400, error: err });
                }
            }
        }

        let errorCount = results.filter(result => result.status !== 200).length;
        let successCount = results.filter(result => result.status === 200).length;
        let successData = results.filter(result => result.status === 200).map(result => result.data);
        let errorData = results.filter(result => result.status !== 200).map(result => result.error);

        if (errorCount === successCount) {
            res.status(400).json(errorData);
        } else if (errorCount > 0 && errorCount !== successCount) {
            res.status(207).json(successData);
        } else {
            res.status(200).json(successData);
        }
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Bulk delete documents by IDs
 */
SequelizeCrudder.prototype.bulkDeleteByIds = async function (req, res) {
    try {
        const { Op } = require('sequelize');
        let params = parseParams(req);
        let ids = params.ids;

        const where = {
            [this.options.idField]: { [Op.in]: ids }
        };

        let documents = await this.model.findAll({ where });

        for (const curr of documents) {
            if (this.options.permanentDelete) {
                await curr.destroy();
            } else {
                // Soft delete: set deleted flag
                const deleteField = this.options.permanentDeleteField;
                await curr.update({ [deleteField]: true });
            }
        }

        res.status(200).json({ message: 'Documents deleted', count: documents.length });
    } catch (err) {
        this._logError(req, err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = SequelizeCrudder;
