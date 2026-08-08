const http = require('http');
const WebSocket = require('ws');
const supertest = require('supertest');

const app = require('./index');
const { wss } = require('./websocket');
const { generateToken } = require('./utils');
const config = require('./config');

describe('websocket', () => {
  let server;
  let port;

  const wsUrl = (path) => `ws://localhost:${port}${path}`;

  beforeAll((done) => {
    server = http.createServer(app);
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    wss.close();
    server.close(done);
  });

  it('closes the connection with a message when the table does not exist', (done) => {
    const ws = new WebSocket(wsUrl('/ws/tables/does_not_exist'));

    ws.on('message', (message) => {
      const parsed = JSON.parse(message.toString());
      expect(parsed.message).toContain('does not exist');
    });

    ws.on('close', () => done());
  });

  it('rejects a connection with no access token when auth is enabled', (done) => {
    const ws = new WebSocket(wsUrl('/ws/tables/users'));

    ws.on('message', (message) => {
      const parsed = JSON.parse(message.toString());
      expect(parsed.message).toContain('Missing access token');
    });

    ws.on('close', () => done());
  });

  it('rejects a connection with an invalid access token', (done) => {
    const ws = new WebSocket(wsUrl('/ws/tables/users'), {
      headers: { Cookie: 'accessToken=not-a-valid-token' },
    });

    ws.on('message', (message) => {
      const parsed = JSON.parse(message.toString());
      expect(parsed.message).toContain('Invalid access token');
    });

    ws.on('close', () => done());
  });

  it('accepts a connection with a valid superuser access token', async () => {
    const token = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const ws = new WebSocket(wsUrl('/ws/tables/users'), {
      headers: { Cookie: `accessToken=${token}` },
    });

    const message = await new Promise((resolve) => {
      ws.on('message', (msg) => resolve(JSON.parse(msg.toString())));
    });

    expect(message.message).toContain('Subscribed to table "users"');
    ws.close();
  });

  it('broadcasts an INSERT to a subscribed client', async () => {
    const token = await generateToken(
      { username: 'John', isSuperuser: true },
      config.tokenSecret,
      '1H',
    );

    const ws = new WebSocket(wsUrl('/ws/tables/users'), {
      headers: { Cookie: `accessToken=${token}` },
    });

    // wait for the subscription confirmation before triggering the insert
    await new Promise((resolve) => ws.on('message', resolve));

    const broadcastPromise = new Promise((resolve) => {
      ws.on('message', (msg) => resolve(JSON.parse(msg.toString())));
    });

    await supertest(app)
      .post('/api/tables/users/rows')
      .set('Cookie', [`accessToken=${token}`])
      .send({ fields: { firstName: 'Broadcast', lastName: 'Test' } });

    const broadcastMessage = await broadcastPromise;

    expect(broadcastMessage.type).toBe('INSERT');
    expect(broadcastMessage.data).toMatchObject({
      firstName: 'Broadcast',
      lastName: 'Test',
    });

    ws.close();
  });
});
