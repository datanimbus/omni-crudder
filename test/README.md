# CRUD API Testing Guide

## Overview

Comprehensive test suite for omni-crudder library covering all CRUD operations across MongoDB, MySQL, and PostgreSQL.

## Test Files

| Test File | Database | Test Count | Features Tested |
|-----------|----------|------------|-----------------|
| `mongodb.crud.test.js` | MongoDB | 11 | All CRUD ops, JSON fields, defaultLimit |
| `mysql.crud.test.js` | MySQL | 11 | All CRUD ops, JSON columns, defaultLimit |
| `postgresql.crud.test.js` | PostgreSQL | 12 | All CRUD ops, JSONB columns, defaultLimit |

## Prerequisites

### 1. Install Dependencies

```bash
# For MongoDB tests
npm install mongoose

# For MySQL tests
npm install sequelize mysql2

# For PostgreSQL tests  
npm install sequelize pg pg-hstore
```

### 2. Database Setup

#### MongoDB
```bash
# Start MongoDB (if not running)
mongod

# MongoDB will auto-create the test database
```

#### MySQL
```bash
# Start MySQL server
# Then create test database:
mysql -u root -p
CREATE DATABASE omnicrudder_test;
exit;
```

#### PostgreSQL
```bash
# Start PostgreSQL server
# Then create test database:
psql -U postgres
CREATE DATABASE omnicrudder_test;
\q
```

### 3. Update Connection Settings

Edit the connection settings in each test file if your setup differs:

**MongoDB** (`test/mongodb.crud.test.js`):
```javascript
await mongoose.connect('mongodb://localhost:27017/omnicrudder_test', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
```

**MySQL** (`test/mysql.crud.test.js`):
```javascript
const sequelize = new Sequelize('omnicrudder_test', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql'
});
```

**PostgreSQL** (`test/postgresql.crud.test.js`):
```javascript
const sequelize = new Sequelize('omnicrudder_test', 'postgres', 'password', {
    host: 'localhost',
    dialect: 'postgres'
});
```

## Running Tests

### Run Individual Database Tests

```bash
# MongoDB tests
node test/mongodb.crud.test.js

# MySQL tests
node test/mysql.crud.test.js

# PostgreSQL tests
node test/postgresql.crud.test.js
```

### Run All Tests

```bash
# Run all database tests sequentially
node test/mongodb.crud.test.js && \
node test/mysql.crud.test.js && \
node test/postgresql.crud.test.js
```

## Test Coverage

Each test suite covers:

### Core CRUD Operations
- ✅ `create()` - Single document creation
- ✅ `create()` - Bulk document creation
- ✅ `count()` - Count with filters
- ✅ `find()` - Find with filters and sorting
- ✅ `findById()` - Find single document by ID
- ✅ `updateById()` - Update by ID
- ✅ `updateByFilter()` - Batch update
- ✅ `deleteById()` - Delete by ID
- ✅ `bulkShowByIds()` - Batch retrieve
- ✅ `bulkUpdateByIds()` - Batch update by IDs (PostgreSQL)
- ✅ `bulkDeleteByIds()` - Batch delete by IDs (PostgreSQL)

### Feature Tests
- ✅ **JSON Field Filtering** - Query nested JSON/JSONB data
- ✅ **defaultLimit Option** - Test default pagination
- ✅ **Pagination** - offset/limit functionality
- ✅ **Sorting** - Order by fields
- ✅ **Field Selection** - Select specific fields

## Expected Output

Successful test run example:

```
=== MongoDB CRUD API Tests ===

🔧 Setting up MongoDB connection...
✅ MongoDB connected and ready

📝 Test: create()
  ✅ Created user successfully
📝 Test: create() - bulk
  ✅ Bulk create successful
📝 Test: count()
  ✅ Count returned correct value: 3
📝 Test: find() with filter
  ✅ Find returned correct results
📝 Test: find() with defaultLimit
  ✅ Default limit working (returned all 4 records, limit is 10)
📝 Test: findById()
  ✅ FindById successful
📝 Test: updateById()
  ✅ UpdateById successful
📝 Test: updateByFilter()
  ✅ UpdateByFilter successful, updated 2 records
📝 Test: bulkShowByIds()
  ✅ BulkShowByIds successful
📝 Test: JSON field filtering
  ✅ JSON field filtering works
📝 Test: deleteById() - soft delete
  ✅ DeleteById successful

==================================================
✅ Tests Passed: 11/11
❌ Tests Failed: 0/11
==================================================

🧹 Cleanup complete
```

## Test Data Structure

All tests use a consistent User model:

```javascript
{
    id: Number/String,           // Auto-generated or specified
    name: String,                 // User name
    email: String,                // Unique email
    age: Number,                  // User age
    status: String,               // 'active', 'pending', etc.
    metadata: JSON/JSONB {        // Nested JSON data
        city: String,
        role: String,
        tags: Array (PostgreSQL)
    }
}
```

## Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running on port 27017

### MySQL Connection Failed
```
Error: Access denied for user 'root'@'localhost'
```
**Solution**: 
1. Check username/password in `test/mysql.crud.test.js`
2. Ensure database `omnicrudder_test` exists

### PostgreSQL Connection Failed
```
Error: password authentication failed for user "postgres"
```
**Solution**:
1. Check username/password in `test/postgresql.crud.test.js`
2. Ensure database `omnicrudder_test` exists

### Sequelize Module Not Found
```
Error: Cannot find module 'sequelize'
```
**Solution**: Install dependencies
```bash
npm install sequelize mysql2 pg pg-hstore
```

## Advanced Testing

### Test with Custom Options

Modify crudder initialization in test files:

```javascript
crudder = new MongooseCrudder(User, {
    idField: '_id',
    defaultLimit: 50,              // Change default limit
    permanentDelete: true,         // Enable hard delete
    permanentDeleteField: 'deleted' // Custom soft delete field
});
```

### Test with Real Express Server

The test files use mock req/res objects. To test with real Express:

```javascript
const express = require('express');
const app = express();

app.get('/users', crudder.find.bind(crudder));
app.post('/users', crudder.create.bind(crudder));
// ... etc

app.listen(3000, () => console.log('Server running on port 3000'));
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: CRUD Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5
        ports:
          - 27017:27017
      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: omnicrudder_test
        ports:
          - 3306:3306
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: omnicrudder_test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: node test/mongodb.crud.test.js
      - run: node test/mysql.crud.test.js
      - run: node test/postgresql.crud.test.js
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Include both positive and negative test cases
4. Update this README with new test coverage
5. Ensure all databases pass the new tests

## License

Same as omni-crudder library (MIT)
