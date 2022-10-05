const Database = require('better-sqlite3');
const express = require('express');
const bodyParser = require('body-parser');

const db = new Database('foobar.db', { verbose: console.log });

const app = express();

app.use(bodyParser.json());

// Activate wal mode
db.pragma('journal_mode = WAL');

// Add a request logger
// including the method, url, status code and response time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const delta = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} ${delta}ms`);
  });
  next();
});

app.get('/', (req, res) => {
  res.json({
    message: 'Soul is running!',
  });
});

// Create a new table
app.post('/tables', (req, res) => {
  const { name, fields } = req.body;
  let fieldsString = fields
    .map((field) => `${field.name} ${field.type}`)
    .join(', ');

  // add id, createdAt and updatedAt fields to fieldsString
  fieldsString = `
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, 
    ${fieldsString}
  `;

  const query = `CREATE TABLE ${name} (${fieldsString})`;
  try {
    db.prepare(query).run();
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }

  res.json({
    message: 'Table created',
  });
});

// Return all tables
app.get('/tables', (req, res) => {
  const query = `SELECT name FROM sqlite_master WHERE type='table'`;
  const tables = db.prepare(query).all();

  res.json({
    tables,
  });
});

// Return all rows of a table
app.get('/tables/:name', (req, res) => {
  const { name } = req.params;
  const query = `SELECT * FROM ${name}`;
  const rows = db.prepare(query).all();

  res.json({
    rows,
  });
});

// Delete a table
app.delete('/tables/:name', (req, res) => {
  const { name } = req.params;
  const query = `DROP TABLE ${name}`;
  db.prepare(query).run();

  res.json({
    message: 'Table deleted',
  });
});

// Insert a new row in a table
app.post('/tables/:name', (req, res) => {
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
    const row = db.prepare(query).run();

    res.json({
      message: 'Row inserted',
      row,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
});

// Get a row by id
app.get('/tables/:name/:id', (req, res) => {
  const { name, id } = req.params;
  const query = `SELECT * FROM ${name} WHERE id = ${id}`;
  const row = db.prepare(query).get();

  res.json({
    row,
  });
});

// Update a row by id
app.put('/tables/:name/:id', (req, res) => {
  const { name, id } = req.params;
  const { fields } = req.body;

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

  const query = `UPDATE ${name} SET ${fieldsString} WHERE id = ${id}`;
  try {
    db.prepare(query).run();
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }

  res.json({
    message: 'Row updated',
  });
});

// Delete a row by id
app.delete('/tables/:name/:id', (req, res) => {
  const { name, id } = req.params;
  const query = `DELETE FROM ${name} WHERE id = ${id}`;
  db.prepare(query).run();

  res.json({
    message: 'Row deleted',
  });
});

// Run any query
app.post('/query', (req, res) => {
  const { query } = req.body;
  try {
    const result = db.prepare(query).run();
    res.json({
      result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
});

app.listen(8000, () => {
  console.log('Running on port 8000...');
});
