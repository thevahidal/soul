const supertest = require('supertest');

describe('app bootstrap (src/index.js)', () => {
  // config is a singleton fixed for the whole test run (AUTH=true, no rate
  // limiting, non-wildcard CORS from .env or CI defaults) -- these branches
  // depend on config values that differ per-scenario, so build a fresh app
  // per test with a mocked config instead of relying on ambient env state
  // (which would also make wildcard-CORS coverage depend on whether a local
  // .env happens to be present).
  const freshAppWith = (configOverrides) => {
    jest.resetModules();
    jest.doMock('./config/index', () => ({
      ...jest.requireActual('./config/index'),
      ...configOverrides,
    }));
    return require('./index');
  };

  afterEach(() => {
    jest.dontMock('./config/index');
    jest.resetModules();
  });

  it('returns a sanitized 500 (no stack trace) for an unexpected error, via the global error handler', async () => {
    const app = require('./index');

    // malformed JSON is rejected by body-parser before any route handler
    // runs, so this exercises the global error middleware, not a
    // controller's own try/catch.
    const res = await supertest(app)
      .post('/api/tables')
      .set('Content-Type', 'application/json')
      .send('{ not valid json');

    expect(res.status).toBe(400);
    // a real stack trace is multi-line, with frames like
    // "at functionName (/path/to/file.js:12:34)" -- the parser's own
    // one-line message (safe to show for a 4xx) shouldn't be confused
    // with that.
    expect(res.body.message).not.toMatch(/\n\s*at .+:\d+:\d+/);
    expect(res.body).not.toHaveProperty('stack');
  });

  it('disables CORS credentials for a wildcard origin', async () => {
    const app = freshAppWith({ cors: { origin: ['*'] } });

    const res = await supertest(app)
      .get('/api/health')
      .set('Origin', 'http://example.com');

    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('enables CORS credentials for an explicit origin list', async () => {
    const app = freshAppWith({
      cors: { origin: ['http://trusted.example.com'] },
    });

    const res = await supertest(app)
      .get('/api/health')
      .set('Origin', 'http://trusted.example.com');

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://trusted.example.com',
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('applies rate limiting when enabled', async () => {
    const app = freshAppWith({
      rateLimit: { enabled: true, windowMs: 60000, max: 2 },
    });
    const agent = supertest(app);

    await agent.get('/api/health');
    await agent.get('/api/health');
    const limited = await agent.get('/api/health');

    expect(limited.status).toBe(429);
  });

  it('warns and skips default-table/initial-user setup when auth is disabled', async () => {
    jest.resetModules();
    jest.doMock('./config/index', () => ({
      ...jest.requireActual('./config/index'),
      auth: false,
    }));

    // the warning fires synchronously while ./index loads, so the spy has
    // to be attached (against this same fresh module registry) beforehand.
    const logger = require('./utils/logger');
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    require('./index');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('open mode'));
    warnSpy.mockRestore();
  });

  it('logs HTTP requests when verbose logging is enabled', async () => {
    const app = freshAppWith({ verbose: 'console' });

    const res = await supertest(app).get('/api/health');

    expect(res.status).toBe(200);
  });

  it('does not rate limit when disabled', async () => {
    const app = freshAppWith({ rateLimit: { enabled: false } });
    const agent = supertest(app);

    for (let i = 0; i < 5; i++) {
      const res = await agent.get('/api/health');
      expect(res.status).not.toBe(429);
    }
  });
});
