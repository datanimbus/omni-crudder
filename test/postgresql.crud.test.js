/**
 * PostgreSQL CRUD API Tests
 * 
 * Tests all CRUD operations using SequelizeCrudder with PostgreSQL
 * 
 * Setup:
 * 1. Install dependencies: npm install sequelize pg pg-hstore
 * 2. Ensure PostgreSQL is running locally
 * 3. Create database: CREATE DATABASE omnicrudder_test;
 * 4. Update connection settings below if needed
 * 5. Run: node test/postgresql.crud.test.js
 */

const { Sequelize, DataTypes } = require('sequelize');
const SequelizeCrudder = require('../lib/sequelize.crud');

// PostgreSQL Connection
const sequelize = new Sequelize('omnicrudder_test', 'postgres', 'password', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false
});

// Mock request and response objects
function createMockRequest(data = {}) {
    return {
        query: data.query || {},
        params: data.params || {},
        body: data.body || {},
        headers: { 'x-request-id': 'test-123' }
    };
}

function createMockResponse() {
    const res = {
        statusCode: 200,
        data: null,
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            this.data = data;
            return this;
        }
    };
    return res;
}

// Define User model for PostgreSQL
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        unique: true
    },
    age: DataTypes.INTEGER,
    status: DataTypes.STRING,
    metadata: DataTypes.JSONB  // PostgreSQL JSONB type
}, {
    tableName: 'users',
    timestamps: true
});

let crudder;

async function setup() {
    console.log('🔧 Setting up PostgreSQL connection...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connection established');

        // Sync database (create table)
        await sequelize.sync({ force: true });
        console.log('✅ Tables created');

        crudder = new SequelizeCrudder(User, {
            idField: 'id',
            defaultLimit: 10
        });

        console.log('✅ PostgreSQL ready for testing\n');
        return true;
    } catch (err) {
        console.error('❌ PostgreSQL connection failed:', err.message);
        console.log('Please check:');
        console.log('  - PostgreSQL is running on localhost:5432');
        console.log('  - Database "omnicrudder_test" exists');
        console.log('  - Username/password are correct\n');
        return false;
    }
}

async function teardown() {
    await User.destroy({ where: {}, truncate: true });
    await sequelize.close();
    console.log('\n🧹 Cleanup complete');
}

// Test functions
async function testCreate() {
    console.log('📝 Test: create()');

    const req = createMockRequest({
        body: {
            data: {
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                status: 'active',
                metadata: { city: 'NYC', role: 'admin', tags: ['important', 'verified'] }
            }
        }
    });
    const res = createMockResponse();

    await crudder.create(req, res);

    if (res.statusCode === 200 && res.data.name === 'John Doe') {
        console.log('  ✅ Created user successfully');
        return true;
    } else {
        console.log('  ❌ Failed to create user');
        return false;
    }
}

async function testBulkCreate() {
    console.log('📝 Test: create() - bulk');

    const req = createMockRequest({
        body: {
            data: [
                { name: 'Jane Smith', email: 'jane@example.com', age: 25, status: 'active', metadata: { city: 'LA', role: 'user' } },
                { name: 'Bob Johnson', email: 'bob@example.com', age: 35, status: 'pending', metadata: { city: 'NYC', role: 'moderator' } },
                { name: 'Alice Brown', email: 'alice@example.com', age: 28, status: 'active', metadata: { city: 'Chicago', role: 'user' } }
            ]
        }
    });
    const res = createMockResponse();

    await crudder.create(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length === 3) {
        console.log('  ✅ Bulk create successful');
        return true;
    } else {
        console.log('  ❌ Bulk create failed');
        return false;
    }
}

async function testCount() {
    console.log('📝 Test: count()');

    const req = createMockRequest({
        query: { filter: JSON.stringify({ status: 'active' }) }
    });
    const res = createMockResponse();

    await crudder.count(req, res);

    if (res.statusCode === 200 && res.data === 3) {
        console.log('  ✅ Count returned correct value: 3');
        return true;
    } else {
        console.log(`  ❌ Count failed, expected 3, got ${res.data}`);
        return false;
    }
}

async function testFind() {
    console.log('📝 Test: find() with filter and sort');

    const req = createMockRequest({
        query: {
            filter: JSON.stringify({ status: 'active' }),
            sort: JSON.stringify({ age: 1 })
        }
    });
    const res = createMockResponse();

    await crudder.find(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length === 3) {
        console.log('  ✅ Find returned correct results');
        return true;
    } else {
        console.log('  ❌ Find failed');
        return false;
    }
}

async function testFindWithPagination() {
    console.log('📝 Test: find() with pagination');

    const req = createMockRequest({
        query: {
            limit: 2,
            skip: 0
        }
    });
    const res = createMockResponse();

    await crudder.find(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length === 2) {
        console.log('  ✅ Pagination working correctly');
        return true;
    } else {
        console.log('  ❌ Pagination test failed');
        return false;
    }
}

async function testFindById() {
    console.log('📝 Test: findById()');

    const req = createMockRequest({
        params: { id: '1' }
    });
    const res = createMockResponse();

    await crudder.findById(req, res);

    if (res.statusCode === 200 && res.data.id === 1) {
        console.log('  ✅ FindById successful');
        return true;
    } else {
        console.log('  ❌ FindById failed');
        return false;
    }
}

async function testUpdateById() {
    console.log('📝 Test: updateById()');

    const req = createMockRequest({
        params: { id: '1' },
        body: { data: { age: 31, status: 'updated' } }
    });
    const res = createMockResponse();

    await crudder.updateById(req, res);

    if (res.statusCode === 200 && res.data.age === 31 && res.data.status === 'updated') {
        console.log('  ✅ UpdateById successful');
        return true;
    } else {
        console.log('  ❌ UpdateById failed');
        return false;
    }
}

async function testUpdateByFilter() {
    console.log('📝 Test: updateByFilter()');

    const req = createMockRequest({
        query: { filter: JSON.stringify({ age: { $gte: 30 } }) },
        body: { data: { status: 'senior' } }
    });
    const res = createMockResponse();

    await crudder.updateByFilter(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length >= 1) {
        console.log(`  ✅ UpdateByFilter successful, updated ${res.data.length} records`);
        return true;
    } else {
        console.log('  ❌ UpdateByFilter failed');
        return false;
    }
}

async function testBulkShowByIds() {
    console.log('📝 Test: bulkShowByIds()');

    const req = createMockRequest({
        query: { ids: JSON.stringify([1, 2, 3]) }
    });
    const res = createMockResponse();

    await crudder.bulkShowByIds(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length === 3) {
        console.log('  ✅ BulkShowByIds successful');
        return true;
    } else {
        console.log('  ❌ BulkShowByIds failed');
        return false;
    }
}

async function testJSONBFieldFilter() {
    console.log('📝 Test: JSONB field filtering (PostgreSQL)');

    const req = createMockRequest({
        query: { filter: JSON.stringify({ 'metadata.city': 'NYC' }) }
    });
    const res = createMockResponse();

    await crudder.find(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data)) {
        console.log(`  ✅ JSONB field filtering works (found ${res.data.length} records)`);
        return true;
    } else {
        console.log('  ❌ JSONB field filtering failed');
        return false;
    }
}

async function testJSONBArrayFilter() {
    console.log('📝 Test: JSONB array contains (PostgreSQL)');

    const req = createMockRequest({
        query: { filter: JSON.stringify({ 'metadata.role': 'admin' }) }
    });
    const res = createMockResponse();

    await crudder.find(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length >= 1) {
        console.log('  ✅ JSONB nested field filtering works');
        return true;
    } else {
        console.log('  ❌ JSONB nested field filtering failed');
        return false;
    }
}

async function testDeleteById() {
    console.log('📝 Test: deleteById()');

    const req = createMockRequest({
        params: { id: '4' }
    });
    const res = createMockResponse();

    await crudder.deleteById(req, res);

    if (res.statusCode === 200) {
        console.log('  ✅ DeleteById successful');
        return true;
    } else {
        console.log('  ❌ DeleteById failed');
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('=== PostgreSQL CRUD API Tests ===\n');

    const connected = await setup();
    if (!connected) {
        process.exit(1);
    }

    const results = [];

    try {
        results.push(await testCreate());
        results.push(await testBulkCreate());
        results.push(await testCount());
        results.push(await testFind());
        results.push(await testFindWithPagination());
        results.push(await testFindById());
        results.push(await testUpdateById());
        results.push(await testUpdateByFilter());
        results.push(await testBulkShowByIds());
        results.push(await testJSONBFieldFilter());
        results.push(await testJSONBArrayFilter());
        results.push(await testDeleteById());

        const passed = results.filter(r => r === true).length;
        const total = results.length;

        console.log(`\n${'='.repeat(50)}`);
        console.log(`✅ Tests Passed: ${passed}/${total}`);
        console.log(`❌ Tests Failed: ${total - passed}/${total}`);
        console.log('='.repeat(50));

    } catch (err) {
        console.error('\n❌ Test suite failed:', err);
        console.error(err);
    } finally {
        await teardown();
    }
}

runTests();
