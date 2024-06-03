const supertest = require('supertest');

const app = require('../index');
const requestWithSupertest = supertest(app);

describe('Root Endpoints', () => {
  it('GET / should return server version and timestamp', async () => {
    const res = await requestWithSupertest.get('/api');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('timestamp');
  });
});
