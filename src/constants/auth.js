module.exports = {
  SALT_ROUNDS: 10,
  ACCESS_TOKEN_SUBJECT: 'accessToken',
  REFRESH_TOKEN_SUBJECT: 'refreshToken',
  REVOKED_REFRESH_TOKENS_REMOVAL_TIME_RANGE: 3 * 24 * 60 * 60 * 1000, // 3 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds =
};
