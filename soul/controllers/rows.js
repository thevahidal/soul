const db = require('../db/index');

// Return paginated rows of a table
const listTableRows = async (req, res) => {
  const { name } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const query = `SELECT * FROM ${name} LIMIT ${limit} OFFSET ${
    (page - 1) * limit
  }`;
  const data = db.prepare(query).all();

  res.json({
    next:
      data.length === parseInt(limit)
        ? `/tables/${name}?page=${parseInt(page) + 1}`
        : null,
    count: db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get().count,
    data,
  });
};

// Insert a new row in a table
const insertRowInTable = async (req, res) => {
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

    res.json({
      message: 'Row inserted',
      data,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

// Get a row by pk
const getRowInTableByPK = async (req, res) => {
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

  const query = `SELECT * FROM ${name} WHERE ${searchField} = '${pk}'`;

  try {
    const data = db.prepare(query).get();

    if (!data) {
      res.status(404).json({
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
