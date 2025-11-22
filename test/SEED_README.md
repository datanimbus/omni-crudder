# Database Seeding Guide

## Overview

Seed files populate test databases with consistent data before running CRUD API tests.

## Seed Files

| File | Database | Records | Purpose |
|------|----------|---------|---------|
| `seed.mongodb.js` | MongoDB | 10 users | Populate test data for MongoDB |
| `seed.mysql.js` | MySQL | 10 users | Populate test data for MySQL |
| `seed.postgresql.js` | PostgreSQL | 10 users | Populate test data for PostgreSQL |

## Seed Data Structure

All seed files create 10 users with the following structure:

```javascript
{
    id: Number (auto-generated for SQL),
    _id: String (MongoDB only),
    name: String,
    email: String (unique),
    age: Number,
    status: 'active' | 'pending' | 'inactive',
    role: 'admin' | 'user' | 'moderator',
    metadata: {
        city: String,
        department: String,
        tags: Array<String>
    }
}
```

### Sample Users

| ID | Name | Age | Status | Role | City | Department |
|----|------|-----|--------|------|------|------------|
| 1 | John Doe | 30 | active | admin | NYC | Engineering |
| 2 | Jane Smith | 25 | active | user | LA | Marketing |
| 3 | Bob Johnson | 35 | pending | moderator | NYC | Engineering |
| 4 | Alice Brown | 28 | active | user | Chicago | Sales |
| 5 | Charlie Wilson | 42 | active | admin | NYC | Operations |
| 6 | Diana Martinez | 31 | inactive | user | LA | HR |
| 7 | Eve Anderson | 27 | active | moderator | Chicago | Support |
| 8 | Frank Thomas | 38 | active | user | NYC | Engineering |
| 9 | Grace Lee | 29 | pending | user | LA | Marketing |
| 10 | Henry Davis | 45 | active | admin | Chicago | Operations |

### Distribution

- **Status**: 7 active, 2 pending, 1 inactive
- **Role**: 3 admins, 5 users, 2 moderators
- **City**: 4 NYC, 3 LA, 3 Chicago
- **Age Range**: 25-45 years

## Running Seed Files

### Prerequisites

Ensure databases are running and accessible (see main test README for setup).

### Seed Individual Databases

```bash
# MongoDB
node test/seed.mongodb.js

# MySQL
node test/seed.mysql.js

# PostgreSQL
node test/seed.postgresql.js
```

### Seed All Databases

```bash
# Seed all at once
node test/seed.mongodb.js && \
node test/seed.mysql.js && \
node test/seed.postgresql.js
```

## Expected Output

```
🌱 Starting MongoDB seed...

✅ Connected to MongoDB
🧹 Cleared existing data
✅ Inserted 10 users

📊 Seed Summary:
   Total Users: 10
   Active: 7
   Pending: 2
   Inactive: 1
   Admins: 3
   Users: 5
   Moderators: 2

🎉 MongoDB seeding complete!
```

## Using Seeded Data in Tests

After seeding, tests should work with existing data instead of creating new records:

```javascript
// Before (creating data)
async function testCreate() {
    await crudder.create(req, res);
}

// After (using seeded data)
async function testFind() {
    // Query existing seeded users
    req.query.filter = JSON.stringify({ status: 'active' });
    await crudder.find(req, res);
    // Should return 7 active users
}
```

## Workflow

### Complete Test Workflow

```bash
# 1. Seed the database
node test/seed.mongodb.js

# 2. Run tests on seeded data
node test/mongodb.crud.test.js
```

```bash
The tests can also seed automatically in their setup phase if needed.
```

## Configuration

### Update Connection Settings

If your database uses different credentials:

**MongoDB** (`test/seed.mongodb.js`):
```javascript
await mongoose.connect('mongodb://localhost:27017/omnicrudder_test', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
```

**MySQL** (`test/seed.mysql.js`):
```javascript
const sequelize = new Sequelize('omnicrudder_test', 'root', 'your_password', {
    host: 'localhost',
    dialect: 'mysql'
});
```

**PostgreSQL** (`test/seed.postgresql.js`):
```javascript
const sequelize = new Sequelize('omnicrudder_test', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres'
});
```

## Adding Custom Seed Data

To add more users or modify seed data, edit the `seedUsers` array in each file:

```javascript
const seedUsers = [
    {
        name: 'New User',
        email: 'newuser@example.com',
        age: 33,
        status: 'active',
        role: 'user',
        metadata: { city: 'Boston', department: 'Finance', tags: ['new'] }
    },
    // ... more users
];
```

## Re-seeding

Seed files automatically clear existing data before inserting:

```javascript
// MongoDB
await User.deleteMany({});

// MySQL/PostgreSQL
await sequelize.sync({ force: true });  // Drops and recreates table
```

This ensures a clean, consistent state for each test run.

## NPM Scripts

Add to `package.json` for convenience:

```json
{
  "scripts": {
    "seed:mongodb": "node test/seed.mongodb.js",
    "seed:mysql": "node test/seed.mysql.js",
    "seed:postgresql": "node test/seed.postgresql.js",
    "seed:all": "npm run seed:mongodb && npm run seed:mysql && npm run seed:postgresql",
    "test:mongodb": "npm run seed:mongodb && node test/mongodb.crud.test.js",
    "test:mysql": "npm run seed:mysql && node test/mysql.crud.test.js",
    "test:postgresql": "npm run seed:postgresql && node test/postgresql.crud.test.js"
  }
}
```

Then run:
```bash
npm run seed:all     # Seed all databases
npm run test:mongodb # Seed and test MongoDB
```

## Troubleshooting

### Duplicate Key Error
```
Error: E11000 duplicate key error
```
**Solution**: Seed files clear data first, but ensure no other process is using the database.

### Connection Refused
```
Error: connect ECONNREFUSED
```
**Solution**: Ensure the database server is running on the correct port.

### Permission Denied
```
Error: permission denied for table users
```
**Solution**: Check database user has INSERT privileges.

## Benefits

✅ **Consistent Data** - Same data across all test runs  
✅ **Faster Tests** - No need to create data in each test  
✅ **Better Coverage** - Test with realistic, varied data  
✅ **Reproducible** - Same results every time  
✅ **Easy Reset** - Re-run seed to restore clean state
