const { createTestTable, insertIntoTestTable } = require('.');

const setup = () => {
  console.log('Test suite started');
  console.log('Creating test table...');
  createTestTable();
  console.log('Inserting a row into test table...');
  insertIntoTestTable();
};

module.exports = setup;
