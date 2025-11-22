# Sequelize Filter Conversion - Usage Guide

## Overview

The `parseSQLFilter` utility in `filter.utils.js` now converts MongoDB filter syntax to Sequelize `Op` (operator) format, enabling seamless migration from MongoDB to SQL databases using Sequelize ORM.

## Basic Usage

```javascript
const { Op } = require('sequelize');
const { parseSQLFilter } = require('omni-crudder');

// MongoDB-style filter
const mongoFilter = {
    age: { $gte: 18 },
    name: '/john/',
    status: { $in: ['active', 'pending'] }
};

// Convert to Sequelize format
const sequelizeFilter = parseSQLFilter.FilterParse(mongoFilter, Op);

// Use with Sequelize models
await User.findAll({
    where: sequelizeFilter
});
```

## MongoDB to Sequelize Operator Mapping

| MongoDB Operator | Sequelize Op | Example Input | Sequelize Output |
|-----------------|--------------|---------------|------------------|
| `$eq` or implicit | `Op.eq` | `{age: 25}` | `{age: {[Op.eq]: 25}}` |
| `$ne` | `Op.ne` | `{age: {$ne: 25}}` | `{age: {[Op.ne]: 25}}` |
| `$gt` | `Op.gt` | `{age: {$gt: 18}}` | `{age: {[Op.gt]: 18}}` |
| `$gte` | `Op.gte` | `{age: {$gte: 18}}` | `{age: {[Op.gte]: 18}}` |
| `$lt` | `Op.lt` | `{age: {$lt: 65}}` | `{age: {[Op.lt]: 65}}` |
| `$lte` | `Op.lte` | `{age: {$lte: 65}}` | `{age: {[Op.lte]: 65}}` |
| `$in` | `Op.in` | `{status: {$in: ['active']}}` | `{status: {[Op.in]: ['active']}}` |
| `$nin` | `Op.notIn` | `{status: {$nin: ['deleted']}}` | `{status: {[Op.notIn]: ['deleted']}}` |
| `$and` | `Op.and` | `{$and: [{...}, {...}]}` | `{[Op.and]: [{...}, {...}]}` |
| `$or` | `Op.or` | `{$or: [{...}, {...}]}` | `{[Op.or]: [{...}, {...}]}` |
| `$not` | `Op.not` | `{age: {$not: {$gt: 25}}}` | `{age: {[Op.not]: {[Op.gt]: 25}}}` |
| `$regex` or `/pattern/` | `Op.like` | `{name: '/john/'}` | `{name: {[Op.like]: '%john%'}}` |

## Pattern Matching

### Forward Slash Syntax

```javascript
// Anywhere match
{ name: '/john/' }  
// → {name: {[Op.like]: '%john%'}}

// Start anchor
{ name: '/^John/' }  
// → {name: {[Op.like]: 'John%'}}

// End anchor
{ name: '/Smith$/' }  
// → {name: {[Op.like]: '%Smith'}}

// Exact match
{ name: '/^John Smith$/' }  
// → {name: {[Op.like]: 'John Smith'}}
```

### Regex Operator

```javascript
const filter = { name: { $regex: /^John/ } };
const result = parseSQLFilter.FilterParse(filter, Op);
// → {name: {[Op.like]: 'John%'}}
```

## Logical Operators

### $and

```javascript
const filter = {
    $and: [
        { age: { $gte: 18 } },
        { age: { $lt: 65 } }
    ]
};

const result = parseSQLFilter.FilterParse(filter, Op);
// → { [Op.and]: [{age: {[Op.gte]: 18}}, {age: {[Op.lt]: 65}}] }
```

### $or

```javascript
const filter = {
    $or: [
        { status: 'active' },
        { status: 'pending' }
    ]
};

const result = parseSQLFilter.FilterParse(filter, Op);
// → { [Op.or]: [{status: {[Op.eq]: 'active'}}, {status: {[Op.eq]: 'pending'}}] }
```

### $nor

```javascript
const filter = {
    $nor: [
        { status: 'deleted' },
        { status: 'archived' }
    ]
};

const result = parseSQLFilter.FilterParse(filter, Op);
// → { [Op.not]: { [Op.or]: [...] } }
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

const result = parseSQLFilter.FilterParse(filter, Op);
// → { age: { [Op.gte]: 18, [Op.lt]: 65 } }
```

### Nested Logical Operators

```javascript
const filter = {
    age: { $gte: 18 },
    $or: [
        { status: 'active' },
        { role: { $in: ['admin', 'moderator'] } }
    ]
};

const result = parseSQLFilter.FilterParse(filter, Op);
// → {
//     age: { [Op.gte]: 18 },
//     [Op.or]: [
//         { status: { [Op.eq]: 'active' } },
//         { role: { [Op.in]: ['admin', 'moderator'] } }
//     ]
// }
```

## Integration with CRUD Methods

The `sequelize.crud.js` file automatically uses `parseSQLFilter` for filter parsing:

```javascript
// In your Express route
app.get('/users', async (req, res) => {
    // MongoDB-style filter from query params
    req.query.filter = {
        age: { $gte: 18 },
        name: '/john/'
    };
    
    // SequelizeCrudder will automatically convert this
    const crudder = new SequelizeCrudder(UserModel);
    await crudder.find(req, res);
});
```

## Special Cases

### Null Values

```javascript
const filter = { deletedAt: null };
const result = parseSQLFilter.FilterParse(filter, Op);
// → { deletedAt: { [Op.eq]: null } }
```

### Array Values (Implicit $in)

```javascript
const filter = { status: ['active', 'pending'] };
const result = parseSQLFilter.FilterParse(filter, Op);
// → { status: { [Op.in]: ['active', 'pending'] } }
```

### Date Objects

```javascript
const filter = { createdAt: { $gte: new Date('2024-01-01') } };
const result = parseSQLFilter.FilterParse(filter, Op);
// → { createdAt: { [Op.gte]: Date(...) } }
```

## Error Handling

```javascript
try {
    // Invalid: $and requires array
    const filter = { $and: 'invalid' };
    const result = parseSQLFilter.FilterParse(filter, Op);
} catch (error) {
    console.error(error.message);
    // "$and operator requires an array"
}
```

## Without Passing Op Parameter

If you don't pass `Op`, the function will try to require Sequelize automatically:

```javascript
const { parseSQLFilter } = require('omni-crudder');

// Op is auto-loaded (requires sequelize to be installed)
const result = parseSQLFilter.FilterParse({ age: 25 });
```

## Migration from Old parseSQLFilter

> [!WARNING]
> **Breaking Change**: The old `parseSQLFilter` converted patterns to RegExp objects. The new version converts to Sequelize Op format.

**Old Behavior:**
```javascript
// Before
{ name: '/john/' }  →  { name: /john/i }
```

**New Behavior:**
```javascript
// After
{ name: '/john/' }  →  { name: { [Op.like]: '%john%' } }
```

**Migration Steps:**
1. Ensure you're passing the `Op` object to `FilterParse`
2. Update any code expecting RegExp objects
3. Test with actual Sequelize queries

## Complete Example

```javascript
const { Sequelize, Op, Model, DataTypes } = require('sequelize');
const { parseSQLFilter } = require('omni-crudder');

// Setup Sequelize
const sequelize = new Sequelize('sqlite::memory:');

// Define model
class User extends Model {}
User.init({
    name: DataTypes.STRING,
    age: DataTypes.INTEGER,
    status: DataTypes.STRING,
    role: DataTypes.STRING
}, { sequelize });

// MongoDB-style filter
const mongoFilter = {
    age: { $gte: 18, $lt: 65 },
    name: '/john/',
    $or: [
        { status: 'active' },
        { role: { $in: ['admin', 'moderator'] } }
    ]
};

// Convert and query
const sequelizeFilter = parseSQLFilter.FilterParse(mongoFilter, Op);

const users = await User.findAll({
    where: sequelizeFilter
});

// Generated SQL will be:
// SELECT * FROM users 
// WHERE age >= 18 AND age < 65 
// AND name LIKE '%john%' 
// AND (status = 'active' OR role IN ('admin', 'moderator'))
```
