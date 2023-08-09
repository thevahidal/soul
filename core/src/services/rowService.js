module.exports = (db) => {
  return {
    get(data) {
      const query = `SELECT ${data.schemaString} FROM ${data.tableName} ${data.extendString} ${data.whereString} ${data.orderString} LIMIT ? OFFSET ?`;
      const statement = db.prepare(query);
      const result = statement.all(
        ...data.whereStringValues,
        data.limit,
        data.page
      );
      return result;
    },

    getCount(data) {
      const query = `SELECT COUNT(*) as total FROM ${data.tableName} ${data.whereString}`;
      const statement = db.prepare(query);
      const result = statement.get(...data.whereStringValues).total;
      return result;
    },

    save() {},
    update() {},
  };
};
