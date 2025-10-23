const {
  createTestTable,
  insertIntoTestTable,
  createTestRelatedTable,
  insertIntoTestRelatedTable,
} = require('.');

const setup = () => {
  console.log('Test suite started');
  console.log('Creating test table...');
  createTestTable();
  createTestRelatedTable();
  console.log('Inserting a row into test table...');
  insertIntoTestTable();
  insertIntoTestRelatedTable();
};

module.exports = setup;
