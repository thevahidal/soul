const { not } = require('joi');
const supertest = require('supertest');

const app = require('../index');
const config = require('../config');
const { generateToken } = require('../utils');

const requestWithSupertest = supertest(app);

function queryString(params) {
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return queryString;
}

describe('Rows Endpoints', () => {
  it('GET /tables/:name/rows should return a list of all rows', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .get('/api/tables/users/rows')
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');
  });

  it('GET /tables/:name/rows?_limit=8&_schema=firstName,lastName&_ordering:-firstName&_page=2: should query the rows by the provided query params', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const params = {
      _search: 'a',
      _ordering: '-firstName',
      _schema: 'firstName,lastName',
      _limit: 8,
      _page: 2,
    };
    const query = queryString(params);
    const res = await requestWithSupertest
      .get(`/api/tables/users/rows?${query}`)
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');

    expect(res.body.next).toEqual(
      `/tables/users/rows?${queryString({
        ...params,
        _page: params._page + 1,
      }).toString()}`,
    );

    expect(res.body.previous).toEqual(
      `/tables/users/rows?${queryString({
        ...params,
        _page: params._page - 1,
      }).toString()}`,
    );
  });

  it('GET /tables/:name/rows?_ordering:firstName: should query the rows by the provided query params', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const params = {
      _ordering: '-firstName',
    };
    const query = queryString(params);
    const res = await requestWithSupertest
      .get(`/api/tables/users/rows?${query}`)
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));

    // expect(res.body.next).toEqual(
    //   `/tables/users/rows?${queryString({
    //     ...params,
    //     _page: params._page + 1,
    //   }).toString()}`,
    // );
    //
    // expect(res.body.previous).toEqual(
    //   `/tables/users/rows?${queryString({
    //     ...params,
    //     _page: params._page - 1,
    //   }).toString()}`,
    // );
  });

  it('GET /tables/:name/rows: should return a null field', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .get('/api/tables/users/rows?_filters=firstName__null,lastName__notnull')
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.body.data[0].firstName).toBeNull();
    expect(res.body.data[0].lastName).not.toBeNull();
  });

  it('GET /tables/:name/rows: should successfully retrieve users created after 2010-01-01 00:00:00.', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const date = '2010-01-01 00:00:00';
    const res = await requestWithSupertest
      .get(`/api/tables/users/rows?_filters=createdAt__gte:${date}`)
      .set('Cookie', [`accessToken=${accessToken}`]);

    res.body.data.map((user) => {
      const createdAt = new Date(user.createdAt);
      const referenceDate = new Date(date);
      expect(createdAt.getTime()).toBeGreaterThan(referenceDate.getTime());
    });

    expect(res.status).toEqual(200);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');
    expect(res.body.data[0]).toHaveProperty('createdAt');
  });

  it('GET /tables/:name/rows: should successfully retrieve users created before 2008-01-20 00:00:00.', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const date = '2008-01-20 00:00:00';
    const res = await requestWithSupertest
      .get(`/api/tables/users/rows?_filters=createdAt__lte:${date}`)
      .set('Cookie', [`accessToken=${accessToken}`]);

    res.body.data.map((user) => {
      const createdAt = new Date(user.createdAt);
      const referenceDate = new Date(date);
      expect(createdAt.getTime()).toBeLessThan(referenceDate.getTime());
    });

    expect(res.status).toEqual(200);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');
    expect(res.body.data[0]).toHaveProperty('createdAt');
  });

  it('GET /tables/:name/rows: should successfully retrieve users created at 2013-01-08 00:00:00', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const date = '2013-01-08 00:00:00';
    const res = await requestWithSupertest
      .get(`/api/tables/users/rows?_filters=createdAt__eq:${date}`)
      .set('Cookie', [`accessToken=${accessToken}`]);

    res.body.data.map((user) => {
      const createdAt = new Date(user.createdAt);
      const referenceDate = new Date(date);
      expect(createdAt.getTime()).toEqual(referenceDate.getTime());
    });

    expect(res.status).toEqual(200);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');
    expect(res.body.data[0]).toHaveProperty('createdAt');
  });

  it('GET /tables/:name/rows: should successfully retrieve users created at 2007-01-08 00:00:00', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const date = '2007-01-08 00:00:00';
    const res = await requestWithSupertest
      .get(`/api/tables/users/rows?_filters=createdAt__eq:${date}`)
      .set('Cookie', [`accessToken=${accessToken}`]);

    //There are no users that are created at 2007-01-08 00:00:00 so the API should return empty data
    expect(res.body.data).toHaveLength(0);
    expect(res.status).toEqual(200);
  });

  it('GET /tables/:name/rows: should successfully retrieve users that are not created at 2021-01-08 00:00:00', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const date = '2021-01-08 00:00:00';
    const res = await requestWithSupertest
      .get(`/api/tables/users/rows?_filters=createdAt__neq:${date}`)
      .set('Cookie', [`accessToken=${accessToken}`]);

    res.body.data.map((user) => {
      const createdAt = new Date(user.createdAt);
      const referenceDate = new Date(date);
      expect(createdAt.getTime()).not.toEqual(referenceDate.getTime());
    });

    expect(res.status).toEqual(200);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');
    expect(res.body.data[0]).toHaveProperty('createdAt');
  });

  it('POST /tables/:name/rows should insert a new row and return the lastInsertRowid', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .post('/api/tables/users/rows')
      .set('Cookie', [`accessToken=${accessToken}`])
      .send({ fields: { firstName: 'Jane', lastName: 'Doe' } });

    expect(res.status).toEqual(201);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
  });

  it('GET /tables/:name/rows/:pks should return a row by its primary key', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .get('/api/tables/users/rows/1')
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('firstName');
    expect(res.body.data[0]).toHaveProperty('lastName');
  });

  it('PUT /tables/:name/rows/:pks should update a row by its primary key and return the number of changes', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );
    const res = await requestWithSupertest
      .put('/api/tables/users/rows/1')
      .set('Cookie', [`accessToken=${accessToken}`])
      .send({ fields: { firstName: 'Jane', lastName: 'Doe' } });
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
  });

  it('DELETE /tables/:name/rows/:pks should delete a row by its primary key and return the number of changes', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .delete('/api/tables/users/rows/1')
      .set('Cookie', [`accessToken=${accessToken}`]);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
  });

  it('POST /tables/:name/rows should insert a new row if any of the value of the object being inserted is null', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );
    const res = await requestWithSupertest
      .post('/api/tables/users/rows')
      .send({
        fields: {
          firstName: null,
          lastName: 'Doe',
          email: null,
          username: 'Jane',
        },
      })
      .set('Cookie', [`accessToken=${accessToken}`]);
    expect(res.status).toEqual(201);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
  });

  it('GET /tables/:name/rows should return values if any of the IDs from the array match the user ID.', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .get('/api/tables/users/rows?_filters=id:[2,3]')
      .set('Cookie', [`accessToken=${accessToken}`]);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data.length).toEqual(2);
  });

  it('GET /tables/:name/rows should return values if the provided ID matches the user ID.', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .get(
        '/api/tables/users/rows?_filters=id:2,firstName:Michael,lastName:Lee',
      )
      .set('Cookie', [`accessToken=${accessToken}`]);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data.length).toEqual(1);
  });
});
