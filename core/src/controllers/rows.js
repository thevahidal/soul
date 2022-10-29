const db = require('../db/index');

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
  */
  const { name } = req.params;
  const {
    _page = 1,
    _limit = 10,
    _search,
    _ordering,
    _schema,
    _extend,
    ...filters
  } = req.query;

  const page = parseInt(_page);
  const limit = parseInt(_limit);

  // if filters are provided, filter rows by them
  // filters consists of fields to filter by
  // filtering must be case insensitive
  // e.g. ?name=John&age=20
  // will filter by name like '%John%' and age like '%20%'

  let whereString = '';
  if (Object.keys(filters).length > 0) {
    whereString += ' WHERE ';
    whereString += Object.keys(filters)
      .map((key) => `${key} LIKE '%${filters[key]}%'`)
      .join(' AND ');
  }

  // if _search is provided, search rows by it
  // e.g. ?_search=John will search for John in all fields of the table
  // searching must be case insensitive
  if (_search) {
    if (whereString) {
      whereString += ' AND ';
    } else {
      whereString += ' WHERE ';
    }
    try {
      // get all fields of the table
      const fields = db.prepare(`PRAGMA table_info(${name})`).all();
      whereString += fields
        .map((field) => `${field.name} LIKE '%${_search}%'`)
        .join(' OR ');
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
      schemaString += `${name}.${field},`;
    });
  } else {
    schemaString = `${name}.*`;
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
    extendFields.forEach((field) => {
      try {
        const foreignKey = db
          .prepare(`PRAGMA foreign_key_list(${name})`)
          .all()
          .find((fk) => fk.from === field);

        if (!foreignKey) {
          throw new Error('Foreign key not found');
        }

        const { table } = foreignKey;

        const fields = db.prepare(`PRAGMA table_info(${table})`).all();

        extendString += ` LEFT JOIN ${table} as ${table} ON ${table}.${foreignKey.to} = ${name}.${field}`;

        // joined fields will be returned in a new object called {field}_data e.g. author_id_data
        const extendFieldsString =
          'json_object( ' +
          fields
            .map((field) => `'${field.name}', ${table}.${field.name}`)
            .join(', ') +
          ' ) as ' +
          field +
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

  // get paginated rows
  const query = `SELECT ${schemaString} FROM ${name} ${extendString} ${whereString} ${orderString} LIMIT ${limit} OFFSET ${
    limit * (page - 1)
  }`;

  try {
    const data = db.prepare(query).all();

    // get total number of rows
    const total = db
      .prepare(`SELECT COUNT(*) as total FROM ${name} ${whereString}`)
      .get().total;

    const next =
      data.length === limit ? `/tables/${name}?page=${page + 1}` : null;
    const previous = page > 1 ? `/tables/${name}?page=${page - 1}` : null;

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
const insertRowInTable = async (req, res) => {
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

  const { name } = req.params;
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

  const query = `INSERT INTO ${name} (${fieldsString}) VALUES (${valuesString})`;
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

    #swagger.parameters['pk'] = {
      in: 'path',
      description: 'Primary key',
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

    #swagger.parameters['_field'] = {
      in: 'query',
      description: 'If you want to get field by any other field than primary key, use this parameter',
      required: false,
      type: 'string'
    }

  */
  const { name, pk } = req.params;
  const { _field, _schema, _extend } = req.query;

  let searchField = _field;

  if (!_field) {
    // find the primary key of the table
    searchField = db
      .prepare(`PRAGMA table_info(${name})`)
      .all()
      .find((field) => field.pk === 1).name;
  }

  // if _schema is provided, return only those fields
  // e.g. ?_schema=name,age will return only name and age fields
  // if _schema is not provided, return all fields

  let schemaString = '';
  if (_schema) {
    const schemaFields = _schema.split(',');
    schemaFields.forEach((field) => {
      schemaString += `${name}.${field},`;
    });
  } else {
    schemaString = `${name}.*`;
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
    extendFields.forEach((field) => {
      try {
        const foreignKey = db
          .prepare(`PRAGMA foreign_key_list(${name})`)
          .all()
          .find((fk) => fk.from === field);

        if (!foreignKey) {
          throw new Error('Foreign key not found');
        }

        const { table } = foreignKey;

        const fields = db.prepare(`PRAGMA table_info(${table})`).all();

        extendString += ` LEFT JOIN ${table} as ${table} ON ${table}.${foreignKey.to} = ${name}.${field}`;

        // joined fields will be returned in a new object called {field}_data e.g. author_id_data
        const extendFieldsString =
          'json_object( ' +
          fields
            .map((field) => `'${field.name}', ${table}.${field.name}`)
            .join(', ') +
          ' ) as ' +
          field +
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

  const query = `SELECT ${schemaString} FROM ${name} ${extendString} WHERE ${name}.${searchField} = ${pk}`;

  try {
    const data = db.prepare(query).get();

    if (!data) {
      res.status(404).json({
        message: 'Row not found',
        error: 'not_found',
      });
    } else {
      res.json({
        data,
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Update a row by pk
const updateRowInTableByPK = async (req, res) => {
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
    #swagger.parameters['pk'] = {
      in: 'path',
      description: 'Primary key',
      required: true,
    }

    #swagger.parameters['body'] = {
      in: 'body', 
      required: true,
      type: 'object',
      schema: { $ref: "#/definitions/UpdateRowRequestBody" }
    }

    #swagger.parameters['_field'] = {
      in: 'query',
      description: 'If you want to update row by any other field than primary key, use this parameter',
      required: false,
      type: 'string'
    }
*/

  const { name, pk } = req.params;
  const { fields } = req.body;
  const { _field } = req.query;

  let searchField = _field;

  if (!_field) {
    // find the primary key of the table
    searchField = db
      .prepare(`PRAGMA table_info(${name})`)
      .all()
      .find((field) => field.pk === 1).name;
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

  const query = `UPDATE ${name} SET ${fieldsString} WHERE ${searchField} = '${pk}'`;
  try {
    db.prepare(query).run();

    res.json({
      message: 'Row updated',
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Delete a row by id
const deleteRowInTableByPK = async (req, res) => {
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
    #swagger.parameters['pk'] = {
      in: 'path',
      description: 'Primary key',
      required: true,
    }
    #swagger.parameters['_field'] = {
      in: 'query',
      description: 'If you want to delete row by any other field than primary key, use this parameter',
      required: false,
      type: 'string'
    }

  */
  const { name, pk } = req.params;
  const { _field } = req.query;

  let searchField = _field;

  if (!_field) {
    // find the primary key of the table
    searchField = db
      .prepare(`PRAGMA table_info(${name})`)
      .all()
      .find((field) => field.pk === 1).name;
  }

  const query = `DELETE FROM ${name} WHERE ${searchField} = '${pk}'`;
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
  }
};

module.exports = {
  listTableRows,
  insertRowInTable,
  getRowInTableByPK,
  updateRowInTableByPK,
  deleteRowInTableByPK,
};
