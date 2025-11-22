const MongooseCrudder = require('./lib/mongoose.crud');
const SequaliseCrudder = require('./lib/sequalise.crud');

function OmniCrudder(dialect, model, options) {
    this.dialect = dialect;
    this.model = model;
    this.options = options;

    if (this.dialect === 'mongodb') {
        this.crudder = new MongooseCrudder(this.model, this.options);
    } else if (this.dialect !== 'mongodb') {
        this.crudder = new SequaliseCrudder(this.model, this.options);
    }

    return this.crudder;
}

/**
 * The OmniCrudder for basic CRUD functionality on multiple database types
 * @type {OmniCrudder}
 */
exports = module.exports = OmniCrudder;