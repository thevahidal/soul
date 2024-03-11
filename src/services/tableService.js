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

        db.prepare(`PRAGMA table_info(${tableName})`).all();
      } catch (error) {
        console.log(error);
      }
    },

    listTables(options = {}) {
      const { search, ordering, exclude } = options;

      let query = `SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`;

      // if search is provided, search the tables
      // e.g. search=users
      if (search) {
        query += ` AND name LIKE $searchQuery`;
      }

      // if exclude is passed don't return the some tables
      // e.g. exclude=['_users', '_roles']
      if (exclude) {
        const excludeTables = exclude.map((field) => `'${field}'`).join(' ,');
        query += `AND name NOT IN (${excludeTables});`;
      }

      // if ordering is provided, order the tables
      // e.g. ordering=name (ascending) or ?_ordering=-name (descending)
      if (ordering) {
        query += ` ORDER BY $ordering`;
      }

      try {
        const tables = db.prepare(query).all({
          searchQuery: `%${search}%`,
          ordering: `${ordering?.replace('-', '')} ${
            ordering?.startsWith('-') ? 'DESC' : 'ASC'
          }`,
        });
        return tables;
      } catch (error) {
        console.log(error);
      }
    },

    checkTableExists(tableName) {
      const query = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`;
      const result = db.prepare(query).get();
      return result;
    },
  };
};
