const config = require('../config');
const db = require('../db/index');
const { authService } = require('../services');
const { dbConstants, responseMessages } = require('../constants');
const { invalidRequestError } = require('../utils/sql');
const { broadcastToTable } = require('../middlewares/broadcast');
const rowSchemas = require('../schemas/rows');
const { insertRow, updateRows, deleteRows } = require('./rows');

const ROW_PATH = /^\/api\/tables\/([^/]+)\/rows(?:\/([^/]+))?$/;

const routes = {
  POST: {
    schema: rowSchemas.insertRowInTable,
    run: ({ params, body }) =>
      insertRow({ tableName: params.name, fields: body.fields }),
  },
  PUT: {
    schema: rowSchemas.updateRowInTableByPK,
    run: ({ params, query, body }) =>
      updateRows({
        tableName: params.name,
        pks: params.pks,
        fields: body.fields,
        lookupField: query._lookup_field,
      }),
  },
  DELETE: {
    schema: rowSchemas.deleteRowInTableByPK,
    run: ({ params, query }) =>
      deleteRows({
        tableName: params.name,
        pks: params.pks,
        lookupField: query._lookup_field,
      }),
  },
};

// Validate and authorize one operation; returns what is needed to run it.
const prepareOperation = ({ method, path, body = {} }, user) => {
  const url = new URL(path, 'http://soul');
  const match = ROW_PATH.exec(url.pathname);

  if (!match) {
    throw invalidRequestError(`Unsupported path '${path}'`);
  }

  const [, name, pks] = match;
  const { schema, run } = routes[method];
  const { value, error } = schema.validate({
    params: pks ? { name, pks } : { name },
    query: Object.fromEntries(url.searchParams),
    body,
    cookies: {},
  });

  if (error) {
    throw invalidRequestError(error.message);
  }

  if (dbConstants.reservedTableNames.includes(name)) {
    throw invalidRequestError(`Table '${name}' is not allowed in a batch`);
  }

  if (
    config.auth &&
    !authService.hasTablePermission({
      payload: user,
      tableName: name,
      verb: method,
    })
  ) {
    throw invalidRequestError(
      responseMessages.errorMessage.NOT_AUTHORIZED_ERROR,
      403,
    );
  }

  return { tableName: name, run: () => run(value) };
};

const withIndex = (index, fn) => {
  try {
    return fn();
  } catch (error) {
    error.index = index;
    throw error;
  }
};

const batch = async (req, res) => {
  /*
    #swagger.tags = ['Rows']
    #swagger.summary = 'Batch'
    #swagger.description = 'Run row inserts, updates and deletes atomically: if one fails, none are applied.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      type: 'object',
      schema: { $ref: '#/definitions/BatchRequestBody' }
    }
  */
  try {
    const operations = req.body.operations.map((operation, index) =>
      withIndex(index, () => prepareOperation(operation, req.user)),
    );

    const results = db.transaction(() =>
      operations.map((operation, index) => withIndex(index, operation.run)),
    )();

    res.json({
      results: results.map(({ status, body }) => ({ status, body })),
    });

    results.forEach(({ broadcast }, index) =>
      broadcastToTable(operations[index].tableName, broadcast),
    );
  } catch (error) {
    res.status(error.status || 400).json({
      message: error.message,
      index: error.index,
      error: error.body?.error,
    });
  }
};

module.exports = { batch };
