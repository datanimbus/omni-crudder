/**
 * MySQL Seed File
 * 
 * Populates MySQL with test data for CRUD API testing
 * 
 * Run: node test/seed.mysql.js
 */

const { Sequelize, DataTypes } = require('sequelize');

// MySQL Connection
const sequelize = new Sequelize('omnicrudder_test', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

// User Model
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
    role: DataTypes.STRING,
    metadata: DataTypes.JSON
}, {
    tableName: 'users',
    timestamps: true
});

// Seed Data
const seedUsers = [
    {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        status: 'active',
        role: 'admin',
        metadata: { city: 'NYC', department: 'Engineering', tags: ['senior', 'verified'] }
    },
    {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
        status: 'active',
        role: 'user',
        metadata: { city: 'LA', department: 'Marketing', tags: ['new'] }
    },
    {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        age: 35,
        status: 'pending',
        role: 'moderator',
        metadata: { city: 'NYC', department: 'Engineering', tags: ['experienced'] }
    },
    {
        name: 'Alice Brown',
        email: 'alice@example.com',
        age: 28,
        status: 'active',
        role: 'user',
        metadata: { city: 'Chicago', department: 'Sales', tags: ['verified'] }
    },
    {
        name: 'Charlie Wilson',
        email: 'charlie@example.com',
        age: 42,
        status: 'active',
        role: 'admin',
        metadata: { city: 'NYC', department: 'Operations', tags: ['senior', 'verified'] }
    },
    {
        name: 'Diana Martinez',
        email: 'diana@example.com',
        age: 31,
        status: 'inactive',
        role: 'user',
        metadata: { city: 'LA', department: 'HR', tags: ['verified'] }
    },
    {
        name: 'Eve Anderson',
        email: 'eve@example.com',
        age: 27,
        status: 'active',
        role: 'moderator',
        metadata: { city: 'Chicago', department: 'Support', tags: ['new'] }
    },
    {
        name: 'Frank Thomas',
        email: 'frank@example.com',
        age: 38,
        status: 'active',
        role: 'user',
        metadata: { city: 'NYC', department: 'Engineering', tags: ['experienced', 'verified'] }
    },
    {
        name: 'Grace Lee',
        email: 'grace@example.com',
        age: 29,
        status: 'pending',
        role: 'user',
        metadata: { city: 'LA', department: 'Marketing', tags: ['new'] }
    },
    {
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
        console.log('🌱 Starting MySQL seed...\n');

        // Connect and authenticate
        await sequelize.authenticate();
        console.log('✅ Connected to MySQL');

        // Sync database (create table)
        await sequelize.sync({ force: true });
        console.log('✅ Table created/reset');

        // Insert seed data
        const inserted = await User.bulkCreate(seedUsers);
        console.log(`✅ Inserted ${inserted.length} users`);

        // Display summary
        const counts = await Promise.all([
            User.count({ where: { status: 'active' } }),
            User.count({ where: { status: 'pending' } }),
            User.count({ where: { status: 'inactive' } }),
            User.count({ where: { role: 'admin' } }),
            User.count({ where: { role: 'user' } }),
            User.count({ where: { role: 'moderator' } })
        ]);

        console.log('\n📊 Seed Summary:');
        console.log(`   Total Users: ${inserted.length}`);
        console.log(`   Active: ${counts[0]}`);
        console.log(`   Pending: ${counts[1]}`);
        console.log(`   Inactive: ${counts[2]}`);
        console.log(`   Admins: ${counts[3]}`);
        console.log(`   Users: ${counts[4]}`);
        console.log(`   Moderators: ${counts[5]}`);

        console.log('\n🎉 MySQL seeding complete!\n');

    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

seed();
