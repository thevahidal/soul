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
  const { name, schema } = req.body;

  // validate schema

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
          column += ` DEFAULT ${defaultValue}`;
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
          column += ` INDEX ${index}`;
        }

        return column;
      }
    )
    .join(', ');

  // add id if primary key is not defined
  if (!schema.find((field) => field.primaryKey)) {
    schemaString = `
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      ${schemaString}
    `;
  }

  // add createdAt and updatedAt fields to fieldsString
  schemaString = `
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, 
    ${schemaString}
  `;

  const query = `CREATE TABLE ${name} (${schemaString})`;
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

// Return paginated rows of a table
app.get('/tables/:name', (req, res) => {
  const { name } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // do the query using where instead of limit
  // https://github.com/WiseLibs/better-sqlite3/issues/527#issuecomment-776959332
  const query = `SELECT * FROM ${name} WHERE id > ? LIMIT ?`;
  const rows = db.prepare(query).all((page - 1) * limit, limit);

  res.json({
    next:
      rows.length === parseInt(limit)
        ? `/tables/${name}?page=${parseInt(page) + 1}`
        : null,
    count: db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get().count,
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
