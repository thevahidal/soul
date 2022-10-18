const supertest = require('supertest');

const app = require('../index');
const requestWithSupertest = supertest(app);

describe('Root Endpoints', () => {
  it('GET / should return server version and timestamp', async () => {
    const res = await requestWithSupertest.get('/api');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('timestamp');
  });
});

describe('Transaction Endpoint', () => {
  it('POST /transaction should commit transaction and return an array of changes and lastInsertRowid', async () => {
    const res = await requestWithSupertest.post('/api/transaction').send({
      transaction: [
        {
          statement: `CREATE TABLE students (id INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT)`,
          values: {},
        },
        {
          statement: `INSERT INTO students (id, firstName, lastName) VALUES (:id, :firstName, :lastName)`,
          values: { id: 1, firstName: 'John', lastName: 'Doe' },
        },
        {
          query: `SELECT * FROM students`,
        },
      ],
    });

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data[0]).toHaveProperty('changes');
    expect(res.body.data[0]).toHaveProperty('lastInsertRowid');
  });
});
