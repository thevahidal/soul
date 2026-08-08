const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const supertest = require('supertest');

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

  const loadWithExtensionsDir = (apiJsContent) => {
    extensionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soul-ext-'));
    fs.writeFileSync(path.join(extensionsDir, 'api.js'), apiJsContent);

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
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const app = express();
    await setupExtensions(app, {});

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('No extensions directory'),
    );
    logSpy.mockRestore();
  });

  it('registers GET/POST/PUT/DELETE routes from an api.js extension, each with db access', async () => {
    const setupExtensions = loadWithExtensionsDir(`
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
        unknownMethodRoute: {
          method: 'PATCH',
          path: '/ext/patch',
          handler: (req, res, db) => res.json({ method: 'PATCH', hasDb: !!db }),
        },
      };
    `);

    const app = express();
    const fakeDb = { marker: 'the-real-db' };
    await setupExtensions(app, fakeDb);

    const agent = supertest(app);

    const get = await agent.get('/ext/get');
    expect(get.body).toEqual({ method: 'GET', hasDb: true });

    const post = await agent.post('/ext/post');
    expect(post.body).toEqual({ method: 'POST', hasDb: true });

    const put = await agent.put('/ext/put');
    expect(put.body).toEqual({ method: 'PUT', hasDb: true });

    const del = await agent.delete('/ext/delete');
    expect(del.body).toEqual({ method: 'DELETE', hasDb: true });

    // unsupported methods (anything outside GET/POST/PUT/DELETE) are
    // silently skipped -- not registered as a route at all.
    const patch = await agent.patch('/ext/patch');
    expect(patch.status).toBe(404);
  });

  it('ignores non-api.js files in the extensions directory', async () => {
    extensionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soul-ext-'));
    fs.writeFileSync(
      path.join(extensionsDir, 'readme.md'),
      '# not an extension',
    );

    jest.resetModules();
    jest.doMock('./config', () => ({
      ...jest.requireActual('./config'),
      extensions: { path: extensionsDir },
    }));
    const { setupExtensions } = require('./extensions');

    const app = express();
    await expect(setupExtensions(app, {})).resolves.not.toThrow();
  });
});
