# defaultLimit Option Enhancement

## Overview

Added `defaultLimit` option support to both Mongoose and Sequelize CRUD implementations.

## Usage

When creating a crudder instance, you can now specify a `defaultLimit`:

```javascript
const MongooseCrudder = require('omni-crudder');

const crudder = new MongooseCrudder(UserModel, {
    defaultLimit: 50  // Default to 50 records if no limit specified
});
```

## Behavior

The pagination logic now follows this priority:

1. **If `params.limit` is provided**: Use the requested limit
2. **If `params.limit` is NOT provided**: Use `options.defaultLimit` if set
3. **If neither is provided**: Return all records (no limit)

## Examples

### Example 1: Using Default Limit

```javascript
const crudder = new MongooseCrudder(UserModel, {
    defaultLimit: 100
});

// Request without limit parameter
// GET /users
// Result: Returns max 100 records (uses defaultLimit)
```

### Example 2: Override Default with Request Limit

```javascript
const crudder = new MongooseCrudder(UserModel, {
    defaultLimit: 100
});

// Request with limit parameter
// GET /users?limit=25
// Result: Returns max 25 records (request overrides default)
```

### Example 3: Request All Records

```javascript
const crudder = new MongooseCrudder(UserModel, {
    defaultLimit: 100
});

// Request with limit=-1 (all records)
// GET /users?limit=-1
// Result: Returns all records (ignores default)
```

### Example 4: No Default Set

```javascript
const crudder = new MongooseCrudder(UserModel, {
    // No defaultLimit specified
});

// Request without limit parameter
// GET /users
// Result: Returns all records (no limit applied)
```

## Implementation Details

### Mongoose (mongoose.crud.js)

```javascript
// Apply limit logic
let limit = params.limit;
if (limit === undefined || limit === null) {
    limit = this.options.defaultLimit || -1;
}

if (limit !== -1) {
    query.skip(params.skip || 0).limit(limit);
}
```

### Sequelize (sequelize.crud.js)

```javascript
// Apply limit logic
let limit = params.limit;
if (limit === undefined || limit === null) {
    limit = this.options.defaultLimit || -1;
}

if (limit && limit !== -1) {
    options.offset = params.skip || 0;
    options.limit = limit;
}
```

## Benefits

1. **Performance Protection**: Prevents accidentally returning huge datasets
2. **Consistent API**: Provides default pagination across all endpoints
3. **Flexibility**: Can still override or request all records when needed
4. **Backward Compatible**: Existing code without defaultLimit works as before
