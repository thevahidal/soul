module.exports = (db) => {
  return {
    checkTableExists(tableName) {
      const query = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`;
      const result = db.prepare(query).get();
      return result;
    },

    getTableNames() {
      const query = `SELECT name FROM sqlite_master WHERE type='table'`;
      const result = db.prepare(query).all();
      return result;
    },

    createTable(tableName, columns) {
      const columnDefinitions = columns.join(', ');
      const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefinitions});`;
      db.exec(query);
    }
  };
};
