module.exports = (db) => {
  return {
    createTable(tableName, schema, options = {}) {
      const {
        autoAddCreatedAt = true,
        autoAddUpdatedAt = true,
        multipleUniqueConstraints,
      } = options;

      let indices = [];

      let schemaString = schema
        .map(({ name, type, notNull, unique, primaryKey, foreignKey }) => {
          let column = `'${name}' '${type}'`;

          if (notNull) {
            column += ' NOT NULL';
          }
          if (unique) {
            column += ' UNIQUE';
          }
          if (primaryKey) {
            column += ' PRIMARY KEY';
          }
          if (foreignKey) {
            column += ` REFERENCES ${foreignKey.table}(${foreignKey.column})`;
          }
          if (foreignKey && foreignKey.onDelete) {
            column += ` ON DELETE ${foreignKey.onDelete}`;
          }
          if (foreignKey && foreignKey.onUpdate) {
            column += ` ON UPDATE ${foreignKey.onUpdate}`;
          }

          return column;
        })
        .join(', ');

      // add id if primary key is not defined
      if (!schema.find((field) => field.primaryKey)) {
        schemaString = `
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ${schemaString}
        `;
      }

      // add created at and updated at
      if (autoAddCreatedAt) {
        schemaString = `${schemaString}, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP`;
      }

      if (autoAddUpdatedAt) {
        schemaString = `${schemaString}, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP`;
      }

      if (multipleUniqueConstraints) {
        schemaString = `${schemaString}, CONSTRAINT ${
          multipleUniqueConstraints.name
        } UNIQUE (${multipleUniqueConstraints.fields
          .map((field) => field)
          .join(' ,')})`;
      }

      let indicesString = indices
        .map((field) => {
          return `
      CREATE INDEX ${tableName}_${field}_index
      ON ${tableName} (${field})
    `;
        })
        .join(';');

      const query = `CREATE TABLE ${tableName} (${schemaString})`;

      try {
        db.prepare(query).run();

        if (indicesString) {
          db.prepare(indicesString).run();
        }
      } catch (error) {
        console.log(error);
      }
    },

    listTables(options = {}) {
      const { search, ordering, exclude } = options;

      let query = `SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`;
      const queryValues = [];

      // if search is provided, search the tables
      // e.g. search=users
      if (search) {
        query += ` AND name LIKE ?`;
        queryValues.push(`%${search}%`);
      }

      // if exclude is passed don't return the some tables
      // e.g. exclude=['_users', '_roles']
      if (exclude && exclude.length > 0) {
        query += ` AND name NOT IN (${exclude.map(() => '?').join(', ')})`;
        queryValues.push(...exclude);
      }

      // if ordering is provided, order the tables
      // e.g. ordering=name (ascending) or ordering=-name (descending)
      // `name` is the only column this query returns, so it's the only
      // valid ordering target -- ORDER BY can't take a bound parameter for
      // a dynamic column/direction the way a value position can.
      if (ordering) {
        const isDesc = ordering.startsWith('-');
        query += ` ORDER BY name ${isDesc ? 'DESC' : 'ASC'}`;
      }

      try {
        return db.prepare(query).all(...queryValues);
      } catch (error) {
        console.log(error);
      }
    },

    checkTableExists(tableName) {
      const query = `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`;
      const result = db.prepare(query).get(tableName);
      return result;
    },
  };
};
