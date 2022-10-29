const { dropTestDatabase } = require('.');

const globalTearDown = () => {
  console.log('Test suite finished');
  console.log('Dropping test database...');
  dropTestDatabase();
};

module.exports = globalTearDown;
