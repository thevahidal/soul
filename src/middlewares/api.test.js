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

const run = async (method) => {
  const req = { params: { name: '_users' }, method };
  const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
  const next = jest.fn();
  await processRowRequest(req, res, next);
  return { res, next };
};

describe('processRowRequest', () => {
  it('allows GET on an auth-endpoint table with AUTH disabled', async () => {
    const { res, next } = await run('GET');

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'DELETE'])(
    'returns 403 on %s to an auth-endpoint table with AUTH disabled',
    async (method) => {
      const { res, next } = await run(method);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('AUTH'),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    },
  );
});
