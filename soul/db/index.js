const BS3Database = require('better-sqlite3');

const config = require('../config/index');

class Database {
  constructor(filename, options) {
    this.db = new BS3Database(filename, { verbose: console.log, ...options });
  }

  get() {
    return this.db;
  }
}

console.log(config.db);

module.exports = new Database(config.db.filename).get();
