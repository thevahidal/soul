const { apiConstants } = require('../constants');

module.exports = (db) => {
  return {
    get(data) {
      const query = `SELECT ${data.schemaString || '*'} FROM ${
        data.tableName
      } ${data.extendString || ''} ${data.whereString || ''} ${
        data.orderString || ''
      } LIMIT ? OFFSET ?`;

      const statement = db.prepare(query);
      const result = statement.all(
        ...data.whereStringValues,
        data.limit || apiConstants.DEFAULT_PAGE_LIMIT,
        data.page || apiConstants.DEFAULT_PAGE_INDEX,
      );

      return result;
    },

    getById(data) {
      const pks = data.pks.split(',');
      const placeholders = pks.map(() => '?').join(',');
      const query = `SELECT ${data.schemaString} FROM ${data.tableName} ${data.extendString} WHERE ${data.tableName}.${data.lookupField} in (${placeholders})`;
      const statement = db.prepare(query);
      const result = statement.all(...pks);
      return result;
    },

    getCount(data) {
      const query = `SELECT COUNT(*) as total FROM ${data.tableName} ${data.whereString}`;
      const statement = db.prepare(query);
      const result = statement.get(...data.whereStringValues).total;
      return result;
    },

    save(data) {
      // wrap text values in quotes
      const fieldsString = Object.keys(data.fields)
        .map((field) => `'${field}'`)
        .join(', ');

      // wrap text values in quotes
      const valuesString = Object.values(data.fields).map((value) => value);
      const placeholders = Object.values(data.fields)
        .map(() => '?')
        .join(',');

      let values = `(${fieldsString}) VALUES (${placeholders})`;
      if (valuesString === '') {
        values = 'DEFAULT VALUES';
      }

      const query = `INSERT INTO ${data.tableName} ${values}`;
      const statement = db.prepare(query);
      const result = statement.run(...valuesString);
      return result;
    },

    bulkWrite(data) {
      const { tableName, fields } = data;
      const fieldNames = Object.keys(fields[0]);
      const valueSets = fields.map((row) => Object.values(row));

      const placeholders = fieldNames.map(() => '?');
      const valuesString = valueSets
        .map(() => `(${placeholders.join(',')})`)
        .join(',');

      const query = `INSERT INTO ${tableName} (${fieldNames
        .map((field) => `'${field}'`)
        .join(', ')}) VALUES ${valuesString}`;

      const statement = db.prepare(query);
      const result = statement.run(...valueSets.flat());
      return result;
    },

    update(data) {
      const pks = data.pks.split(',');
      const placeholders = pks.map(() => '?').join(',');
      const query = `UPDATE ${data.tableName} SET ${data.fieldsString} WHERE ${data.lookupField} in (${placeholders})`;
      const statement = db.prepare(query);
      const result = statement.run(...pks);
      return result;
    },

    delete(data) {
      const pks = data.pks.split(',');
      const placeholders = pks.map(() => '?').join(',');
      const query = `DELETE FROM ${data.tableName} WHERE ${data.lookupField} in (${placeholders})`;
      const statement = db.prepare(query);
      const result = statement.run(...pks);
      return result;
    },

    getForeignKeyInfo(tableName, field) {
      const foreignKey = db
        .prepare(`PRAGMA foreign_key_list(${tableName})`)
        .all()
        .find((fk) => fk.from === field);

      if (!foreignKey) {
        throw new Error(`Foreign key not found for field '${field}'`);
      }

      const joinedTableName = foreignKey.table;
      const joinedTableFields = db
        .prepare(`PRAGMA table_info(${joinedTableName})`)
        .all();

      return { foreignKey, joinedTableName, joinedTableFields };
    },
  };
};
