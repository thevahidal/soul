const Database = require('better-sqlite3');

const db = new Database('foobar.db', { verbose: console.log });

module.exports = db;
