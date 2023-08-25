const BS3Database = require('better-sqlite3');

const config = require('../config/index');

class Database {
  constructor(filename, options) {
    this.db = new BS3Database(filename, {
      verbose: this.getVerbose(),
      ...options,
    });
  }

  getVerbose() {
    if (config.verbose === 'console') {
      return console.log;
    } else if (config.verbose === null) {
      return null;
    }
  }

  get() {
    return this.db;
  }
}

module.exports = new Database(config.db.filename).get();
