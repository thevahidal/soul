const supertest = require('supertest');

const app = require('../index');
const { generateToken } = require('../utils');
const config = require('../config');

const requestWithSupertest = supertest(app);

describe('Tables Endpoints', () => {
  it('GET /tables should return a list of all tables', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
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

  it('POST /tables should reject creating a table with a reserved name', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .post('/api/tables')
      .set('Cookie', [`accessToken=${accessToken}`])
      .send({ name: '_users', schema: [{ name: 'x', type: 'TEXT' }] });

    expect(res.status).toEqual(409);
  });

  it('POST /tables should create a new table and return generated schema', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
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
      config.tokenSecret,
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

  it('GET /tables/:name includes foreignKeys for a table with a foreign key column', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    // "pets" is created earlier in this file with an `owner` column
    // referencing users(id).
    const res = await requestWithSupertest
      .get('/api/tables/pets')
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('foreignKeys');
    expect(res.body.foreignKeys).toEqual(expect.any(Array));

    const ownerForeignKey = res.body.foreignKeys.find(
      (fk) => fk.from === 'owner',
    );
    expect(ownerForeignKey).toMatchObject({
      table: 'users',
      to: 'id',
    });
  });

  it('GET /tables/:name returns an empty foreignKeys array for a table with no foreign keys', async () => {
    const accessToken = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const res = await requestWithSupertest
      .get('/api/tables/users')
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toEqual(200);
    expect(res.body.foreignKeys).toEqual([]);
  });

  describe('SQL injection regression', () => {
    it('safely escapes a malicious column default value instead of executing it', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .post('/api/tables')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          name: 'evil_defaults',
          schema: [
            {
              name: 'myfield',
              type: 'TEXT',
              default: "x'); DROP TABLE users; --",
            },
          ],
        });

      expect(res.status).toEqual(201);

      const usersStillExist = await requestWithSupertest
        .get('/api/tables/users')
        .set('Cookie', [`accessToken=${accessToken}`]);
      expect(usersStillExist.status).toEqual(200);
    });

    it('rejects a table name containing SQL metacharacters with a 400 before it reaches the query', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .get(`/api/tables/${encodeURIComponent('nope; DROP TABLE users;--')}`)
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toEqual(400);
    });

    it('returns a 404 (not a 500) for a syntactically valid but nonexistent table name on GET /tables/:name', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .get('/api/tables/totally-nonexistent-table')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toEqual(404);
    });

    it('rejects deleting a reserved system table', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .delete('/api/tables/_users')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toEqual(409);

      const usersStillExist = await requestWithSupertest
        .get('/api/tables/_users')
        .set('Cookie', [`accessToken=${accessToken}`]);
      expect(usersStillExist.status).toEqual(200);
    });

    it('rejects a crafted table name on DELETE with a 400 before it reaches the query', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .delete(
          `/api/tables/${encodeURIComponent('nope; DROP TABLE users;--')}`,
        )
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toEqual(400);
    });

    it('returns a 404 (not a 500) when deleting a syntactically valid but nonexistent table name', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .delete('/api/tables/totally-nonexistent-table')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toEqual(404);
    });
  });
});
