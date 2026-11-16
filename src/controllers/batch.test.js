const supertest = require('supertest');

const app = require('../index');
const config = require('../config');
const db = require('../db/index');
const { generateToken } = require('../utils');
const { websocketSubscribers } = require('../websocket');

const requestWithSupertest = supertest(app);

const tokenFor = (payload) => generateToken(payload, config.tokenSecret, '1H');

const postBatch = async (operations, payload = { isSuperuser: true }) =>
  requestWithSupertest
    .post('/api/batch')
    .set('Cookie', [`accessToken=${await tokenFor(payload)}`])
    .send({ operations });

const countUsers = (firstName) =>
  db
    .prepare('SELECT COUNT(*) AS total FROM users WHERE firstName = ?')
    .get(firstName).total;

const insertUser = (firstName) => ({
  method: 'POST',
  path: '/api/tables/users/rows',
  body: { fields: { firstName } },
});

describe('POST /api/batch', () => {
  it('applies every operation and returns results in order', async () => {
    const res = await postBatch([
      insertUser('BatchOk'),
      {
        method: 'PUT',
        path: '/api/tables/users/rows/1',
        body: { fields: { lastName: 'BatchUpdated' } },
      },
      insertUser('BatchOkTwo'),
    ]);

    expect(res.status).toEqual(200);
    expect(res.body.results.map((r) => r.status)).toEqual([201, 200, 201]);
    expect(countUsers('BatchOk')).toEqual(1);
    expect(countUsers('BatchOkTwo')).toEqual(1);
    expect(
      db.prepare('SELECT lastName FROM users WHERE id = 1').get().lastName,
    ).toEqual('BatchUpdated');
  });

  it('supports delete and _lookup_field', async () => {
    db.prepare("INSERT INTO users (firstName) VALUES ('BatchDelete')").run();

    const res = await postBatch([
      {
        method: 'DELETE',
        path: '/api/tables/users/rows/BatchDelete?_lookup_field=firstName',
      },
    ]);

    expect(res.status).toEqual(200);
    expect(countUsers('BatchDelete')).toEqual(0);
  });

  it('rolls back everything when an operation fails', async () => {
    const res = await postBatch([
      insertUser('BatchRollback'),
      {
        method: 'PUT',
        path: '/api/tables/users/rows/1',
        body: { fields: { nope: 'x' } },
      },
    ]);

    expect(res.status).toEqual(400);
    expect(res.body.index).toEqual(1);
    expect(countUsers('BatchRollback')).toEqual(0);
  });

  it('rolls back when a delete matches no rows', async () => {
    const res = await postBatch([
      insertUser('BatchRollbackDelete'),
      { method: 'DELETE', path: '/api/tables/users/rows/999999' },
    ]);

    expect(res.status).toEqual(404);
    expect(res.body).toMatchObject({ index: 1, error: 'not_found' });
    expect(countUsers('BatchRollbackDelete')).toEqual(0);
  });

  it.each([
    ['an unsupported path', { method: 'POST', path: '/api/other' }],
    [
      'a reserved table',
      {
        method: 'POST',
        path: '/api/tables/_users/rows',
        body: { fields: { username: 'x' } },
      },
    ],
    ['a missing pk', { method: 'PUT', path: '/api/tables/users/rows' }],
    [
      'an unknown table',
      insertUser('x') && {
        method: 'POST',
        path: '/api/tables/missing_table/rows',
        body: { fields: { a: 1 } },
      },
    ],
  ])('rejects %s', async (_, operation) => {
    const res = await postBatch([insertUser('BatchRejected'), operation]);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.index).toEqual(1);
    expect(countUsers('BatchRejected')).toEqual(0);
  });

  it('rejects an invalid body', async () => {
    const empty = await postBatch([]);
    const badMethod = await postBatch([{ method: 'GET', path: '/x' }]);

    expect(empty.status).toEqual(400);
    expect(badMethod.status).toEqual(400);
  });

  it('rejects more than 100 operations', async () => {
    const res = await postBatch(
      Array.from({ length: 101 }, () => insertUser('BatchTooMany')),
    );

    expect(res.status).toEqual(400);
    expect(countUsers('BatchTooMany')).toEqual(0);
  });

  it('returns 401 without a token', async () => {
    const res = await requestWithSupertest
      .post('/api/batch')
      .send({ operations: [insertUser('BatchNoToken')] });

    expect(res.status).toEqual(401);
  });

  it('returns 403 and writes nothing when a table is not permitted', async () => {
    const res = await postBatch([insertUser('BatchForbidden')], {
      isSuperuser: false,
      roleIds: [],
    });

    expect(res.status).toEqual(403);
    expect(res.body.index).toEqual(0);
    expect(countUsers('BatchForbidden')).toEqual(0);
  });

  describe('broadcasts', () => {
    const send = jest.fn();

    beforeEach(() => {
      send.mockClear();
      websocketSubscribers.set('users', new Set([{ ws: { send } }]));
    });

    afterEach(() => websocketSubscribers.delete('users'));

    it('sends events after a successful commit', async () => {
      await postBatch([insertUser('BatchEvent')]);

      expect(send).toHaveBeenCalledTimes(1);
      expect(JSON.parse(send.mock.calls[0][0]).type).toEqual('INSERT');
    });

    it('sends nothing when the batch is rolled back', async () => {
      await postBatch([
        insertUser('BatchNoEvent'),
        { method: 'DELETE', path: '/api/tables/users/rows/999999' },
      ]);

      expect(send).not.toHaveBeenCalled();
    });
  });
});
