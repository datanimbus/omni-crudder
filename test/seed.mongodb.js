/**
 * MongoDB Seed File
 * 
 * Populates MongoDB with test data for CRUD API testing
 * 
 * Run: node test/seed.mongodb.js
 */

const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    _id: String,
    name: String,
    email: String,
    age: Number,
    status: String,
    role: String,
    metadata: mongoose.Schema.Types.Mixed,
    _metadata: {
        deleted: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });

let User;

// Seed Data
const seedUsers = [
    {
        _id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        status: 'active',
        role: 'admin',
        metadata: { city: 'NYC', department: 'Engineering', tags: ['senior', 'verified'] }
    },
    {
        _id: 'user2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
        status: 'active',
        role: 'user',
        metadata: { city: 'LA', department: 'Marketing', tags: ['new'] }
    },
    {
        _id: 'user3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        age: 35,
        status: 'pending',
        role: 'moderator',
        metadata: { city: 'NYC', department: 'Engineering', tags: ['experienced'] }
    },
    {
        _id: 'user4',
        name: 'Alice Brown',
        email: 'alice@example.com',
        age: 28,
        status: 'active',
        role: 'user',
        metadata: { city: 'Chicago', department: 'Sales', tags: ['verified'] }
    },
    {
        _id: 'user5',
        name: 'Charlie Wilson',
        email: 'charlie@example.com',
        age: 42,
        status: 'active',
        role: 'admin',
        metadata: { city: 'NYC', department: 'Operations', tags: ['senior', 'verified'] }
    },
    {
        _id: 'user6',
        name: 'Diana Martinez',
        email: 'diana@example.com',
        age: 31,
        status: 'inactive',
        role: 'user',
        metadata: { city: 'LA', department: 'HR', tags: ['verified'] }
    },
    {
        _id: 'user7',
        name: 'Eve Anderson',
        email: 'eve@example.com',
        age: 27,
        status: 'active',
        role: 'moderator',
        metadata: { city: 'Chicago', department: 'Support', tags: ['new'] }
    },
    {
        _id: 'user8',
        name: 'Frank Thomas',
        email: 'frank@example.com',
        age: 38,
        status: 'active',
        role: 'user',
        metadata: { city: 'NYC', department: 'Engineering', tags: ['experienced', 'verified'] }
    },
    {
        _id: 'user9',
        name: 'Grace Lee',
        email: 'grace@example.com',
        age: 29,
        status: 'pending',
        role: 'user',
        metadata: { city: 'LA', department: 'Marketing', tags: ['new'] }
    },
    {
        _id: 'user10',
        name: 'Henry Davis',
        email: 'henry@example.com',
        age: 45,
        status: 'active',
        role: 'admin',
        metadata: { city: 'Chicago', department: 'Operations', tags: ['senior', 'verified'] }
    }
];

async function seed() {
    try {
        console.log('🌱 Starting MongoDB seed...\n');

        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/omnicrudder_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Get or create model
        User = mongoose.models.User || mongoose.model('User', userSchema);

        // Clear existing data
        await User.deleteMany({});
        console.log('🧹 Cleared existing data');

        // Insert seed data
        const inserted = await User.insertMany(seedUsers);
        console.log(`✅ Inserted ${inserted.length} users`);

        // Display summary
        console.log('\n📊 Seed Summary:');
        console.log(`   Total Users: ${inserted.length}`);
        console.log(`   Active: ${inserted.filter(u => u.status === 'active').length}`);
        console.log(`   Pending: ${inserted.filter(u => u.status === 'pending').length}`);
        console.log(`   Inactive: ${inserted.filter(u => u.status === 'inactive').length}`);
        console.log(`   Admins: ${inserted.filter(u => u.role === 'admin').length}`);
        console.log(`   Users: ${inserted.filter(u => u.role === 'user').length}`);
        console.log(`   Moderators: ${inserted.filter(u => u.role === 'moderator').length}`);

        console.log('\n🎉 MongoDB seeding complete!\n');

    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

seed();
