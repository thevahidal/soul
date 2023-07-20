const fs = require('fs');
const { unlink } = require('fs/promises');

const db = require('../db/index');
const { testNames } = require('./testData');

const dropTestTable = (table = 'users') => {
  db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
};

const dropTestDatabase = async (path = 'test.db') => {
  // delete test database file e.g. test.db
  try {
    await unlink(path), console.log(`successfully deleted ${path}`);
  } catch (error) {
    console.error('there was an error:', error);
  }

  if (fs.existsSync(path + '-wal')) {
    try {
      await Promise.allSettled(unlink(path + '-wal'), unlink(path + '-shm'));
    } catch (error) {
      console.error('there was an error:', error);
    }
  }
};

const createTestTable = (table = 'users') => {
  db.prepare(
    `CREATE TABLE ${table} (id INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT)`
  ).run();
};

const insertIntoTestTable = (table = 'users') => {
  const statement = db.prepare(
    `INSERT INTO ${table} (firstName, lastName) VALUES (?, ?)`
  );

  for (const user of testNames) {
    statement.run(user.firstName, user.lastName);
  }
};

module.exports = {
  dropTestTable,
  dropTestDatabase,
  createTestTable,
  insertIntoTestTable,
};
