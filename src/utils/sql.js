// SQLite cannot bind identifiers (table/column names) as `?` parameters in
// most DML/DDL positions -- those must be validated against the live schema
// (allowlisted) before being spliced into a query string. Values must always
// go through `?` bindings, never interpolation. `quoteIdentifier` is not
// itself an injection defense, just correct SQLite identifier quoting --
// only call it on names that have already been validated below.

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

const invalidRequestError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const quoteIdentifier = (identifier) =>
  `"${String(identifier).replace(/"/g, '""')}"`;

// Escapes a value as a SQL literal for the rare DDL positions (e.g. a column
// DEFAULT) where `?` binding isn't available. Prefer `?` binding everywhere
// else.
const quoteLiteral = (value) => {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  return `'${String(value).replace(/'/g, "''")}'`;
};

const assertValidTableName = (db, tableName) => {
  const row = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?`,
    )
    .get(tableName);

  if (!row) {
    throw invalidRequestError(`Table '${tableName}' does not exist`, 404);
  }

  return tableName;
};

// Uses the pragma_table_info(?) table-valued-function form (SQLite >=3.16)
// instead of `PRAGMA table_info(...)`, which doesn't support bound params --
// this form is a plain SELECT with a function-call argument, so it does.
const getTableColumns = (db, tableName) => {
  return db.prepare('SELECT * FROM pragma_table_info(?)').all(tableName);
};

const assertValidColumnName = (db, tableName, columnName) => {
  assertValidTableName(db, tableName);

  const columns = getTableColumns(db, tableName);
  const found = columns.some((column) => column.name === columnName);

  if (!found) {
    throw invalidRequestError(
      `Column '${columnName}' does not exist on table '${tableName}'`,
    );
  }

  return columnName;
};

const assertValidOperator = (operator) => {
  if (!Object.prototype.hasOwnProperty.call(operators, operator)) {
    throw invalidRequestError(`Invalid field operator '${operator}'`);
  }

  return operators[operator];
};

module.exports = {
  operators,
  invalidRequestError,
  quoteIdentifier,
  quoteLiteral,
  assertValidTableName,
  getTableColumns,
  assertValidColumnName,
  assertValidOperator,
};
