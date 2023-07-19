const db = require('../db/index');

const quotePrimaryKeys = (pks) => {
  const primaryKeys = pks.split(',');
  const quotedPks = primaryKeys.map((id) => `'${id}'`).join(',');
  return quotedPks;
};

// Return paginated rows of a table
const listTableRows = async (req, res) => {
  /*
    #swagger.tags = ['Rows']
    #swagger.summary = 'List Rows'
    #swagger.description = 'Endpoint to list rows of a table.'
    #swagger.parameters['name'] = {
      description: 'Table name.',
      in: 'path',
    }
    #swagger.parameters['_page'] = {
      description: 'Page number.' ,
      in: 'query',
      type: 'number',
      default: 1
    }
    #swagger.parameters['_limit'] = {
      description: 'Number of rows per page.',
      in: 'query',
      type: 'number',
      default: 10
    }
    #swagger.parameters['_ordering'] = {
      description: 'Ordering of rows. e.g. ?_ordering=-age will order rows by age descending.',
      in: 'query',
    }
    #swagger.parameters['_schema'] = {
      description: 'Schema of rows. e.g. ?_schema=name,age will return only name and age fields.',
      in: 'query',
    }
    #swagger.parameters['_extend'] = {
      description: 'Extend rows. e.g. ?_extend=user_id will return user data for each row.',
      in: 'query',
    }
    #swagger.parameters['_filters'] = {
      description: 'Filter rows. e.g. ?_filters=name:John,age:20 will return rows where name is John and age is 20.',
      in: 'query',
    }
  */
  const { name: tableName } = req.params;
  const {
    _page = 1,
    _limit = 10,
    _search,
    _ordering,
    _schema,
    _extend,
    _filters = '',
  } = req.query;

  const page = parseInt(_page);
  const limit = parseInt(_limit);

  // if _filters are provided, filter rows by them
  // _filters consists of fields to filter by
  // filtering is case insensitive
  // e.g. ?_filters=name:John,age:20
  // will filter by name like '%John%' and age like '%20%'

  const filters = _filters.split(',').map((filter) => {
    const [field, value] = filter.split(':');
    return { field, value };
  });

  let whereString = '';
  if (_filters !== '') {
    whereString += ' WHERE ';
    whereString += filters
      .map((filter) => `${tableName}.${filter.field} = '${filter.value}'`)
      .join(' AND ');
  }

  // if _search is provided, search rows by it
  // e.g. ?_search=John will search for John in all fields of the table
  // searching is case insensitive
  if (_search) {
    if (whereString !== '') {
      whereString += ' AND ';
    } else {
      whereString += ' WHERE ';
    }
    try {
      // get all fields of the table
      const fields = db.prepare(`PRAGMA table_info(${tableName})`).all();
      whereString += '(';
      whereString += fields
        .map((field) => `${tableName}.${field.name} LIKE '%${_search}%'`)
        .join(' OR ');
      whereString += ')';
    } catch (error) {
      return res.status(400).json({
        message: error.message,
        error: error,
      });
    }
  }

  // if _ordering is provided, order rows by it
  // e.g. ?_ordering=name will order by name
  // e.g. ?_ordering=-name will order by name descending
  let orderString = '';
  if (_ordering) {
    orderString += ` ORDER BY ${_ordering.replace('-', '')} ${
      _ordering.startsWith('-') ? 'DESC' : 'ASC'
    }`;
  }

  // if _schema is provided, return only those fields
  // e.g. ?_schema=name,age will return only name and age fields
  // if _schema is not provided, return all fields

  let schemaString = '';
  if (_schema) {
    const schemaFields = _schema.split(',');
    schemaFields.forEach((field) => {
      schemaString += `${tableName}.${field},`;
    });
  } else {
    schemaString = `${tableName}.*`;
  }

  // remove trailing comma
  schemaString = schemaString.replace(/,\s*$/, '');

  // if _extend is provided, extend rows with related data using joins
  // e.g. ?_extend=author_id will extend rows with author data
  // e.g. ?_extend=author_id,book_id will extend rows with author and book data
  // considering that author_id and book_id are foreign keys to authors and books tables

  // e.g. original row is
  // {
  //   id: 1,
  //   name: 'John',
  //   author_id: 1,
  //   book_id: 2
  // }

  // e.g. extended row is
  // {
  //   id: 1,
  //   name: 'John',
  //   author_id: 1,
  //   author_id_data: {
  //     name: 'John Doe'
  //   },
  //   book_id: 2
  //   book_id_data: {
  //     name: 'The Book'
  //   }
  // }

  let foreignKeyError = { error: '', message: '' };
  let extendString = '';

  if (_extend) {
    const extendFields = _extend.split(',');
    extendFields.forEach((extendedField) => {
      try {
        const foreignKey = db
          .prepare(`PRAGMA foreign_key_list(${tableName})`)
          .all()
          .find((fk) => fk.from === extendedField);

        if (!foreignKey) {
          throw new Error(
            `Foreign key not found for extended field '${extendedField}'`
          );
        }

        const { table: joinedTableName } = foreignKey;

        const joinedTableFields = db
          .prepare(`PRAGMA table_info(${joinedTableName})`)
          .all();

        extendString += ` LEFT JOIN ${joinedTableName} ON ${joinedTableName}.${foreignKey.to} = ${tableName}.${extendedField}`;

        // joined fields will be returned in a new object called {field}_data e.g. author_id_data
        const extendFieldsString =
          'json_object( ' +
          joinedTableFields
            .map(
              (joinedTableField) =>
                `'${joinedTableField.name}', ${joinedTableName}.${joinedTableField.name}`
            )
            .join(', ') +
          ' ) as ' +
          extendedField +
          '_data';

        if (schemaString) {
          schemaString += ', ';
        }

        schemaString += extendFieldsString;
      } catch (error) {
        foreignKeyError.error = error;
        foreignKeyError.message = error.message;
      }
    });

    if (foreignKeyError.error) {
      return res.status(400).json({
        message: foreignKeyError.message,
        error: foreignKeyError.error,
      });
    }
  }

  // get paginated rows
  const query = `SELECT ${schemaString} FROM ${tableName} ${extendString} ${whereString} ${orderString} LIMIT ${limit} OFFSET ${
    limit * (page - 1)
  }`;

  try {
    let data = db.prepare(query).all();

    // parse json extended files
    if (_extend) {
      const extendFields = _extend.split(',');
      data = data.map((row) => {
        Object.keys(row).forEach((key) => {
          if (extendFields.includes(key.replace('_data', ''))) {
            row[key] = JSON.parse(row[key]);
          }
        });
        return row;
      });
    }

    // get total number of rows
    const total = db
      .prepare(`SELECT COUNT(*) as total FROM ${tableName} ${whereString}`)
      .get().total;

    const next =
      data.length === limit ? `/tables/${tableName}?page=${page + 1}` : null;
    const previous = page > 1 ? `/tables/${tableName}?page=${page - 1}` : null;

    res.json({
      data,
      total,
      next,
      previous,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Insert a new row in a table
const insertRowInTable = async (req, res, next) => {
  /*
    #swagger.tags = ['Rows']
    #swagger.summary = 'Insert Row'
    #swagger.description = 'Insert a new row in a table'
    #swagger.parameters['name'] = {
      in: 'path',
      description: 'Table name',
      required: true,
      type: 'string'
    }

    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      type: 'object',
      schema: { $ref: "#/definitions/InsertRowRequestBody" }
    }
  */

  const { name: tableName } = req.params;
  const { fields } = req.body;
  const fieldsString = Object.keys(fields).join(', ');

  // wrap text values in quotes
  const valuesString = Object.values(fields)
    .map((value) => {
      if (typeof value === 'string') {
        return `'${value}'`;
      }
      return value;
    })
    .join(', ');

  let values = `(${fieldsString}) VALUES (${valuesString})`;

  if (valuesString === '') {
    values = 'DEFAULT VALUES';
  }

  const query = `INSERT INTO ${tableName} ${values}`;
  try {
    const data = db.prepare(query).run();

    /*
      #swagger.responses[201] = {
        description: 'Row inserted successfully',
        schema: {
          $ref: "#/definitions/InsertRowSuccessResponse"
        }
      }
    */
    res.status(201).json({
      message: 'Row inserted',
      data,
    });
    req.broadcast = {
      type: 'INSERT',
      data: {
        pk: data.lastInsertRowid,
        ...fields,
      },
    };
    next();
  } catch (error) {
    /*
      #swagger.responses[400] = {
        description: 'Bad request',
        schema: {
          $ref: "#/definitions/InsertRowErrorResponse"
        }
      }
    */
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Get a row by pk
const getRowInTableByPK = async (req, res) => {
  /*
    #swagger.tags = ['Rows']
    #swagger.summary = 'Retrieve Row'
    #swagger.description = 'Retrieve a row by primary key'
    #swagger.parameters['name'] = {
      in: 'path',
      description: 'Table name',
      required: true,
      type: 'string'
    }

    #swagger.parameters['pks'] = {
      in: 'path',
      description: 'Primary key (comma-separated for bulk retrieve)',
      required: true,
    }

    #swagger.parameters['_schema'] = {
      in: 'query',
      description: 'Fields to return',
      required: false,
      type: 'string'
    }

    #swagger.parameters['_extend'] = {
      in: 'query',
      description: 'Foreign keys to extend',
      required: false,
      type: 'string'
    }

    #swagger.parameters['_lookup_field'] = {
      in: 'query',
      description: 'If you want to get field by any other field than primary key, use this parameter',
      required: false,
      type: 'string'
    }

  */
  const { name: tableName, pks } = req.params;
  const { _lookup_field, _schema, _extend } = req.query;

  let lookupField = _lookup_field;

  if (!_lookup_field) {
    // find the primary key of the table
    try {
      lookupField = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all()
        .find((field) => field.pk === 1).name;
    } catch (error) {
      return res.status(400).json({
        message: error.message,
        error: error,
      });
    }
  }

  // if _schema is provided, return only those fields
  // e.g. ?_schema=name,age will return only name and age fields
  // if _schema is not provided, return all fields

  let schemaString = '';
  if (_schema) {
    const schemaFields = _schema.split(',');
    schemaFields.forEach((field) => {
      schemaString += `${tableName}.${field},`;
    });
  } else {
    schemaString = `${tableName}.*`;
  }

  // remove trailing comma
  schemaString = schemaString.replace(/,\s*$/, '');

  // if _extend is provided, extend rows with related data using joins
  // e.g. ?_extend=author_id will extend rows with author data
  // e.g. ?_extend=author_id,book_id will extend rows with author and book data
  // considering that author_id and book_id are foreign keys to authors and books tables

  // e.g. original row is
  // {
  //   id: 1,
  //   name: 'John',
  //   author_id: 1,
  //   book_id: 2
  // }

  // e.g. extended row is
  // {
  //   id: 1,
  //   name: 'John',
  //   author_id: 1,
  //   author_id_data: {
  //     name: 'John Doe'
  //   },
  //   book_id: 2
  //   book_id_data: {
  //     name: 'The Book'
  //   }
  // }

  let extendString = '';
  if (_extend) {
    const extendFields = _extend.split(',');
    extendFields.forEach((extendedField) => {
      try {
        const foreignKey = db
          .prepare(`PRAGMA foreign_key_list(${tableName})`)
          .all()
          .find((fk) => fk.from === extendedField);

        if (!foreignKey) {
          throw new Error('Foreign key not found');
        }

        const { table: joinedTableName } = foreignKey;

        const joinedTableFields = db
          .prepare(`PRAGMA table_info(${joinedTableName})`)
          .all();

        extendString += ` LEFT JOIN ${joinedTableName} ON ${joinedTableName}.${foreignKey.to} = ${tableName}.${extendedField}`;

        // joined fields will be returned in a new object called {field}_data e.g. author_id_data
        const extendFieldsString =
          'json_object( ' +
          joinedTableFields
            .map(
              (joinedTableField) =>
                `'${joinedTableField.name}', ${joinedTableName}.${joinedTableField.name}`
            )
            .join(', ') +
          ' ) as ' +
          extendedField +
          '_data';

        if (schemaString) {
          schemaString += ', ';
        }

        schemaString += extendFieldsString;
      } catch (error) {
        return res.status(400).json({
          message: error.message,
          error: error,
        });
      }
    });
  }

  const query = `SELECT ${schemaString} FROM ${tableName} ${extendString} WHERE ${tableName}.${lookupField} in (${quotePrimaryKeys(
    pks
  )})`;

  try {
    let data = db.prepare(query).all();

    // parse json extended files
    if (_extend) {
      const extendFields = _extend.split(',');
      data = data.map((row) => {
        Object.keys(row).forEach((key) => {
          if (extendFields.includes(key.replace('_data', ''))) {
            row[key] = JSON.parse(row[key]);
          }
        });
        return row;
      });
    }

    if (data.length === 0) {
      return res.status(404).json({
        message: 'Row not found',
        error: 'not_found',
      });
    } else {
      res.json({
        data,
      });
    }
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Update a row by pk
const updateRowInTableByPK = async (req, res, next) => {
  /*
    #swagger.tags = ['Rows']
    #swagger.summary = 'Update Row'
    #swagger.description = 'Update a row by primary key'
    #swagger.parameters['name'] = {
      in: 'path',
      description: 'Table name',
      required: true,
      type: 'string'
    }
    #swagger.parameters['pks'] = {
      in: 'path',
      description: 'Primary key (comma-separated for bulk update)',
      required: true,
    }

    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      type: 'object',
      schema: { $ref: "#/definitions/UpdateRowRequestBody" }
    }

    #swagger.parameters['_lookup_field'] = {
      in: 'query',
      description: 'If you want to update row by any other field than primary key, use this parameter',
      required: false,
      type: 'string'
    }
*/

  const { name: tableName, pks } = req.params;
  const { fields } = req.body;
  const { _lookup_field } = req.query;

  let lookupField = _lookup_field;

  if (!_lookup_field) {
    // find the primary key of the table
    try {
      lookupField = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all()
        .find((field) => field.pk === 1).name;
    } catch (error) {
      return res.status(400).json({
        message: error.message,
        error: error,
      });
    }
  }

  // wrap text values in quotes
  const fieldsString = Object.keys(fields)
    .map((key) => {
      let value = fields[key];
      if (typeof value === 'string') {
        value = `'${value}'`;
      }
      return `${key} = ${value}`;
    })
    .join(', ');

  if (fieldsString === '') {
    return res.status(400).json({
      message: 'No fields provided',
      error: 'no_fields_provided',
    });
  }

  const query = `UPDATE ${tableName} SET ${fieldsString} WHERE ${lookupField} in (${quotePrimaryKeys(
    pks
  )})`;

  try {
    const data = db.prepare(query).run();

    res.json({
      message: 'Row updated',
      data,
    });
    req.broadcast = {
      type: 'UPDATE',
      _lookup_field: lookupField,
      data: {
        pks: pks.split(','),
        ...fields,
      },
    };
    next();
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Delete a row by id
const deleteRowInTableByPK = async (req, res, next) => {
  /*
    #swagger.tags = ['Rows']
    #swagger.summary = 'Delete Row'
    #swagger.description = 'Delete a row by primary key'
    #swagger.parameters['name'] = {
      in: 'path',
      description: 'Table name',
      required: true,
      type: 'string'
    }
    #swagger.parameters['pks'] = {
      in: 'path',
      description: 'Primary key (comma-separated for bulk delete)',
      required: true,
    }
    #swagger.parameters['_lookup_field'] = {
      in: 'query',
      description: 'If you want to delete row by any other field than primary key, use this parameter',
      required: false,
      type: 'string'
    }

  */
  const { name: tableName, pks } = req.params;
  const { _lookup_field } = req.query;

  let lookupField = _lookup_field;

  if (!_lookup_field) {
    // find the primary key of the table
    try {
      lookupField = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all()
        .find((field) => field.pk === 1).name;
    } catch (error) {
      return res.status(400).json({
        message: error.message,
        error: error,
      });
    }
  }

  const query = `DELETE FROM ${tableName} WHERE ${lookupField} in (${quotePrimaryKeys(
    pks
  )})`;

  try {
    const data = db.prepare(query).run();

    if (data.changes === 0) {
      res.status(404).json({
        error: 'not_found',
      });
    } else {
      res.json({
        message: 'Row deleted',
        data,
      });
      req.broadcast = {
        type: 'DELETE',
        _lookup_field: lookupField,
        data: {
          pks: pks.split(','),
        },
      };
      next();
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

module.exports = {
  listTableRows,
  insertRowInTable,
  getRowInTableByPK,
  updateRowInTableByPK,
  deleteRowInTableByPK,
};
