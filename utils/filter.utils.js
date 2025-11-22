const parseMongoFilter = {
    IsString: function (val) {
        return val && val.constructor.name === 'String';
    },
    CreateRegexp: function (str) {
        if (str.charAt(0) === '/' &&
            str.charAt(str.length - 1) === '/') {
            var text = str.substr(1, str.length - 2).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            return new RegExp(text, 'i');
        } else {
            return str;
        }
    },
    IsArray: function (arg) {
        return arg && arg.constructor.name === 'Array';
    },
    IsObject: function (arg) {
        return arg && arg.constructor.name === 'Object';
    },
    ResolveArray: function (arr) {
        for (var x = 0; x < arr.length; x++) {
            if (this.IsObject(arr[x])) {
                arr[x] = this.FilterParse(arr[x]);
            } else if (this.IsArray(arr[x])) {
                arr[x] = this.ResolveArray(arr[x]);
            } else if (this.IsString(arr[x])) {
                arr[x] = this.CreateRegexp(arr[x]);
            }
        }
        return arr;
    },
    /*
     * Takes the filter field and parses it to a JSON object
     * @type {function}
     *  
     */
    FilterParse: function (filterParsed) {
        for (var key in filterParsed) {
            if (this.IsString(filterParsed[key])) {
                filterParsed[key] = this.CreateRegexp(filterParsed[key]);
            } else if (this.IsArray(filterParsed[key])) {
                filterParsed[key] = this.ResolveArray(filterParsed[key]);
            } else if (this.IsObject(filterParsed[key])) {
                filterParsed[key] = this.FilterParse(filterParsed[key]);
            }
        }
        return filterParsed;
    }
};

/**
 * Convert MongoDB filter to Sequelize filter format
 * Requires Sequelize Op object
 */
const parseSQLFilter = {
    /**
     * Check if a value is a regex pattern wrapped in forward slashes
     */
    isSlashPattern: function (value) {
        return typeof value === 'string' &&
            value.length >= 2 &&
            value.charAt(0) === '/' &&
            value.charAt(value.length - 1) === '/';
    },

    /**
     * Convert a slash pattern to Sequelize Op.like pattern
     */
    convertSlashPatternToLike: function (pattern) {
        const innerPattern = pattern.substring(1, pattern.length - 1);
        const startsWithCaret = innerPattern.charAt(0) === '^';
        const endsWithDollar = innerPattern.charAt(innerPattern.length - 1) === '$';

        let cleanPattern = innerPattern;
        if (startsWithCaret) cleanPattern = cleanPattern.substring(1);
        if (endsWithDollar) cleanPattern = cleanPattern.substring(0, cleanPattern.length - 1);

        let likePattern = cleanPattern;
        if (!startsWithCaret) likePattern = '%' + likePattern;
        if (!endsWithDollar) likePattern = likePattern + '%';

        return likePattern;
    },

    /**
     * Convert MongoDB operator to Sequelize Op
     */
    convertOperator: function (operator, value, Op) {
        const operatorMap = {
            '$eq': Op.eq,
            '$ne': Op.ne,
            '$gt': Op.gt,
            '$gte': Op.gte,
            '$lt': Op.lt,
            '$lte': Op.lte,
            '$in': Op.in,
            '$nin': Op.notIn,
            '$like': Op.like,
            '$notLike': Op.notLike,
            '$iLike': Op.iLike,
            '$notILike': Op.notILike,
            '$regexp': Op.regexp,
            '$notRegexp': Op.notRegexp,
            '$between': Op.between,
            '$notBetween': Op.notBetween,
            '$is': Op.is,
            '$not': Op.not
        };

        const seqOp = operatorMap[operator];
        if (!seqOp) {
            throw new Error(`Unsupported operator: ${operator}`);
        }

        // Handle $regex specially - convert to Op.like
        if (operator === '$regex') {
            let pattern;
            if (value instanceof RegExp) {
                pattern = value.source;
            } else if (typeof value === 'object' && value.$regex) {
                pattern = value.$regex instanceof RegExp ? value.$regex.source : value.$regex;
            } else {
                pattern = String(value);
            }

            const startsWithCaret = pattern.charAt(0) === '^';
            const endsWithDollar = pattern.charAt(pattern.length - 1) === '$';

            if (startsWithCaret) pattern = pattern.substring(1);
            if (endsWithDollar) pattern = pattern.substring(0, pattern.length - 1);

            let likePattern = pattern;
            if (!startsWithCaret) likePattern = '%' + likePattern;
            if (!endsWithDollar) likePattern = likePattern + '%';

            return { [Op.like]: likePattern };
        }

        // For $not, recursively convert the inner condition
        if (operator === '$not') {
            return { [Op.not]: this.convertValue(value, Op) };
        }

        return { [seqOp]: value };
    },

    /**
     * Convert a field value to Sequelize format
     */
    convertValue: function (value, Op) {
        // Handle null and undefined
        if (value === null || value === undefined) {
            return { [Op.eq]: value };
        }

        // Handle slash pattern
        if (this.isSlashPattern(value)) {
            const likePattern = this.convertSlashPatternToLike(value);
            return { [Op.like]: likePattern };
        }

        // Handle Date objects
        if (value instanceof Date) {
            return { [Op.eq]: value };
        }

        // Handle arrays (implicit $in)
        if (Array.isArray(value)) {
            return { [Op.in]: value };
        }

        // Handle operator objects
        if (value !== null && typeof value === 'object' && Object.keys(value).length > 0) {
            const firstKey = Object.keys(value)[0];

            // Check if this is a MongoDB operator
            if (firstKey.charAt(0) === '$') {
                const result = {};
                for (const operator in value) {
                    const converted = this.convertOperator(operator, value[operator], Op);
                    Object.assign(result, converted);
                }
                return result;
            }
        }

        // Simple value - implicit equality
        return { [Op.eq]: value };
    },

    /**
     * Main filter parsing function
     * Converts MongoDB filter to Sequelize filter
     */
    FilterParse: function (filter, Op) {
        if (!Op) {
            try {
                // Try to require Sequelize
                const { Op: SequelizeOp } = require('sequelize');
                Op = SequelizeOp;
            } catch (err) {
                throw new Error('Sequelize is required for SQL filter parsing. Please install sequelize or pass Op as second parameter.');
            }
        }

        if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
            return filter;
        }

        const result = {};

        for (const key in filter) {
            const value = filter[key];

            // Handle logical operators
            if (key === '$and') {
                if (!Array.isArray(value)) {
                    throw new Error('$and operator requires an array');
                }
                result[Op.and] = value.map(subFilter => this.FilterParse(subFilter, Op));
            } else if (key === '$or') {
                if (!Array.isArray(value)) {
                    throw new Error('$or operator requires an array');
                }
                result[Op.or] = value.map(subFilter => this.FilterParse(subFilter, Op));
            } else if (key === '$nor') {
                if (!Array.isArray(value)) {
                    throw new Error('$nor operator requires an array');
                }
                // $nor is NOT ($or(...))
                result[Op.not] = {
                    [Op.or]: value.map(subFilter => this.FilterParse(subFilter, Op))
                };
            } else {
                // Regular field
                result[key] = this.convertValue(value, Op);
            }
        }

        return result;
    }
}

module.exports = {
    parseMongoFilter: parseMongoFilter,
    parseSQLFilter: parseSQLFilter
};