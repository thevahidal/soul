const { checkAuthConfigs } = require('./common');

describe('checkAuthConfigs', () => {
  it('throws when auth is enabled but no token secret is provided', () => {
    expect(() =>
      checkAuthConfigs({ auth: true, tokenSecret: undefined }),
    ).toThrow(
      'You need to provide a token secret either from the CLI or from your environment variables',
    );
  });

  it('does not throw when auth is enabled and a token secret is provided', () => {
    expect(() =>
      checkAuthConfigs({ auth: true, tokenSecret: 'some-secret' }),
    ).not.toThrow();
  });

  it('does not throw when auth is disabled, regardless of token secret', () => {
    expect(() =>
      checkAuthConfigs({ auth: false, tokenSecret: undefined }),
    ).not.toThrow();
  });
});
