const db = require('../db/index');
const { dbConstants } = require('../constants');
const {
  assertValidTableName,
  getValidatedTableName,
  quoteIdentifier,
  quoteLiteral,
} = require('../utils/sql');

const { reservedTableNames } = dbConstants;

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
          column += ` DEFAULT ${quoteLiteral(defaultValue)}`;
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
      },
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

    const generatedSchema = db
      .prepare('SELECT * FROM pragma_table_info(?)')
      .all(tableName);

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
  const queryValues = [];

  // if search is provided, search the tables
  // e.g. ?_search=users
  if (_search) {
    query += ` AND name LIKE ?`;
    queryValues.push(`%${_search}%`);
  }

  // if ordering is provided, order the tables
  // e.g. ?_ordering=name (ascending) or ?_ordering=-name (descending)
  // `name` is the only column this query returns, so it's the only valid
  // ordering target -- there's no live schema to validate an arbitrary
  // column against here the way row/column ordering does.
  if (_ordering) {
    const isDesc = _ordering.startsWith('-');
    const cleanOrder = _ordering.replace('-', '');

    if (cleanOrder !== 'name') {
      return res.status(400).json({
        message: `Invalid ordering field '${cleanOrder}'. Only 'name' can be used to order tables.`,
        error: 'invalid_ordering_field',
      });
    }

    query += ` ORDER BY name ${isDesc ? 'DESC' : 'ASC'}`;
  }

  try {
    const tables = db.prepare(query).all(...queryValues);

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
  try {
    assertValidTableName(db, tableName);

    const schema = db
      .prepare('SELECT * FROM pragma_table_info(?)')
      .all(tableName);

    res.json({
      data: schema,
    });
  } catch (error) {
    res.status(error.status || 400).json({
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
  try {
    if (reservedTableNames.includes(tableName)) {
      return res.status(409).json({
        message: `Table '${tableName}' is reserved and cannot be deleted`,
        error: 'reserved_table_name',
      });
    }

    const validatedTableName = getValidatedTableName(db, tableName);

    // DROP TABLE cannot take a bound parameter for its identifier in any
    // SQL dialect. Use the canonical name returned from sqlite_master
    // (parameterized lookup) and quote it as an identifier before use.
    const data = db
      .prepare(`DROP TABLE ${quoteIdentifier(validatedTableName)}`)
      .run();

    res.json({
      message: 'Table deleted',
      data,
    });
  } catch (error) {
    res.status(error.status || 400).json({
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
