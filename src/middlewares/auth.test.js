jest.mock('../config', () => ({ auth: false, tokenSecret: 'test-secret' }));
jest.mock('../utils/index', () => ({ decodeToken: jest.fn() }));
jest.mock('../utils/logger', () => ({ error: jest.fn() }));
jest.mock('../services', () => ({
  authService: { hasTablePermission: jest.fn() },
}));

const config = require('../config');
const { decodeToken } = require('../utils/index');
const { authService } = require('../services');
const { hasAccess } = require('./auth');

describe('hasAccess', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    config.auth = false;
    req = {
      params: {},
      method: 'GET',
      originalUrl: '/api/tables/items/rows',
      cookies: {},
    };
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    next = jest.fn();
  });

  it('calls next() without checking anything when auth is disabled', async () => {
    config.auth = false;

    await hasAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(decodeToken).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the access token is missing/invalid', async () => {
    config.auth = true;
    decodeToken.mockRejectedValue(new Error('invalid token'));

    await hasAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access to universal endpoints once authenticated, regardless of table permission', async () => {
    config.auth = true;
    decodeToken.mockResolvedValue({ userId: 1, isSuperuser: false });
    req.originalUrl = '/api/auth/change-password';

    await hasAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(authService.hasTablePermission).not.toHaveBeenCalled();
  });

  it('calls next() when the permission check passes', async () => {
    config.auth = true;
    const payload = { userId: 1, isSuperuser: true };
    decodeToken.mockResolvedValue(payload);
    authService.hasTablePermission.mockReturnValue(true);
    req.params.name = 'items';

    await hasAccess(req, res, next);

    expect(authService.hasTablePermission).toHaveBeenCalledWith({
      payload,
      tableName: 'items',
      verb: 'GET',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when the permission check fails', async () => {
    config.auth = true;
    decodeToken.mockResolvedValue({
      userId: 1,
      isSuperuser: false,
      roleIds: [1],
    });
    authService.hasTablePermission.mockReturnValue(false);
    req.params.name = 'items';

    await hasAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 and logs when an unexpected error is thrown', async () => {
    config.auth = true;
    decodeToken.mockResolvedValue({ userId: 1, isSuperuser: true });
    authService.hasTablePermission.mockImplementation(() => {
      throw new Error('boom');
    });

    await hasAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ message: 'boom' });
  });
});
