const db = require('../db/index');

const createTable = async (req, res) => {
  /*
    #swagger.tags = ['Tables']
    #swagger.summary = 'Create Table'
    #swagger.description = 'Endpoint to create a table'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      type: 'object',
      schema: { $ref: "#/definitions/CreateTableRequestBody" }
    }
  */
  const {
    name: tableName,
    schema,
    autoAddCreatedAt = true,
    autoAddUpdatedAt = true,
  } = req.body;

  let indices = [];
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
          indices.push(name);
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

  // add created at and updated at
  if (autoAddCreatedAt) {
    schemaString = `
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        ${schemaString}
      `;
  }

  if (autoAddUpdatedAt) {
    schemaString = `
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        ${schemaString}
      `;
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

    const generatedSchema = db.prepare(`PRAGMA table_info(${tableName})`).all();

    /*
      #swagger.responses[201] = {
        description: 'Table created',
        schema: {
          $ref: "#/definitions/CreateTableSuccessResponse"
        }
      }
    */
    res.status(201).json({
      message: 'Table created',
      data: {
        name: tableName,
        schema: generatedSchema,
      },
    });
  } catch (error) {
    /*
      #swagger.responses[400] = {
        description: 'Bad request',
        schema: {
          $ref: "#/definitions/CreateTableErrorResponse"
        }
      }
    */
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Return all tables
const listTables = async (req, res) => {
  /*
    #swagger.tags = ['Tables']
    #swagger.summary = 'List Tables'
    #swagger.description = 'Endpoint to list all tables'

    #swagger.parameters['_search'] = {
      in: 'query',
      required: false,
      type: 'string',
      description: 'Search term'
    }
    #swagger.parameters['_ordering'] = {
      in: 'query',
      required: false,
      type: 'string',
      description: 'Ordering term'
    }
  */
  const { _search, _ordering } = req.query;

  let query = `SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`;

  // if search is provided, search the tables
  // e.g. ?_search=users
  if (_search) {
    query += ` AND name LIKE $searchQuery`;
  }

  // if ordering is provided, order the tables
  // e.g. ?_ordering=name (ascending) or ?_ordering=-name (descending)
  if (_ordering) {
    query += ` ORDER BY $ordering`;
  }

  try {
    const tables = db.prepare(query).all({
      searchQuery: `%${_search}%`,
      ordering: `${_ordering?.replace('-', '')} ${
        _ordering?.startsWith('-') ? 'DESC' : 'ASC'
      }`,
    });

    res.json({
      data: tables,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// TODO: Return the schema of a table by name
const getTableSchema = async (req, res) => {
  /*
    #swagger.tags = ['Tables']
    #swagger.summary = 'Get Table Schema'
    #swagger.description = 'Endpoint to get the schema of a table'
    #swagger.parameters['name'] = {
      in: 'path',
      required: true,
      type: 'string',
      description: 'Name of the table'
    }

  */
  const { name: tableName } = req.params;
  const query = `PRAGMA table_info(${tableName})`;
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

// Delete a table by name
const deleteTable = async (req, res) => {
  /*
    #swagger.tags = ['Tables']
    #swagger.summary = 'Delete Table'
    #swagger.description = 'Endpoint to delete a table'
    #swagger.parameters['name'] = {
      in: 'path',
      required: true,
      type: 'string',
      description: 'Name of the table'
    }

  */
  const { name: tableName } = req.params;
  const query = `DROP TABLE ${tableName}`;
  try {
    const data = db.prepare(query).run();

    res.json({
      message: 'Table deleted',
      data,
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
