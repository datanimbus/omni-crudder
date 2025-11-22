/**
 * MongoDB CRUD API Tests
 * 
 * Tests all CRUD operations using MongooseCrudder
 * 
 * Setup:
 * 1. Install dependencies: npm install mongoose
 * 2. Ensure MongoDB is running locally on default port (27017)
 * 3. Run: node test/mongodb.crud.test.js
 */

const mongoose = require('mongoose');
const MongooseCrudder = require('../lib/mongoose.crud');

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

// Define User model
const userSchema = new mongoose.Schema({
    _id: String,
    name: String,
    email: String,
    age: Number,
    status: String,
    metadata: mongoose.Schema.Types.Mixed,
    _metadata: {
        deleted: { type: Boolean, default: false }
    }
}, { timestamps: true });

let User;
let crudder;

async function setup() {
    console.log('🔧 Setting up MongoDB connection...\n');

    try {
        await mongoose.connect('mongodb://localhost:27017/omnicrudder_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        User = mongoose.model('User', userSchema);
        crudder = new MongooseCrudder(User, {
            idField: '_id',
            defaultLimit: 10
        });

        // Clear existing data
        await User.deleteMany({});

        console.log('✅ MongoDB connected and ready\n');
        return true;
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.log('Please ensure MongoDB is running on localhost:27017\n');
        return false;
    }
}

async function teardown() {
    await User.deleteMany({});
    await mongoose.connection.close();
    console.log('\n🧹 Cleanup complete');
}

// Test functions
async function testCreate() {
    console.log('📝 Test: create()');

    const req = createMockRequest({
        body: {
            data: {
                _id: 'user1',
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                status: 'active',
                metadata: { city: 'NYC', role: 'admin' }
            }
        }
    });
    const res = createMockResponse();

    await crudder.create(req, res);

    if (res.statusCode === 200 && res.data._id === 'user1') {
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
                { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com', age: 25, status: 'active', metadata: { city: 'LA' } },
                { _id: 'user3', name: 'Bob Johnson', email: 'bob@example.com', age: 35, status: 'pending', metadata: { city: 'NYC' } },
                { _id: 'user4', name: 'Alice Brown', email: 'alice@example.com', age: 28, status: 'active', metadata: { city: 'Chicago' } }
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
    console.log('📝 Test: find() with filter');

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

async function testFindWithDefaultLimit() {
    console.log('📝 Test: find() with defaultLimit');

    const req = createMockRequest({ query: {} });
    const res = createMockResponse();

    await crudder.find(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length === 4) {
        console.log('  ✅ Default limit working (returned all 4 records, limit is 10)');
        return true;
    } else {
        console.log('  ❌ Default limit test failed');
        return false;
    }
}

async function testFindById() {
    console.log('📝 Test: findById()');

    const req = createMockRequest({
        params: { id: 'user1' }
    });
    const res = createMockResponse();

    await crudder.findById(req, res);

    if (res.statusCode === 200 && res.data._id === 'user1') {
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
        params: { id: 'user1' },
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

    if (res.statusCode === 200 && Array.isArray(res.data)) {
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
        query: { ids: JSON.stringify(['user1', 'user2', 'user3']) }
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

async function testDeleteById() {
    console.log('📝 Test: deleteById() - soft delete');

    const req = createMockRequest({
        params: { id: 'user4' }
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

async function testJSONFieldFilter() {
    console.log('📝 Test: JSON field filtering');

    const req = createMockRequest({
        query: { filter: JSON.stringify({ 'metadata.city': 'NYC' }) }
    });
    const res = createMockResponse();

    await crudder.find(req, res);

    if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length >= 1) {
        console.log('  ✅ JSON field filtering works');
        return true;
    } else {
        console.log('  ❌ JSON field filtering failed');
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('=== MongoDB CRUD API Tests ===\n');

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
        results.push(await testFindWithDefaultLimit());
        results.push(await testFindById());
        results.push(await testUpdateById());
        results.push(await testUpdateByFilter());
        results.push(await testBulkShowByIds());
        results.push(await testJSONFieldFilter());
        results.push(await testDeleteById());

        const passed = results.filter(r => r === true).length;
        const total = results.length;

        console.log(`\n${'='.repeat(50)}`);
        console.log(`✅ Tests Passed: ${passed}/${total}`);
        console.log(`❌ Tests Failed: ${total - passed}/${total}`);
        console.log('='.repeat(50));

    } catch (err) {
        console.error('\n❌ Test suite failed:', err);
    } finally {
        await teardown();
    }
}

runTests();
