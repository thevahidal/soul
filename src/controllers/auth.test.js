const supertest = require('supertest');

const app = require('../index');
const requestWithSupertest = supertest(app);

describe('Auth Endpoints', () => {
  it('POST /api/_users should insert a new user and return the lastInsertRowid', async () => {
    const res = await requestWithSupertest.post('/api/_users').send({
      fields: {
        first_name: 'John',
        last_name: 'Doe',
        user_name: 'john',
        password: '12345678'
      }
    });

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
  });

  it('POST /api/token should should send a username and password and return an access token ', async () => {
    const res = await requestWithSupertest.post('/api/token').send({
      fields: {
        user_name: 'john',
        password: '12345678'
      }
    });

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
  });
});
