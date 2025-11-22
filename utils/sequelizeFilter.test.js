/**
 * Test for parseSQLFilter - Sequelize format conversion
 * This test uses a mock Op object since we don't want to require actual Sequelize
 */

// Mock Sequelize Op object
const Op = {
    eq: Symbol.for('eq'),
    ne: Symbol.for('ne'),
    gt: Symbol.for('gt'),
    gte: Symbol.for('gte'),
    lt: Symbol.for('lt'),
    lte: Symbol.for('lte'),
    in: Symbol.for('in'),
    notIn: Symbol.for('notIn'),
    like: Symbol.for('like'),
    notLike: Symbol.for('notLike'),
    iLike: Symbol.for('iLike'),
    notILike: Symbol.for('notILike'),
    regexp: Symbol.for('regexp'),
    notRegexp: Symbol.for('notRegexp'),
    between: Symbol.for('between'),
    notBetween: Symbol.for('notBetween'),
    is: Symbol.for('is'),
    not: Symbol.for('not'),
    and: Symbol.for('and'),
    or: Symbol.for('or')
};

const { parseSQLFilter } = require('./filter.utils');

console.log('=== Sequelize Filter Conversion Tests ===\n');

// Helper to display results
function displayResult(testName, input, output) {
    console.log(`${testName}:`);
    console.log('Input:', JSON.stringify(input));
    console.log('Output:', JSON.stringify(output, (key, value) => {
        // Convert symbols to readable strings
        if (typeof value === 'symbol') {
            return `Op.${value.toString().replace('Symbol(', '').replace(')', '')}`;
        }
        return value;
    }, 2));
    console.log('');
}

// Test 1: Simple equality
const test1 = { age: 25 };
const result1 = parseSQLFilter.FilterParse(test1, Op);
displayResult('Test 1: Simple equality', test1, result1);

// Test 2: Forward slash pattern
const test2 = { name: '/john/' };
const result2 = parseSQLFilter.FilterParse(test2, Op);
displayResult('Test 2: Forward slash pattern', test2, result2);

// Test 3: Pattern with anchor
const test3 = { name: '/^John/' };
const result3 = parseSQLFilter.FilterParse(test3, Op);
displayResult('Test 3: Pattern with start anchor', test3, result3);

// Test 4: Comparison operators
const test4 = { age: { $gte: 18, $lt: 65 } };
const result4 = parseSQLFilter.FilterParse(test4, Op);
displayResult('Test 4: Comparison operators', test4, result4);

// Test 5: $in operator
const test5 = { status: { $in: ['active', 'pending'] } };
const result5 = parseSQLFilter.FilterParse(test5, Op);
displayResult('Test 5: $in operator', test5, result5);

// Test 6: $and logical operator
const test6 = {
    $and: [
        { age: { $gte: 18 } },
        { name: '/john/' }
    ]
};
const result6 = parseSQLFilter.FilterParse(test6, Op);
displayResult('Test 6: $and logical operator', test6, result6);

// Test 7: $or logical operator
const test7 = {
    $or: [
        { status: 'active' },
        { status: 'pending' }
    ]
};
const result7 = parseSQLFilter.FilterParse(test7, Op);
displayResult('Test 7: $or logical operator', test7, result7);

// Test 8: Complex nested
const test8 = {
    age: { $gte: 18 },
    name: '/john/',
    $or: [
        { status: 'active' },
        { role: { $in: ['admin', 'moderator'] } }
    ]
};
const result8 = parseSQLFilter.FilterParse(test8, Op);
displayResult('Test 8: Complex nested condition', test8, result8);

// Test 9: Array as value (implicit $in)
const test9 = { status: ['active', 'pending'] };
const result9 = parseSQLFilter.FilterParse(test9, Op);
displayResult('Test 9: Array value (implicit $in)', test9, result9);

// Test 10: Null value
const test10 = { deletedAt: null };
const result10 = parseSQLFilter.FilterParse(test10, Op);
displayResult('Test 10: Null value', test10, result10);

console.log('=== Real Sequelize Example ===\n');
console.log('If you have Sequelize installed, you can use it like this:\n');
console.log('const { Op } = require(\'sequelize\');');
console.log('const { parseSQLFilter } = require(\'omni-crudder\');\n');
console.log('const mongoFilter = { age: { $gte: 18 }, name: \'/john/\' };');
console.log('const sequelizeFilter = parseSQLFilter.FilterParse(mongoFilter, Op);\n');
console.log('// Use with Sequelize');
console.log('await User.findAll({ where: sequelizeFilter });');

console.log('\n=== All tests complete ===');
