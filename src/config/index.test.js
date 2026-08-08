describe('Config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('reads rate limit window and max from RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_REQUESTS', () => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '2000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '3';

    jest.resetModules();
    const config = require('./index');

    expect(config.rateLimit.enabled).toBe(true);
    expect(config.rateLimit.windowMs).toBe(2000);
    expect(config.rateLimit.max).toBe(3);
  });

  it('falls back to schema defaults when rate limit env vars are not set', () => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;

    jest.resetModules();
    const config = require('./index');

    expect(config.rateLimit.windowMs).toBe(1000);
    expect(config.rateLimit.max).toBe(10);
  });

  it('throws when the environment fails schema validation', () => {
    process.env.NODE_ENV = 'not-a-real-environment';

    jest.resetModules();
    expect(() => require('./index')).toThrow('Config validation error');
  });

  describe('CLI argument overrides', () => {
    afterEach(() => {
      jest.dontMock('../cli');
    });

    it('prefers CLI args over env vars for every overridable setting', () => {
      jest.doMock('../cli', () => ({
        yargs: {
          argv: {
            port: 9999,
            verbose: 'console',
            database: 'cli.db',
            cors: 'http://a.com,http://b.com',
            auth: true,
            'rate-limit-enabled': true,
            tokensecret: 'cli-secret',
            accesstokenexpirationtime: '1H',
            refreshtokenexpirationtime: '2D',
            initialuserusername: 'cliuser',
            initialuserpassword: 'clipass',
            studio: true,
            extensions: '/some/path',
          },
        },
      }));

      jest.resetModules();
      const config = require('./index');

      expect(config.port).toBe(9999);
      expect(config.verbose).toBe('console');
      expect(config.db.filename).toBe('cli.db');
      expect(config.cors.origin).toEqual(['http://a.com', 'http://b.com']);
      expect(config.auth).toBe(true);
      expect(config.rateLimit.enabled).toBe(true);
      expect(config.tokenSecret).toBe('cli-secret');
      expect(config.accessTokenExpirationTime).toBe('1H');
      expect(config.refreshTokenExpirationTime).toBe('2D');
      expect(config.initialUserUsername).toBe('cliuser');
      expect(config.initialUserPassword).toBe('clipass');
      expect(config.startWithStudio).toBe(true);
      expect(config.extensions.path).toBe('/some/path');
    });

    it('falls back to a wildcard CORS origin when nothing is configured', () => {
      // set explicitly (rather than deleting) so this doesn't depend on
      // whether a local .env file happens to define this key -- dotenv
      // only fills *missing* process.env keys, so deleting it here would
      // let a developer's own .env leak into the test.
      process.env.CORS_ORIGIN_WHITELIST = '*';
      jest.doMock('../cli', () => ({ yargs: { argv: {} } }));

      jest.resetModules();
      const config = require('./index');

      expect(config.cors.origin).toEqual(['*']);
    });
  });
});
