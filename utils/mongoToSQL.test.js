/**
 * Test examples for MongoDB to SQL Filter Converter
 * Run with: node utils/mongoToSQL.test.js
 */

const { convertMongoFilterToSQL } = require('./mongoToSQL.utils');

console.log('=== MongoDB to SQL Filter Converter Tests ===\n');

// Test 1: Simple equality
console.log('Test 1: Simple equality');
const test1 = { age: 25 };
const result1 = convertMongoFilterToSQL(test1);
console.log('Input:', JSON.stringify(test1));
console.log('Output:', result1);
console.log('Expected: age = ? with parameters [25]\n');

// Test 2: Forward slash pattern
console.log('Test 2: Forward slash pattern ("/joh/")');
const test2 = { name: '/joh/' };
const result2 = convertMongoFilterToSQL(test2);
console.log('Input:', JSON.stringify(test2));
console.log('Output:', result2);
console.log('Expected: name LIKE ? with parameters ["%joh%"]\n');

// Test 3: Forward slash pattern with anchors
console.log('Test 3: Forward slash pattern with anchors ("/^John/")');
const test3 = { name: '/^John/' };
const result3 = convertMongoFilterToSQL(test3);
console.log('Input:', JSON.stringify(test3));
console.log('Output:', result3);
console.log('Expected: name LIKE ? with parameters ["John%"]\n');

// Test 4: Multiple fields
console.log('Test 4: Multiple fields');
const test4 = { age: 25, name: '/john/' };
const result4 = convertMongoFilterToSQL(test4);
console.log('Input:', JSON.stringify(test4));
console.log('Output:', result4);
console.log('Expected: age = ? AND name LIKE ? with parameters [25, "%john%"]\n');

// Test 5: Comparison operators
console.log('Test 5: Comparison operators');
const test5 = { age: { $gte: 18, $lt: 65 } };
const result5 = convertMongoFilterToSQL(test5);
console.log('Input:', JSON.stringify(test5));
console.log('Output:', result5);
console.log('Expected: (age >= ? AND age < ?) with parameters [18, 65]\n');

// Test 6: $in operator
console.log('Test 6: $in operator');
const test6 = { status: { $in: ['active', 'pending'] } };
const result6 = convertMongoFilterToSQL(test6);
console.log('Input:', JSON.stringify(test6));
console.log('Output:', result6);
console.log('Expected: status IN (?, ?) with parameters ["active", "pending"]\n');

// Test 7: $and logical operator
console.log('Test 7: $and logical operator');
const test7 = {
    $and: [
        { age: { $gte: 18 } },
        { name: '/john/' }
    ]
};
const result7 = convertMongoFilterToSQL(test7);
console.log('Input:', JSON.stringify(test7));
console.log('Output:', result7);
console.log('Expected: ((age >= ?) AND (name LIKE ?)) with parameters [18, "%john%"]\n');

// Test 8: $or logical operator
console.log('Test 8: $or logical operator');
const test8 = {
    $or: [
        { age: { $lt: 18 } },
        { age: { $gt: 65 } }
    ]
};
const result8 = convertMongoFilterToSQL(test8);
console.log('Input:', JSON.stringify(test8));
console.log('Output:', result8);
console.log('Expected: ((age < ?) OR (age > ?)) with parameters [18, 65]\n');

// Test 9: Complex nested condition
console.log('Test 9: Complex nested condition');
const test9 = {
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
const result9 = convertMongoFilterToSQL(test9);
console.log('Input:', JSON.stringify(test9));
console.log('Output:', result9);
console.log('Expected: ((age >= ?) AND ((status = ?) OR (status = ?))) with parameters [18, "active", "pending"]\n');

// Test 10: $not operator
console.log('Test 10: $not operator');
const test10 = { age: { $not: { $gt: 25 } } };
const result10 = convertMongoFilterToSQL(test10);
console.log('Input:', JSON.stringify(test10));
console.log('Output:', result10);
console.log('Expected: NOT (age > ?) with parameters [25]\n');

// Test 11: Empty filter
console.log('Test 11: Empty filter');
const test11 = {};
const result11 = convertMongoFilterToSQL(test11);
console.log('Input:', JSON.stringify(test11));
console.log('Output:', result11);
console.log('Expected: empty whereClause and empty parameters\n');

console.log('=== All tests complete ===');
