'use strict';

/**
 * MongoDB to SQL Filter Converter
 * Converts MongoDB filter syntax to SQL WHERE clause with parameterized queries
 * 
 * @example
 * const result = convertMongoFilterToSQL({ age: 25, name: '/John/' });
 * // Returns: { whereClause: 'age = ? AND name LIKE ?', parameters: [25, '%John%'] }
 */

/**
 * Check if a value is a regex pattern wrapped in forward slashes
 * @param {*} value - The value to check
 * @returns {boolean} True if value is a string like "/pattern/"
 */
function isSlashPattern(value) {
    return typeof value === 'string' &&
        value.length >= 2 &&
        value.charAt(0) === '/' &&
        value.charAt(value.length - 1) === '/';
}

/**
 * Convert a slash pattern to SQL LIKE pattern
 * @param {string} pattern - Pattern like "/john/"
 * @returns {string} SQL LIKE pattern like "%john%"
 */
function convertSlashPatternToLike(pattern) {
    // Remove the leading and trailing slashes
    const innerPattern = pattern.substring(1, pattern.length - 1);

    // Check if pattern starts with ^
    const startsWithCaret = innerPattern.charAt(0) === '^';
    // Check if pattern ends with $
    const endsWithDollar = innerPattern.charAt(innerPattern.length - 1) === '$';

    // Remove ^ from start and $ from end
    let cleanPattern = innerPattern;
    if (startsWithCaret) cleanPattern = cleanPattern.substring(1);
    if (endsWithDollar) cleanPattern = cleanPattern.substring(0, cleanPattern.length - 1);

    // Build LIKE pattern
    let likePattern = cleanPattern;
    if (!startsWithCaret) likePattern = '%' + likePattern;
    if (!endsWithDollar) likePattern = likePattern + '%';

    return likePattern;
}

/**
 * Convert a MongoDB regex object or pattern to SQL LIKE
 * @param {*} regex - Can be RegExp object, string pattern, or object with $regex
 * @returns {string} SQL LIKE pattern
 */
function convertRegexToLike(regex) {
    let pattern;

    if (regex instanceof RegExp) {
        pattern = regex.source;
    } else if (typeof regex === 'object' && regex.$regex) {
        pattern = regex.$regex instanceof RegExp ? regex.$regex.source : regex.$regex;
    } else {
        pattern = String(regex);
    }

    // Handle common regex anchors
    const startsWithCaret = pattern.charAt(0) === '^';
    const endsWithDollar = pattern.charAt(pattern.length - 1) === '$';

    // Remove anchors
    if (startsWithCaret) pattern = pattern.substring(1);
    if (endsWithDollar) pattern = pattern.substring(0, pattern.length - 1);

    // Escape SQL LIKE special characters
    pattern = pattern.replace(/%/g, '\\%').replace(/_/g, '\\_');

    // Build LIKE pattern
    let likePattern = pattern;
    if (!startsWithCaret) likePattern = '%' + likePattern;
    if (!endsWithDollar) likePattern = likePattern + '%';

    return likePattern;
}

/**
 * Process a single MongoDB operator
 * @param {string} field - The field name
 * @param {string} operator - MongoDB operator (e.g., '$eq', '$gt')
 * @param {*} value - The value for the operator
 * @param {Array} parameters - Array to collect parameters
 * @returns {string} SQL condition fragment
 */
function processOperator(field, operator, value, parameters) {
    switch (operator) {
        case '$eq':
            parameters.push(value);
            return `${field} = ?`;

        case '$ne':
            parameters.push(value);
            return `${field} != ?`;

        case '$gt':
            parameters.push(value);
            return `${field} > ?`;

        case '$gte':
            parameters.push(value);
            return `${field} >= ?`;

        case '$lt':
            parameters.push(value);
            return `${field} < ?`;

        case '$lte':
            parameters.push(value);
            return `${field} <= ?`;

        case '$in':
            if (!Array.isArray(value)) {
                throw new Error('$in operator requires an array value');
            }
            const inPlaceholders = value.map(v => {
                parameters.push(v);
                return '?';
            }).join(', ');
            return `${field} IN (${inPlaceholders})`;

        case '$nin':
            if (!Array.isArray(value)) {
                throw new Error('$nin operator requires an array value');
            }
            const ninPlaceholders = value.map(v => {
                parameters.push(v);
                return '?';
            }).join(', ');
            return `${field} NOT IN (${ninPlaceholders})`;

        case '$regex':
            const likePattern = convertRegexToLike(value);
            parameters.push(likePattern);
            return `${field} LIKE ?`;

        case '$not':
            // $not wraps another condition
            const notCondition = processFieldValue(field, value, parameters);
            return `NOT (${notCondition})`;

        default:
            throw new Error(`Unsupported MongoDB operator: ${operator}`);
    }
}

/**
 * Process a field and its value/condition
 * @param {string} field - The field name
 * @param {*} value - The value or condition object
 * @param {Array} parameters - Array to collect parameters
 * @returns {string} SQL condition fragment
 */
function processFieldValue(field, value, parameters) {
    // Check if value is wrapped in slashes (like "/pattern/")
    if (isSlashPattern(value)) {
        const likePattern = convertSlashPatternToLike(value);
        parameters.push(likePattern);
        return `${field} LIKE ?`;
    }

    // If value is an object, it might contain operators
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const keys = Object.keys(value);

        // Check if this is an operator object
        if (keys.length > 0 && keys[0].charAt(0) === '$') {
            // Process each operator
            const conditions = keys.map(operator => {
                return processOperator(field, operator, value[operator], parameters);
            });

            // If multiple operators on same field, combine with AND
            return conditions.length > 1 ? `(${conditions.join(' AND ')})` : conditions[0];
        }
    }

    // Simple equality
    parameters.push(value);
    return `${field} = ?`;
}

/**
 * Convert MongoDB filter to SQL WHERE clause
 * @param {Object} filter - MongoDB filter object
 * @param {Array} parameters - Array to collect parameters (optional, used internally)
 * @returns {Object} Object with whereClause and parameters
 */
function convertMongoFilterToSQL(filter, parameters = []) {
    if (!filter || typeof filter !== 'object') {
        return { whereClause: '', parameters: [] };
    }

    const keys = Object.keys(filter);

    if (keys.length === 0) {
        return { whereClause: '', parameters: [] };
    }

    const conditions = [];

    for (const key of keys) {
        const value = filter[key];

        // Handle logical operators
        if (key === '$and') {
            if (!Array.isArray(value)) {
                throw new Error('$and operator requires an array');
            }
            const andConditions = value.map(subFilter => {
                const subResult = convertMongoFilterToSQL(subFilter, parameters);
                return subResult.whereClause;
            }).filter(c => c); // Remove empty conditions

            if (andConditions.length > 0) {
                conditions.push(`(${andConditions.join(' AND ')})`);
            }
        } else if (key === '$or') {
            if (!Array.isArray(value)) {
                throw new Error('$or operator requires an array');
            }
            const orConditions = value.map(subFilter => {
                const subResult = convertMongoFilterToSQL(subFilter, parameters);
                return subResult.whereClause;
            }).filter(c => c); // Remove empty conditions

            if (orConditions.length > 0) {
                conditions.push(`(${orConditions.join(' OR ')})`);
            }
        } else if (key === '$nor') {
            if (!Array.isArray(value)) {
                throw new Error('$nor operator requires an array');
            }
            const norConditions = value.map(subFilter => {
                const subResult = convertMongoFilterToSQL(subFilter, parameters);
                return subResult.whereClause;
            }).filter(c => c); // Remove empty conditions

            if (norConditions.length > 0) {
                conditions.push(`NOT (${norConditions.join(' OR ')})`);
            }
        } else {
            // Regular field
            const condition = processFieldValue(key, value, parameters);
            if (condition) {
                conditions.push(condition);
            }
        }
    }

    // Combine all conditions with AND
    const whereClause = conditions.length > 1
        ? conditions.join(' AND ')
        : conditions[0] || '';

    return {
        whereClause,
        parameters
    };
}

module.exports = {
    convertMongoFilterToSQL
};
