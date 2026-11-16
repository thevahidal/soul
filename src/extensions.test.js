const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const supertest = require('supertest');

// mirrors the real app's middleware setup closely enough for these tests
// -- auth-wrapped extension routes read req.cookies, which only exists
// with cookie-parser applied.
const createApp = () => express().use(cookieParser());

describe('setupExtensions', () => {
  let extensionsDir;

  afterEach(() => {
    if (extensionsDir) {
      fs.rmSync(extensionsDir, { recursive: true, force: true });
      extensionsDir = undefined;
    }
    jest.dontMock('./config');
    jest.resetModules();
  });

  const loadWithExtensionsDir = (files) => {
    extensionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soul-ext-'));
    Object.entries(files).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(extensionsDir, filename), content);
    });

    jest.resetModules();
    jest.doMock('./config', () => ({
      ...jest.requireActual('./config'),
      extensions: { path: extensionsDir },
    }));

    return require('./extensions').setupExtensions;
  };

  it('does nothing (just logs) when no extensions path is configured', async () => {
    jest.resetModules();
    jest.doMock('./config', () => ({
      ...jest.requireActual('./config'),
      extensions: { path: null },
    }));
    const { setupExtensions } = require('./extensions');
    const logger = require('./utils/logger');
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const app = createApp();
    await setupExtensions(app, {});

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('No extensions directory'),
    );
    infoSpy.mockRestore();
  });

  it('registers GET/POST/PUT/DELETE/PATCH routes, each with db access', async () => {
    const setupExtensions = loadWithExtensionsDir({
      'api.js': `
        module.exports = {
          getRoute: {
            method: 'GET',
            path: '/ext/get',
            handler: (req, res, db) => res.json({ method: 'GET', hasDb: !!db }),
          },
          postRoute: {
            method: 'POST',
            path: '/ext/post',
            handler: (req, res, db) => res.json({ method: 'POST', hasDb: !!db }),
          },
          putRoute: {
            method: 'PUT',
            path: '/ext/put',
            handler: (req, res, db) => res.json({ method: 'PUT', hasDb: !!db }),
          },
          deleteRoute: {
            method: 'DELETE',
            path: '/ext/delete',
            handler: (req, res, db) => res.json({ method: 'DELETE', hasDb: !!db }),
          },
          patchRoute: {
            method: 'PATCH',
            path: '/ext/patch',
            handler: (req, res, db) => res.json({ method: 'PATCH', hasDb: !!db }),
          },
        };
      `,
    });

    const app = createApp();
    const fakeDb = { marker: 'the-real-db' };
    await setupExtensions(app, fakeDb);

    const agent = supertest(app);

    expect((await agent.get('/ext/get')).body).toEqual({
      method: 'GET',
      hasDb: true,
    });
    expect((await agent.post('/ext/post')).body).toEqual({
      method: 'POST',
      hasDb: true,
    });
    expect((await agent.put('/ext/put')).body).toEqual({
      method: 'PUT',
      hasDb: true,
    });
    expect((await agent.delete('/ext/delete')).body).toEqual({
      method: 'DELETE',
      hasDb: true,
    });
    // PATCH used to be silently unsupported -- it's now handled generically
    // like any other method Express itself supports.
    expect((await agent.patch('/ext/patch')).body).toEqual({
      method: 'PATCH',
      hasDb: true,
    });
  });

  it('logs a warning and skips a route with a genuinely unsupported method', async () => {
    const setupExtensions = loadWithExtensionsDir({
      'api.js': `
        module.exports = {
          bogus: {
            method: 'FOOBAR',
            path: '/ext/bogus',
            handler: (req, res) => res.json({ ok: true }),
          },
        };
      `,
    });
    const logger = require('./utils/logger');
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const app = createApp();
    await setupExtensions(app, {});

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("unsupported method 'FOOBAR'"),
    );
    warnSpy.mockRestore();
  });

  it('merges routes from every .js file in the extensions directory, ignoring non-.js files', async () => {
    const setupExtensions = loadWithExtensionsDir({
      'users.js': `
        module.exports = {
          fromUsers: {
            method: 'GET',
            path: '/ext/from-users-file',
            handler: (req, res) => res.json({ file: 'users.js' }),
          },
        };
      `,
      'reports.js': `
        module.exports = {
          fromReports: {
            method: 'GET',
            path: '/ext/from-reports-file',
            handler: (req, res) => res.json({ file: 'reports.js' }),
          },
        };
      `,
      'readme.md': '# not an extension, should be ignored',
    });

    const app = createApp();
    await setupExtensions(app, {});
    const agent = supertest(app);

    expect((await agent.get('/ext/from-users-file')).body).toEqual({
      file: 'users.js',
    });
    expect((await agent.get('/ext/from-reports-file')).body).toEqual({
      file: 'reports.js',
    });
  });

  describe('auth-wrapped extension routes', () => {
    let generateToken;
    let realConfig;

    beforeAll(() => {
      // ensure the default tables/role exist for the table-scoped
      // permission test below, idempotently safe to call regardless of
      // what other test files have already done against the shared db.
      require('./index');
      generateToken = require('./utils').generateToken;
      realConfig = require('./config');
    });

    it('auth: true rejects a request with no access token', async () => {
      const setupExtensions = loadWithExtensionsDir({
        'api.js': `
          module.exports = {
            protectedRoute: {
              method: 'GET',
              path: '/ext/protected',
              auth: true,
              handler: (req, res) => res.json({ ok: true }),
            },
          };
        `,
      });
      const app = createApp();
      await setupExtensions(app, {});

      const res = await supertest(app).get('/ext/protected');
      expect(res.status).toBe(401);
    });

    it('auth: true allows any authenticated request', async () => {
      const setupExtensions = loadWithExtensionsDir({
        'api.js': `
          module.exports = {
            protectedRoute: {
              method: 'GET',
              path: '/ext/protected',
              auth: true,
              handler: (req, res) => res.json({ ok: true }),
            },
          };
        `,
      });
      const app = createApp();
      await setupExtensions(app, {});

      const token = await generateToken(
        { username: 'ext-user', isSuperuser: false, roleIds: [1] },
        realConfig.tokenSecret,
        '1H',
      );

      const res = await supertest(app)
        .get('/ext/protected')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(200);
    });

    it('auth: { superuserOnly: true } rejects a non-superuser', async () => {
      const setupExtensions = loadWithExtensionsDir({
        'api.js': `
          module.exports = {
            adminRoute: {
              method: 'GET',
              path: '/ext/admin',
              auth: { superuserOnly: true },
              handler: (req, res) => res.json({ ok: true }),
            },
          };
        `,
      });
      const app = createApp();
      await setupExtensions(app, {});

      const token = await generateToken(
        { username: 'ext-user', isSuperuser: false, roleIds: [1] },
        realConfig.tokenSecret,
        '1H',
      );

      const res = await supertest(app)
        .get('/ext/admin')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(403);
    });

    it('auth: { superuserOnly: true } allows a superuser', async () => {
      const setupExtensions = loadWithExtensionsDir({
        'api.js': `
          module.exports = {
            adminRoute: {
              method: 'GET',
              path: '/ext/admin',
              auth: { superuserOnly: true },
              handler: (req, res) => res.json({ ok: true }),
            },
          };
        `,
      });
      const app = createApp();
      await setupExtensions(app, {});

      const token = await generateToken(
        { username: 'ext-admin', isSuperuser: true },
        realConfig.tokenSecret,
        '1H',
      );

      const res = await supertest(app)
        .get('/ext/admin')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(200);
    });

    it('auth: { table } checks table permission for the request method', async () => {
      const setupExtensions = loadWithExtensionsDir({
        'api.js': `
          module.exports = {
            readUsers: {
              method: 'GET',
              path: '/ext/users-search',
              auth: { table: 'users' },
              handler: (req, res) => res.json({ ok: true }),
            },
            deleteUsers: {
              method: 'DELETE',
              path: '/ext/users-purge',
              auth: { table: 'users' },
              handler: (req, res) => res.json({ ok: true }),
            },
          };
        `,
      });
      const app = createApp();
      await setupExtensions(app, {});

      // the default role (role id 1) has read-only access to tables that
      // existed when it was created -- see createDefaultTables().
      const token = await generateToken(
        { username: 'ext-reader', isSuperuser: false, roleIds: [1] },
        realConfig.tokenSecret,
        '1H',
      );
      const cookie = [`accessToken=${token}`];

      const readRes = await supertest(app)
        .get('/ext/users-search')
        .set('Cookie', cookie);
      expect(readRes.status).toBe(200);

      const deleteRes = await supertest(app)
        .delete('/ext/users-purge')
        .set('Cookie', cookie);
      expect(deleteRes.status).toBe(403);
    });
  });
});
