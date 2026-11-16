const supertest = require('supertest');

const app = require('../index');
const config = require('../config');
const { generateToken } = require('../utils');
const { testData } = require('../tests/testData');
const { removeRevokedRefreshTokens } = require('./auth');
const { authService } = require('../services');

const requestWithSupertest = supertest(app);

describe('Auth Endpoints', () => {
  describe('User Endpoints', () => {
    it('POST /tables/_users/rows should register a user', async () => {
      const accessToken = await generateToken(
        { username: 'John', userId: 1, isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .post('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            username: testData.users.user1.username,
            password: testData.strongPassword,
          },
        });

      expect(res.status).toEqual(201);
      expect(res.type).toEqual(expect.stringContaining('json'));

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Row Inserted');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });

    it('POST /tables/_users/rows should throw 400 error if username is not passed', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .post('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: { password: testData.strongPassword },
        });

      expect(res.status).toEqual(400);
      expect(res.body.message).toBe('username is required');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });

    it('POST /tables/_users/rows should throw 400 error if password is not passed', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .post('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: { username: 'NoPasswordUser' },
        });

      expect(res.status).toEqual(400);
      expect(res.body.message).toBe('password is required');
    });

    it('POST /tables/_users/rows should return 500 for an unexpected database error', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .post('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            username: 'BogusFieldUser',
            password: testData.strongPassword,
            thisColumnDoesNotExist: 'x',
          },
        });

      expect(res.status).toEqual(500);
      expect(res.body.message).toBe('Server error');
    });

    it('POST /tables/_users/rows should throw 400 error if the password is not strong', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .post('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            username: testData.users.user2.username,
            password: testData.weakPassword,
          },
        });

      expect(res.status).toEqual(400);
      expect(res.body.message).toBe(
        'This password is weak, it should be at least 8 characters long and contain a combination of lowercase letters, uppercase letters, numbers, and special characters',
      );

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });

    it('POST /tables/_users/rows should throw 409 error if the username is taken', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .post('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            username: testData.users.user1.username,
            password: testData.strongPassword,
          },
        });

      expect(res.status).toEqual(409);
      expect(res.body.message).toBe('This username is taken');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });

    it('GET /tables/_users/rows should return list of users', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .get('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toEqual(200);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('username');
      expect(res.body.data[0]).toHaveProperty('is_superuser');
      expect(res.body.data[0]).toHaveProperty('createdAt');

      expect(res.body.data[0]).not.toHaveProperty('password');
      expect(res.body.data[0]).not.toHaveProperty('hashed_password');
      expect(res.body.data[0]).not.toHaveProperty('salt');
    });

    it('GET /tables/_users/rows/:id should retrive a single user', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .get('/api/tables/_users/rows/1')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toEqual(200);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('username');
      expect(res.body.data[0]).toHaveProperty('is_superuser');
      expect(res.body.data[0]).toHaveProperty('createdAt');

      expect(res.body.data[0]).not.toHaveProperty('password');
      expect(res.body.data[0]).not.toHaveProperty('hashed_password');
      expect(res.body.data[0]).not.toHaveProperty('salt');
    });

    it('PUT /tables/_users/rows/:id should update a user', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .put('/api/tables/_users/rows/1')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            username: testData.users.user3.username,
          },
        });

      expect(res.status).toEqual(200);
      expect(res.type).toEqual(expect.stringContaining('json'));

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Row updated');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });

    it('DELETE /tables/_users/rows/:id should remove a user', async () => {
      const accessToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .delete('/api/tables/_users/rows/2')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toEqual(400);
      expect(res.body.message).toBe('FOREIGN KEY constraint failed');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });
  });

  describe('Obtain Access Token Endpoint', () => {
    it('POST /auth/token/obtain should return an access token and refresh token values and a success message', async () => {
      const res = await requestWithSupertest
        .post('/api/auth/token/obtain')
        .send({
          fields: {
            username: testData.users.user1.username,
            password: testData.strongPassword,
          },
        });

      expect(res.status).toEqual(201);
      expect(res.type).toEqual(expect.stringContaining('json'));
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Success');

      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining('refreshToken='),
          expect.stringContaining('accessToken='),
        ]),
      );

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });

    it('POST /auth/token/obtain should throw a 401 error if the username does not exist in the DB', async () => {
      const res = await requestWithSupertest
        .post('/api/auth/token/obtain')
        .send({
          fields: {
            username: testData.invalidUsername,
            password: testData.strongPassword,
          },
        });

      expect(res.status).toEqual(401);
      expect(res.type).toEqual(expect.stringContaining('json'));
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Invalid username or password');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });

    it('POST /auth/token/obtain should throw a 401 error if the password is invalid', async () => {
      const res = await requestWithSupertest
        .post('/api/auth/token/obtain')
        .send({
          fields: {
            username: testData.users.user1.username,
            password: testData.invalidPassword,
          },
        });

      expect(res.status).toEqual(401);
      expect(res.type).toEqual(expect.stringContaining('json'));
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Invalid username or password');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });
  });

  describe('Refresh Access Token Endpoint', () => {
    it('GET /auth/token/refresh should refresh the access and refresh tokens', async () => {
      const refreshToken = await generateToken(
        { username: 'John', userId: 1, isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .get('/api/auth/token/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toEqual(200);
      expect(res.type).toEqual(expect.stringContaining('json'));
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Success');

      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining('refreshToken='),
          expect.stringContaining('accessToken='),
        ]),
      );
    });
  });

  describe('Change Password Endpoint', () => {
    it('PUT /auth/change-password/ should change a password', async () => {
      const accessToken = await generateToken(
        { username: 'John', userId: 2, isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .put('/api/auth/change-password')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            currentPassword: testData.strongPassword,
            newPassword: testData.strongPassword2,
          },
        });

      expect(res.status).toEqual(200);
      expect(res.type).toEqual(expect.stringContaining('json'));
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Password updated successfully');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');

      // check if the password is really updated
      const res2 = await requestWithSupertest
        .post('/api/auth/token/obtain')
        .send({
          fields: {
            username: testData.users.user1.username,
            password: testData.strongPassword2,
          },
        });

      expect(res2.status).toEqual(201);
      expect(res2.type).toEqual(expect.stringContaining('json'));
      expect(res2.body).toHaveProperty('message');
      expect(res2.body.message).toBe('Success');
    });

    it('PUT /auth/change-password/ should throw  401 error if the current password is not valid', async () => {
      const accessToken = await generateToken(
        { username: 'John', userId: 2, isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .put('/api/auth/change-password')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            currentPassword: testData.invalidPassword,
            newPassword: testData.strongPassword2,
          },
        });

      expect(res.status).toEqual(401);
      expect(res.type).toEqual(expect.stringContaining('json'));
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Invalid current password');

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('hashed_password');
      expect(res.body).not.toHaveProperty('salt');
    });

    it('PUT /auth/change-password/ should throw 401 if the user id in the token does not exist', async () => {
      const accessToken = await generateToken(
        { username: 'ghost', userId: 999999, isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .put('/api/auth/change-password')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            currentPassword: testData.strongPassword2,
            newPassword: testData.strongPassword,
          },
        });

      expect(res.status).toEqual(401);
      expect(res.body.message).toBe('User not found');
    });

    it('PUT /auth/change-password/ should throw 400 if the new password is weak', async () => {
      const accessToken = await generateToken(
        { username: 'John', userId: 2, isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .put('/api/auth/change-password')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          fields: {
            currentPassword: testData.strongPassword2,
            newPassword: testData.weakPassword,
          },
        });

      expect(res.status).toEqual(400);
      expect(res.body.message).toBe(
        'This password is weak, it should be at least 8 characters long and contain a combination of lowercase letters, uppercase letters, numbers, and special characters',
      );
    });
  });

  describe('Extended error paths', () => {
    let superuserToken;
    let noRoleUserId;

    beforeAll(async () => {
      superuserToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      // register a fresh non-superuser user, then strip their role
      // assignment so downstream tests can exercise the "role not found"
      // paths in both obtainAccessToken and refreshAccessToken.
      await requestWithSupertest
        .post('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({
          fields: {
            username: 'NoRoleUser',
            password: testData.strongPassword,
          },
        });

      const lookup = await requestWithSupertest
        .get('/api/tables/_users/rows?_filters=username__eq:NoRoleUser')
        .set('Cookie', [`accessToken=${superuserToken}`]);
      noRoleUserId = lookup.body.data[0].id;

      await requestWithSupertest
        .delete(
          `/api/tables/_users_roles/rows/${noRoleUserId}?_lookup_field=user_id`,
        )
        .set('Cookie', [`accessToken=${superuserToken}`]);
    });

    it('POST /auth/token/obtain returns 401 ROLE_NOT_FOUND_ERROR for a user with no role assigned', async () => {
      const res = await requestWithSupertest
        .post('/api/auth/token/obtain')
        .send({
          fields: { username: 'NoRoleUser', password: testData.strongPassword },
        });

      expect(res.status).toEqual(401);
      expect(res.body.message).toBe('Role not found for this user');
    });

    it('GET /auth/token/refresh returns 401 USER_NOT_FOUND_ERROR for a nonexistent user id', async () => {
      const refreshToken = await generateToken(
        { username: 'ghost', userId: 999999, isSuperuser: false },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .get('/api/auth/token/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toEqual(401);
      expect(res.body.message).toBe('User not found');
    });

    it('GET /auth/token/refresh returns 401 ROLE_NOT_FOUND_ERROR for a user with no role assigned', async () => {
      const refreshToken = await generateToken(
        { username: 'NoRoleUser', userId: noRoleUserId, isSuperuser: false },
        config.tokenSecret,
        '1H',
      );

      const res = await requestWithSupertest
        .get('/api/auth/token/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toEqual(401);
      expect(res.body.message).toBe('Role not found for this user');
    });

    it('GET /auth/token/refresh returns 403 for a malformed refresh token', async () => {
      const res = await requestWithSupertest
        .get('/api/auth/token/refresh')
        .set('Cookie', ['refreshToken=not-a-valid-token']);

      expect(res.status).toEqual(403);
      expect(res.body.message).toBe('Invalid refresh token');
    });

    it('GET /auth/logout clears cookies and revokes the refresh token', async () => {
      const loginRes = await requestWithSupertest
        .post('/api/auth/token/obtain')
        .send({
          fields: {
            username: testData.users.user1.username,
            password: testData.strongPassword2,
          },
        });

      const cookies = loginRes.headers['set-cookie'];
      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith('refreshToken='),
      );
      const accessTokenCookie = cookies.find((c) =>
        c.startsWith('accessToken='),
      );

      const logoutRes = await requestWithSupertest
        .get('/api/auth/logout')
        .set('Cookie', [refreshTokenCookie, accessTokenCookie]);

      expect(logoutRes.status).toEqual(200);
      expect(logoutRes.body.message).toBe('Logout successful');
      expect(logoutRes.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining('accessToken=;'),
          expect.stringContaining('refreshToken=;'),
        ]),
      );

      // using the now-revoked refresh token should be rejected
      const refreshRes = await requestWithSupertest
        .get('/api/auth/token/refresh')
        .set('Cookie', [refreshTokenCookie]);

      expect(refreshRes.status).toEqual(403);
      expect(refreshRes.body.message).toBe('Invalid refresh token');
    });

    it('GET /auth/logout returns 500 for a malformed refresh token', async () => {
      const res = await requestWithSupertest
        .get('/api/auth/logout')
        .set('Cookie', ['refreshToken=garbage', 'accessToken=garbage']);

      expect(res.status).toEqual(500);
      expect(res.body.message).toBe('Server error');
    });

    it('POST /tables/_roles_permissions/rows validates fields via customValidator', async () => {
      const res = await requestWithSupertest
        .post('/api/tables/_roles_permissions/rows')
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({
          fields: {
            role_id: 1,
            table_name: 'users',
            // missing create/read/update/delete
          },
        });

      expect(res.status).toEqual(400);
      expect(res.body.error).toBeDefined();
    });

    it('PUT /tables/_roles_permissions/rows/:pks validates fields via customValidator', async () => {
      const res = await requestWithSupertest
        .put('/api/tables/_roles_permissions/rows/1')
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({
          fields: {
            role_id: 1,
            table_name: 'users',
            // missing create/read/update/delete
          },
        });

      expect(res.status).toEqual(400);
      expect(res.body.error).toBeDefined();
    });

    it('POST /tables/_roles_permissions/rows accepts a fully-specified permission row', async () => {
      // a table created after the default role already has its baseline
      // permissions assigned, so it won't collide with the (role_id,
      // table_name) unique constraint the way an existing table would.
      await requestWithSupertest
        .post('/api/tables')
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({
          name: 'perm_test_table',
          schema: [{ name: 'x', type: 'TEXT' }],
        });

      const res = await requestWithSupertest
        .post('/api/tables/_roles_permissions/rows')
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({
          fields: {
            role_id: 1,
            table_name: 'perm_test_table',
            create: 0,
            read: 1,
            update: 0,
            delete: 0,
          },
        });

      expect(res.status).toEqual(201);
    });

    it('PUT /tables/_users/rows/:id strips is_superuser/hashed_password/salt from the request body', async () => {
      const before = await requestWithSupertest
        .get(`/api/tables/_users/rows/${noRoleUserId}`)
        .set('Cookie', [`accessToken=${superuserToken}`]);
      const originalIsSuperuser = before.body.data[0].is_superuser;

      const res = await requestWithSupertest
        .put(`/api/tables/_users/rows/${noRoleUserId}`)
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({
          fields: {
            username: 'NoRoleUserRenamed',
            is_superuser: 'true',
            hashed_password: 'attacker-controlled',
            salt: 'attacker-controlled',
          },
        });

      expect(res.status).toEqual(200);

      const after = await requestWithSupertest
        .get(`/api/tables/_users/rows/${noRoleUserId}`)
        .set('Cookie', [`accessToken=${superuserToken}`]);

      expect(after.body.data[0].is_superuser).toEqual(originalIsSuperuser);
    });

    it('removeRevokedRefreshTokens deletes only expired revoked tokens', () => {
      const expiredToken = 'expired-revoked-token';
      const freshToken = 'fresh-revoked-token';

      authService.saveRevokedRefreshToken({
        refreshToken: expiredToken,
        expiresAt: Math.floor(Date.now() / 1000) - 3600,
      });
      authService.saveRevokedRefreshToken({
        refreshToken: freshToken,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      });

      removeRevokedRefreshTokens();

      expect(
        authService.getRevokedRefreshToken({ refreshToken: expiredToken }),
      ).toHaveLength(0);
      expect(
        authService.getRevokedRefreshToken({ refreshToken: freshToken }),
      ).toHaveLength(1);
    });
  });

  describe('Cookie SameSite/Secure configuration', () => {
    const freshAppWith = (configOverrides) => {
      jest.resetModules();
      jest.doMock('../config', () => ({
        ...jest.requireActual('../config'),
        ...configOverrides,
      }));
      return require('../index');
    };

    afterEach(() => {
      jest.dontMock('../config');
      jest.resetModules();
    });

    it('defaults to SameSite=Lax with no Secure flag (unchanged from unset-attribute behavior)', async () => {
      const res = await supertest(app)
        .post('/api/auth/token/obtain')
        .send({
          fields: {
            username: testData.users.user1.username,
            password: testData.strongPassword2,
          },
        });

      expect(res.status).toEqual(201);
      const cookies = res.headers['set-cookie'];
      expect(cookies.every((cookie) => /SameSite=Lax/i.test(cookie))).toBe(
        true,
      );
      expect(cookies.some((cookie) => /Secure/i.test(cookie))).toBe(false);
    });

    it('honors a configured SameSite=None and Secure=true (cross-origin dev mode)', async () => {
      const crossOriginApp = freshAppWith({
        cookie: { sameSite: 'none', secure: true },
      });

      const res = await supertest(crossOriginApp)
        .post('/api/auth/token/obtain')
        .send({
          fields: {
            username: testData.users.user1.username,
            password: testData.strongPassword2,
          },
        });

      expect(res.status).toEqual(201);
      const cookies = res.headers['set-cookie'];
      expect(cookies.every((cookie) => /SameSite=None/i.test(cookie))).toBe(
        true,
      );
      expect(cookies.every((cookie) => /Secure/i.test(cookie))).toBe(true);
    });
  });

  describe('Multiple roles per user', () => {
    // Regression test for a bug where _users_roles' unique constraint was
    // declared as UNIQUE(user_id, user_id) instead of
    // UNIQUE(user_id, role_id), which made the DB reject a second role
    // assignment for any user -- contradicting docs/auth.md's "a user can
    // belong to any number of roles."
    it('allows assigning a second role to a user that already has one', async () => {
      const superuserToken = await generateToken(
        { username: 'John', isSuperuser: true },
        config.tokenSecret,
        '1H',
      );

      const userRes = await requestWithSupertest
        .post('/api/tables/_users/rows')
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({
          fields: {
            username: 'MultiRoleUser',
            password: testData.strongPassword,
          },
        });
      expect(userRes.status).toEqual(201);

      const userLookup = await requestWithSupertest
        .get('/api/tables/_users/rows?_filters=username__eq:MultiRoleUser')
        .set('Cookie', [`accessToken=${superuserToken}`]);
      const userId = userLookup.body.data[0].id;

      const roleRes = await requestWithSupertest
        .post('/api/tables/_roles/rows')
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({ fields: { name: 'second-role' } });
      expect(roleRes.status).toEqual(201);

      const roleLookup = await requestWithSupertest
        .get('/api/tables/_roles/rows?_filters=name__eq:second-role')
        .set('Cookie', [`accessToken=${superuserToken}`]);
      const secondRoleId = roleLookup.body.data[0].id;

      // The user already has the default role assigned automatically on
      // creation -- this second assignment previously violated the buggy
      // UNIQUE(user_id, user_id) constraint.
      const assignRes = await requestWithSupertest
        .post('/api/tables/_users_roles/rows')
        .set('Cookie', [`accessToken=${superuserToken}`])
        .send({ fields: { user_id: userId, role_id: secondRoleId } });
      expect(assignRes.status).toEqual(201);

      const userRoles = await requestWithSupertest
        .get(`/api/tables/_users_roles/rows?_filters=user_id__eq:${userId}`)
        .set('Cookie', [`accessToken=${superuserToken}`]);
      expect(userRoles.body.data).toHaveLength(2);
    });
  });
});
