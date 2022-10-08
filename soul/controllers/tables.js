const db = require('../db/index');

const createTable = async (req, res) => {
  const { name, schema } = req.body;

  let schemaString = schema
    // support name, type, default, not null, unique, primary key, foreign key, index
    // e.g. { name: 'id', type: 'INTEGER', primaryKey: true }

    .map(
      ({
        name,
        type,
        default: defaultValue,
        notNull,
        unique,
        primaryKey,
        foreignKey,
        index,
      }) => {
        let column = `${name} ${type}`;
        if (defaultValue) {
          column += ` DEFAULT ${defaultValue}`;
        }
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
        if (index) {
          column += ` INDEX ${index}`;
        }

        return column;
      }
    )
    .join(', ');

  // add id if primary key is not defined
  if (!schema.find((field) => field.primaryKey)) {
    schemaString = `
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        ${schemaString}
      `;
  }

  // add createdAt and updatedAt fields to fieldsString
  schemaString = `
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, 
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, 
      ${schemaString}
    `;

  const query = `CREATE TABLE ${name} (${schemaString})`;
  try {
    db.prepare(query).run();

    res.json({
      message: 'Table created',
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Return all tables
const listTables = async (req, res) => {
  const query = `SELECT name FROM sqlite_master WHERE type='table'`;
  try {
    const tables = db.prepare(query).all();

    res.json({
      tables,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// TODO: Return the schema of a table
const getTableSchema = async (req, res) => {
  const { name } = req.params;
  const query = `PRAGMA table_info(${name})`;
  try {
    const schema = db.prepare(query).all();

    res.json({
      data: schema,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Delete a table
const deleteTable = async (req, res) => {
  const { name } = req.params;
  const query = `DROP TABLE ${name}`;

  try {
    db.prepare(query).run();

    res.json({
      message: 'Table deleted',
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

module.exports = {
  listTables,
  createTable,
  getTableSchema,
  deleteTable,
};
