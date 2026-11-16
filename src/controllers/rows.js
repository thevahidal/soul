const db = require('../db/index');
const { rowService } = require('../services');
const {
  assertValidTableName,
  assertValidColumnName,
  invalidRequestError,
  quoteIdentifier,
} = require('../utils/sql');
const {
  buildFilterClause,
  buildDistinct,
  buildGroupedSelect,
} = require('../utils/query');

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
      description: 'Filter rows. e.g. ?_filters=name:John,age:20 will return rows where name is John and age is 20. Operators: __eq, __neq, __lt, __gt, __lte, __gte, __null, __notnull, __like, __contains, __startswith, __between, __in, __notin. Lists use brackets, e.g. id:[1,2]. Wrap a value in double quote characters to use , : | in it. (a:1|b:2) is an OR group and ! negates a filter or group.',
      in: 'query',
    }
    #swagger.parameters['_distinct'] = {
      description: 'Return unique combinations of these columns. e.g. ?_distinct=category,price',
      in: 'query',
    }
    #swagger.parameters['_group_by'] = {
      description: 'Group rows by these columns. e.g. ?_group_by=category',
      in: 'query',
    }
    #swagger.parameters['_aggregate'] = {
      description: 'Aggregates: count, sum:col, avg:col, min:col, max:col. e.g. ?_group_by=category&_aggregate=count,sum:price. Results are named count, sum_price, ...',
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
    _distinct,
    _group_by,
    _aggregate,
  } = req.query;

  const page = parseInt(_page);
  const limit = parseInt(_limit);

  try {
    assertValidTableName(db, tableName);
  } catch (error) {
    return res.status(error.status || 400).json({
      message: error.message,
      error: error,
    });
  }

  // if _filters are provided, filter rows by them
  // e.g. ?_filters=name:John,age__gte:20 (filters are ANDed)
  // e.g. ?_filters=id:[1,2],(name:John|age__null),!city:Paris,note:"a, b"
  let whereString = '';
  const whereStringValues = [];

  if (_filters !== '') {
    try {
      const { clause, values } = buildFilterClause(db, tableName, _filters);
      whereString = ` WHERE ${clause}`;
      whereStringValues.push(...values);
    } catch (error) {
      return res.status(error.status || 400).json({
        message: error.message,
        error: error,
      });
    }
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
      const fields = db
        .prepare('SELECT * FROM pragma_table_info(?)')
        .all(tableName);
      whereString += '(';
      whereString += fields
        .map((field) => {
          whereStringValues.push(`%${_search}%`);
          return `${tableName}.${field.name} LIKE ?`;
        })
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

  // _distinct=col1,col2 returns unique combinations of those columns
  // _group_by=col&_aggregate=count,sum:price groups rows and aggregates them
  const isGrouped = Boolean(_group_by || _aggregate);
  let schemaString = '';
  let groupString = '';
  let distinctString = '';
  let grouped = { groupColumns: [], aliases: [] };

  try {
    if (
      (_distinct || isGrouped) &&
      (_schema || _extend || (_distinct && isGrouped))
    ) {
      throw invalidRequestError(
        "_distinct and _group_by/_aggregate can't be combined with each other or with _schema/_extend",
      );
    }

    if (_distinct) {
      distinctString = buildDistinct(db, tableName, _distinct);
      schemaString = distinctString;
      params += `_distinct=${_distinct}&`;
    } else if (isGrouped) {
      grouped = buildGroupedSelect(db, tableName, _group_by, _aggregate);
      ({ schemaString, groupString } = grouped);
      params += _group_by ? `_group_by=${_group_by}&` : '';
      params += _aggregate ? `_aggregate=${_aggregate}&` : '';
    }
  } catch (error) {
    return res.status(error.status || 400).json({
      message: error.message,
      error: error,
    });
  }

  // if _ordering is provided, order rows by it
  // e.g. ?_ordering=name will order by name
  // e.g. ?_ordering=-name will order by name descending
  // e.g. ?_ordering=category,-price orders by several columns
  // e.g. ?_ordering=publisher.name will order by publisher name, considering that publisher is a foreign key to publishers table
  let orderString = '';
  let extendString = '';
  let joins = {};

  if (_ordering) {
    try {
      const orderTerms = _ordering.split(',').map((term) => {
        const isDesc = term.startsWith('-');
        const cleanOrder = isDesc ? term.slice(1) : term;
        const direction = isDesc ? 'DESC' : 'ASC';

        if (isGrouped) {
          if (grouped.aliases.includes(cleanOrder)) {
            return `${quoteIdentifier(cleanOrder)} ${direction}`;
          }
          if (!grouped.groupColumns.includes(cleanOrder)) {
            throw invalidRequestError(
              `Can only order by a _group_by column or an aggregate: '${cleanOrder}'`,
            );
          }
          return `${tableName}.${cleanOrder} ${direction}`;
        }

        if (cleanOrder.includes('.')) {
          // Handle foreign key sort, e.g. publisher.name
          const [relation, field] = cleanOrder.split('.');

          if (!joins[relation]) {
            joins[relation] = rowService.getForeignKeyInfo(tableName, relation);
            extendString += ` LEFT JOIN ${joins[relation].joinedTableName} ON ${joins[relation].joinedTableName}.${joins[relation].foreignKey.to} = ${tableName}.${relation}`;
          }

          assertValidColumnName(db, joins[relation].joinedTableName, field);
          return `${joins[relation].joinedTableName}.${field} ${direction}`;
        }

        // regular field sort
        assertValidColumnName(db, tableName, cleanOrder);
        return `${cleanOrder} ${direction}`;
      });

      orderString = ` ORDER BY ${orderTerms.join(', ')}`;
    } catch (error) {
      return res.status(error.status || 400).json({
        message: error.message,
        error: error,
      });
    }

    params += `_ordering=${_ordering}&`;
  }

  // if _schema is provided, return only those fields
  // e.g. ?_schema=name,age will return only name and age fields
  // if _schema is not provided, return all fields
  if (_schema) {
    const schemaFields = _schema.split(',');
    try {
      schemaFields.forEach((field) => {
        assertValidColumnName(db, tableName, field);
        schemaString += `${tableName}.${field},`;
      });
    } catch (error) {
      return res.status(error.status || 400).json({
        message: error.message,
        error: error,
      });
    }
    params += `_schema=${_schema}&`;
  } else if (!_distinct && !isGrouped) {
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

  if (_extend) {
    const extendFields = _extend.split(',');
    extendFields.forEach((extendedField) => {
      try {
        let foreignKey, joinedTableName, joinedTableFields;
        if (joins[extendedField]) {
          foreignKey = joins[extendedField].foreignKey;
          joinedTableName = joins[extendedField].joinedTableName;
          joinedTableFields = joins[extendedField].joinedTableFields;
        } else {
          const foreignKeyInfo = rowService.getForeignKeyInfo(
            tableName,
            extendedField,
          );
          foreignKey = foreignKeyInfo.foreignKey;
          joinedTableName = foreignKeyInfo.joinedTableName;
          joinedTableFields = foreignKeyInfo.joinedTableFields;
          extendString += ` LEFT JOIN ${joinedTableName} ON ${joinedTableName}.${foreignKey.to} = ${tableName}.${extendedField}`;
        }

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
      groupString,
      orderString,
      distinct: Boolean(_distinct),
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
    const total =
      isGrouped && !groupString
        ? 1
        : rowService.getCount({
            tableName,
            whereString,
            whereStringValues,
            groupString,
            distinctString,
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
    assertValidTableName(db, tableName);

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
    res.status(error.status || 400).json({
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

  try {
    assertValidTableName(db, tableName);

    if (!_lookup_field) {
      // find the primary key of the table
      lookupField = db
        .prepare('SELECT * FROM pragma_table_info(?)')
        .all(tableName)
        .find((field) => field.pk === 1).name;
    } else {
      assertValidColumnName(db, tableName, _lookup_field);
    }
  } catch (error) {
    return res.status(error.status || 400).json({
      message: error.message,
      error: error,
    });
  }

  // if _schema is provided, return only those fields
  // e.g. ?_schema=name,age will return only name and age fields
  // if _schema is not provided, return all fields

  let schemaString = '';
  if (_schema) {
    const schemaFields = _schema.split(',');
    try {
      schemaFields.forEach((field) => {
        assertValidColumnName(db, tableName, field);
        schemaString += `${tableName}.${field},`;
      });
    } catch (error) {
      return res.status(error.status || 400).json({
        message: error.message,
        error: error,
      });
    }
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
          .prepare('SELECT * FROM pragma_foreign_key_list(?)')
          .all(tableName)
          .find((fk) => fk.from === extendedField);

        if (!foreignKey) {
          throw new Error('Foreign key not found');
        }

        const { table: joinedTableName } = foreignKey;

        const joinedTableFields = db
          .prepare('SELECT * FROM pragma_table_info(?)')
          .all(joinedTableName);

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

  try {
    assertValidTableName(db, tableName);

    if (!_lookup_field) {
      // find the primary key of the table
      lookupField = db
        .prepare('SELECT * FROM pragma_table_info(?)')
        .all(tableName)
        .find((field) => field.pk === 1).name;
    } else {
      assertValidColumnName(db, tableName, _lookup_field);
    }

    Object.keys(fields).forEach((field) =>
      assertValidColumnName(db, tableName, field),
    );
  } catch (error) {
    return res.status(error.status || 400).json({
      message: error.message,
      error: error,
    });
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({
      message: 'No fields provided',
      error: 'no_fields_provided',
    });
  }

  try {
    const data = rowService.update({
      tableName,
      fields,
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

  try {
    assertValidTableName(db, tableName);

    if (!_lookup_field) {
      // find the primary key of the table
      lookupField = db
        .prepare('SELECT * FROM pragma_table_info(?)')
        .all(tableName)
        .find((field) => field.pk === 1).name;
    } else {
      assertValidColumnName(db, tableName, _lookup_field);
    }
  } catch (error) {
    return res.status(error.status || 400).json({
      message: error.message,
      error: error,
    });
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
    res.status(error.status || 400).json({
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
