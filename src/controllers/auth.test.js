const supertest = require('supertest');

const app = require('../index');
const config = require('../config');
const { generateToken } = require('../utils');
const { testData } = require('../tests/testData');

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
        'This password is weak, please use another password',
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
  });
});
