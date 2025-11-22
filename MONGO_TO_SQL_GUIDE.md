# MongoDB to SQL Filter Converter - Usage Guide

## Overview

The `convertMongoFilterToSQL` utility converts MongoDB filter syntax (JSON) to SQL WHERE clauses with parameterized queries, helping users migrate from MongoDB to SQL databases.

## Installation

```javascript
const { convertMongoFilterToSQL } = require('omni-crudder');
```

## Basic Usage

```javascript
const filter = { age: 25, name: 'John' };
const result = convertMongoFilterToSQL(filter);

console.log(result.whereClause);  // "age = ? AND name = ?"
console.log(result.parameters);   // [25, 'John']

// Use with your SQL query
const sql = `SELECT * FROM users WHERE ${result.whereClause}`;
connection.query(sql, result.parameters);
```

## Supported Operators

### Comparison Operators

| MongoDB | SQL | Example Input | SQL Output |
|---------|-----|---------------|------------|
| `$eq` | `=` | `{age: {$eq: 25}}` | `age = ?` |
| `$ne` | `!=` | `{age: {$ne: 25}}` | `age != ?` |
| `$gt` | `>` | `{age: {$gt: 18}}` | `age > ?` |
| `$gte` | `>=` | `{age: {$gte: 18}}` | `age >= ?` |
| `$lt` | `<` | `{age: {$lt: 65}}` | `age < ?` |
| `$lte` | `<=` | `{age: {$lte: 65}}` | `age <= ?` |

### Array Operators

```javascript
// $in - matches any value in array
const filter1 = { status: { $in: ['active', 'pending'] } };
// Result: { whereClause: 'status IN (?, ?)', parameters: ['active', 'pending'] }

// $nin - doesn't match any value in array
const filter2 = { status: { $nin: ['deleted', 'archived'] } };
// Result: { whereClause: 'status NOT IN (?, ?)', parameters: ['deleted', 'archived'] }
```

### Pattern Matching

#### Forward Slash Syntax (Special Feature!)

```javascript
// Basic pattern - matches anywhere
const filter1 = { name: '/john/' };
// Result: { whereClause: 'name LIKE ?', parameters: ['%john%'] }

// Start anchor (^) - matches at beginning
const filter2 = { name: '/^John/' };
// Result: { whereClause: 'name LIKE ?', parameters: ['John%'] }

// End anchor ($) - matches at end
const filter3 = { name: '/Smith$/' };
// Result: { whereClause: 'name LIKE ?', parameters: ['%Smith'] }

// Both anchors - exact match
const filter4 = { name: '/^John Smith$/' };
// Result: { whereClause: 'name LIKE ?', parameters: ['John Smith'] }
```

#### Regex Operator

```javascript
const filter = { name: { $regex: /^John/ } };
// Result: { whereClause: 'name LIKE ?', parameters: ['John%'] }
```

### Logical Operators

```javascript
// $and - all conditions must match
const filter1 = {
    $and: [
        { age: { $gte: 18 } },
        { age: { $lt: 65 } }
    ]
};
// Result: { whereClause: '(age >= ? AND age < ?)', parameters: [18, 65] }

// $or - any condition must match
const filter2 = {
    $or: [
        { status: 'active' },
        { status: 'pending' }
    ]
};
// Result: { whereClause: '(status = ? OR status = ?)', parameters: ['active', 'pending'] }

// $not - negates a condition
const filter3 = { age: { $not: { $gt: 25 } } };
// Result: { whereClause: 'NOT (age > ?)', parameters: [25] }

// $nor - none of the conditions match
const filter4 = {
    $nor: [
        { status: 'deleted' },
        { status: 'archived' }
    ]
};
// Result: { whereClause: 'NOT (status = ? OR status = ?)', parameters: ['deleted', 'archived'] }
```

## Complex Examples

### Multiple Conditions on Same Field

```javascript
const filter = {
    age: {
        $gte: 18,
        $lt: 65
    }
};
// Result: { whereClause: '(age >= ? AND age < ?)', parameters: [18, 65] }
```

### Nested Logical Operators

```javascript
const filter = {
    $and: [
        { age: { $gte: 18 } },
        {
            $or: [
                { status: 'active' },
                { status: 'pending' }
            ]
        }
    ]
};
// Result: 
// {
//   whereClause: '(age >= ? AND (status = ? OR status = ?))',
//   parameters: [18, 'active', 'pending']
// }
```

### Combining Multiple Field Types

```javascript
const filter = {
    age: { $gte: 18 },
    name: '/john/',
    status: { $in: ['active', 'pending'] },
    email: { $ne: null }
};
// Result:
// {
//   whereClause: 'age >= ? AND name LIKE ? AND status IN (?, ?) AND email != ?',
//   parameters: [18, '%john%', 'active', 'pending', null]
// }
```

## SQL Injection Protection

The converter automatically uses parameterized queries (placeholder `?`) to prevent SQL injection:

```javascript
const userInput = "'; DROP TABLE users; --";
const filter = { name: userInput };
const result = convertMongoFilterToSQL(filter);

// Safe! Creates: name = ?
// Parameter: ["'; DROP TABLE users; --"]
```

## Integration with Different SQL Libraries

### MySQL / MySQL2

```javascript
const mysql = require('mysql2/promise');
const { convertMongoFilterToSQL } = require('omni-crudder');

const filter = { age: { $gte: 18 }, name: '/john/' };
const { whereClause, parameters } = convertMongoFilterToSQL(filter);

const sql = `SELECT * FROM users WHERE ${whereClause}`;
const [rows] = await connection.query(sql, parameters);
```

### PostgreSQL (pg)

```javascript
const { Pool } = require('pg');
const { convertMongoFilterToSQL } = require('omni-crudder');

const filter = { status: 'active' };
let { whereClause, parameters } = convertMongoFilterToSQL(filter);

// Convert ? to $1, $2, $3... for PostgreSQL
let index = 1;
whereClause = whereClause.replace(/\?/g, () => `$${index++}`);

const sql = `SELECT * FROM users WHERE ${whereClause}`;
const result = await pool.query(sql, parameters);
```

### SQLite (better-sqlite3)

```javascript
const Database = require('better-sqlite3');
const { convertMongoFilterToSQL } = require('omni-crudder');

const db = new Database('mydb.sqlite');
const filter = { age: { $gte: 18 } };
const { whereClause, parameters } = convertMongoFilterToSQL(filter);

const sql = `SELECT * FROM users WHERE ${whereClause}`;
const rows = db.prepare(sql).all(...parameters);
```

## Error Handling

```javascript
try {
    const filter = { age: { $in: 'not-an-array' } }; // Invalid!
    const result = convertMongoFilterToSQL(filter);
} catch (error) {
    console.error(error.message); // "$in operator requires an array value"
}
```

## Limitations

1. **Advanced regex features**: Only basic regex anchors (`^`, `$`) are supported
2. **$exists operator**: Not supported (SQL doesn't have direct equivalent)
3. **$type operator**: Not supported (type checking is different in SQL)
4. **Array field queries**: $elemMatch and array-specific operators not supported
5. **Aggregation operators**: Not supported (use SQL aggregate functions directly)

## Migration Tips

When migrating from MongoDB to SQL:

1. **Test your filters**: Run the converter on your existing MongoDB filters to see the SQL output
2. **Review LIKE patterns**: MongoDB regex and SQL LIKE have different capabilities
3. **Check NULL handling**: SQL handles NULL differently than MongoDB's undefined
4. **Consider indexes**: Create SQL indexes on fields you frequently filter by

## Complete Example: Migration Helper

```javascript
const { convertMongoFilterToSQL } = require('omni-crudder');

function findDocuments(filter, options = {}) {
    const { whereClause, parameters } = convertMongoFilterToSQL(filter);
    
    let sql = 'SELECT * FROM users';
    
    if (whereClause) {
        sql += ` WHERE ${whereClause}`;
    }
    
    if (options.sort) {
        // Convert MongoDB sort to SQL ORDER BY
        const orderClauses = Object.entries(options.sort)
            .map(([field, direction]) => `${field} ${direction === 1 ? 'ASC' : 'DESC'}`);
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
    }
    
    if (options.skip) {
        sql += ` OFFSET ${options.skip}`;
    }
    
    return connection.query(sql, parameters);
}

// Usage similar to MongoDB
const results = await findDocuments(
    { age: { $gte: 18 }, name: '/john/' },
    { sort: { age: -1 }, limit: 10 }
);
```
