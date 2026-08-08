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
});
