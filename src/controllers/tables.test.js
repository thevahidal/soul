const supertest = require('supertest');

const app = require('../index');
const { generateToken } = require('../utils');
const config = require('../config');

const requestWithSupertest = supertest(app);

describe('Tables Endpoints', () => {
  it('GET /tables should return a list of all tables', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.accessTokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .get('/api/tables')
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
    expect(res.body.data[0]).toHaveProperty('name');
  });

  it('POST /tables should create a new table and return generated schema', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.accessTokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .post('/api/tables')
      .send({
        name: 'pets',
        autoAddCreatedAt: true,
        autoAddUpdatedAt: false,
        schema: [
          {
            name: 'owner',
            type: 'INTEGER',
            foreignKey: {
              table: 'users',
              column: 'id',
              onDelete: 'CASCADE',
              onUpdate: 'CASCADE',
            },
          },
          {
            name: 'name',
            type: 'TEXT',
            notNull: true,
          },
          {
            name: 'petId',
            unique: true,
            type: 'INTEGER',
          },
        ],
      })
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(201);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).toHaveProperty('schema');
    expect(res.body.data.schema).toEqual(expect.any(Array));
    expect(res.body.data.schema[0]).toHaveProperty('name');
    expect(res.body.data.schema[0]).toHaveProperty('cid');
  });

  it('GET /tables/:name should return schema of the table', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.accessTokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .get('/api/tables/users')
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual(expect.any(Array));
  });
});
