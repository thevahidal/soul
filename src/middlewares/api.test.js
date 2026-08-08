// config.auth is fixed to true for the whole test run (set via the npm test
// script), so the "AUTH is disabled but an auth-only table was requested"
// branch can only be exercised by mocking config directly. Other modules
// required transitively (e.g. src/db/index.js) still need a real-shaped
// config, so start from the actual module and only override `auth`.
jest.mock('../config', () => ({
  ...jest.requireActual('../config'),
  auth: false,
}));

const { processRowRequest } = require('./api');

describe('processRowRequest', () => {
  it('returns 403 when an auth-endpoint table is requested with AUTH disabled', async () => {
    const req = { params: { name: '_users' }, method: 'GET' };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await processRowRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('AUTH'),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
