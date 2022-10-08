const db = require('../db/index');

// Return paginated rows of a table
const listTableRows = async (req, res) => {
  const { name } = req.params;
  const { _page = 1, _limit = 10, _search, _ordering, ...filters } = req.query;

  const page = parseInt(_page);
  const limit = parseInt(_limit);

  // filters consists of fields to filter by
  // e.g. ?name=John&age=20
  // will filter by name = 'John' and age = 20

  // if filters are provided, filter rows by them
  // filtering must be case insensitive
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
      res.status(400).json({
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

  // get rows
  const query = `SELECT * FROM ${name} ${whereString} ${orderString} LIMIT ${limit} OFFSET ${
    (page - 1) * limit
  }`;

  console.log({ query });

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
