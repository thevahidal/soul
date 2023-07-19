const supertest = require('supertest');

const app = require('../index');
const requestWithSupertest = supertest(app);

describe('Rows Endpoints', () => {
  it('GET /tables/:name/rows should return a list of all rows', async () => {
    const res = await requestWithSupertest.get('/api/tables/users/rows');

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');
  });

  it('GET /tables/:name/rows?_limit=8&_schema=firstName,lastName&_ordering:-firstName&_page=2: should query the rows by the provided query params', async () => {
    const baseUrl = '/api/tables/users/rows';
    const params = {
      _limit: 8,
      _schema: 'firstName,lastName',
      _ordering: '-firstName',
      _search: 'a',
      _page: 2,
    };

    const res = await requestWithSupertest.get(
      `${baseUrl}?${new URLSearchParams(params).toString()}`
    );

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');

    expect(res.body.next).toEqual(
      `${baseUrl}?${new URLSearchParams({
        ...params,
        _page: params._page + 1,
      }).toString()}`
    );

    expect(res.body.previous).toEqual(
      `${baseUrl}?${new URLSearchParams({
        ...params,
        _page: params._page - 1,
      }).toString()}`
    );
  });

  it('POST /tables/:name/rows should insert a new row and return the lastInsertRowid', async () => {
    const res = await requestWithSupertest
      .post('/api/tables/users/rows')
      .send({ fields: { firstName: 'Jane', lastName: 'Doe' } });
    expect(res.status).toEqual(201);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
  });

  it('GET /tables/:name/rows/:pks should return a row by its primary key', async () => {
    const res = await requestWithSupertest.get('/api/tables/users/rows/1');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');
  });

  it('PUT /tables/:name/rows/:pks should update a row by its primary key and return the number of changes', async () => {
    const res = await requestWithSupertest
      .put('/api/tables/users/rows/1')
      .send({ fields: { firstName: 'Jane', lastName: 'Doe' } });
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
  });

  it('DELETE /tables/:name/rows/:pks should delete a row by its primary key and return the number of changes', async () => {
    const res = await requestWithSupertest.delete('/api/tables/users/rows/1');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
  });
});
