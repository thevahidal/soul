const db = require('../db/index');
const { rowService } = require('../services');

// const quotePrimaryKeys = (pks) => {
//   const primaryKeys = pks.split(',');
//   const quotedPks = primaryKeys.map((id) => `'${id}'`).join(',');
//   return quotedPks;
// };

const operators = {
  eq: '=',
  lt: '<',
  gt: '>',
  lte: '<=',
  gte: '>=',
  neq: '!=',
  null: 'IS NULL',
  notnull: 'IS NOT NULL',
};

// Return paginated rows of a table
const listTableRows = async (req, res, next) => {
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
  let params = '';
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
  let filters = [];

  // split the filters by comma(,) except when in an array
  const re = /,(?![^[]*?\])/;
  try {
    filters = _filters.split(re).map((filter) => {
      //NOTE: When using the _filter parameter, the values are split using the ":" sign, like this (_filters=Total__eq:1). However, if the user sends a date value, such as (_filters=InvoiceDate__eq:2010-01-08 00:00:00), there will be additional colon (":") signs present.
      let [key, ...value] = filter.split(':');
      if (value.length === 1) {
        value = value[0];
      } else {
        value = value.map((element) => element).join(':');
      }

      let field = key.split('__')[0];
      let fieldOperator = key.split('__')[1];

      if (!fieldOperator) {
        fieldOperator = 'eq';
      } else if (!operators[fieldOperator]) {
        throw new Error(
          `Invalid field operator '${fieldOperator}' for field '${field}'. You can only use the following operators after the '${field}' field: __lt, __gt, __lte, __gte, __eq, __neq.`,
        );
      }

      let operator = operators[fieldOperator];
      if (['null', 'notnull'].includes(fieldOperator)) {
        value = null;
      }

      return { field, operator, value };
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      error: error,
    });
  }

  let whereString = '';
  const whereStringValues = [];

  if (_filters !== '') {
    whereString += ' WHERE ';
    whereString += filters
      .map((filter) => {
        if (filter.value) {
          if (filter.value.startsWith('[') && filter.value.endsWith(']')) {
            const arrayValues = filter.value.slice(1, -1).split(',');
            return `${tableName}.${filter.field} IN (${arrayValues
              .map((val) => `'${val}'`)
              .join(', ')})`;
          } else {
            return `${tableName}.${filter.field} ${filter.operator} '${filter.value}'`;
          }
        } else {
          return `${tableName}.${filter.field} ${filter.operator}`;
        }
      })
      .join(' AND ');
    params = `_filters=${_filters}&`;
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
      params += `_search=${_search}&`;
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
    params += `_ordering=${_ordering}&`;
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
    params += `_schema=${_schema}&`;
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
            `Foreign key not found for extended field '${extendedField}'`,
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
                `'${joinedTableField.name}', ${joinedTableName}.${joinedTableField.name}`,
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

    params += `_extend=${_extend}&`;

    if (foreignKeyError.error) {
      return res.status(400).json({
        message: foreignKeyError.message,
        error: foreignKeyError.error,
      });
    }
  }

  try {
    let data = rowService.get({
      schemaString,
      tableName,
      extendString,
      whereString,
      orderString,
      limit,
      page: limit * (page - 1),
      whereStringValues,
    });

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
    const total = rowService.getCount({
      tableName,
      whereString,
      whereStringValues,
    });

    const nextPage =
      data.length === limit
        ? `/tables/${tableName}/rows?${params}_limit=${_limit}&_page=${
            page + 1
          }`
        : null;
    const previous =
      page > 1
        ? `/tables/${tableName}/rows?${params}_limit=${_limit}&_page=${
            page - 1
          }`
        : null;

    // res.json({
    //   data,
    //   total,
    //   next: nextPage,
    //   previous
    // });

    req.response = {
      status: 200,
      payload: { data, total, next: nextPage, previous },
    };
    next();
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
      schema: { $ref: '#/definitions/InsertRowRequestBody' }
    }
  */

  const { name: tableName } = req.params;
  const { fields: queryFields } = req.body;

  // Remove null values from fields for accurate query construction.
  const fields = Object.fromEntries(
    Object.entries(queryFields).filter(([, value]) => value !== null),
  );

  try {
    const data = rowService.save({ tableName, fields });

    /*
      #swagger.responses[201] = {
        description: 'Row inserted successfully',
        schema: {
          $ref: '#/definitions/InsertRowSuccessResponse'
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
          $ref: '#/definitions/InsertRowErrorResponse'
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
const getRowInTableByPK = async (req, res, next) => {
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
                `'${joinedTableField.name}', ${joinedTableName}.${joinedTableField.name}`,
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

  try {
    let data = rowService.getById({
      schemaString,
      tableName,
      extendString,
      lookupField,
      pks,
    });

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
      // res.json({
      //   data
      // });

      req.response = { status: 200, payload: { data } };
      next();
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
      schema: { $ref: '#/definitions/UpdateRowRequestBody' }
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

  try {
    const data = rowService.update({
      tableName,
      fieldsString,
      lookupField,
      pks,
    });

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

  try {
    const data = rowService.delete({ tableName, lookupField, pks });

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
