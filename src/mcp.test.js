const http = require('http');

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');

const { createMcpServer, parseArgs } = require('./mcp');

let soul;
let url;
let requests;
let accessTokenValid;

const handler = (req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    requests.push({
      method: req.method,
      url: req.url,
      cookie: req.headers.cookie,
      body: body ? JSON.parse(body) : undefined,
    });
    const json = (status, data, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify(data));
    };

    if (req.url === '/api/auth/token/obtain') {
      accessTokenValid = true;
      return json(
        201,
        {},
        {
          'Set-Cookie': [
            'accessToken=a1; Path=/; HttpOnly',
            'refreshToken=r1; Path=/; HttpOnly',
          ],
        },
      );
    }
    if (req.url === '/api/auth/token/refresh') {
      accessTokenValid = true;
      return json(201, {}, { 'Set-Cookie': ['accessToken=a2; Path=/'] });
    }
    if (req.url === '/api/tables/secret') {
      return json(403, { message: 'Not authorized' });
    }
    if (req.url === '/api/tables/broken') {
      res.writeHead(500);
      return res.end('oops');
    }
    if (!accessTokenValid) {
      return json(401, { message: 'Invalid access token' });
    }
    json(200, { path: req.url, method: req.method });
  });
};

const connect = async (options) => {
  const { server, client: soulClient } = createMcpServer({ url, ...options });
  await soulClient.login();
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
};

const call = async (client, name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  return { ...result, data: JSON.parse(result.content[0].text) };
};

beforeAll(async () => {
  soul = http.createServer(handler);
  await new Promise((resolve) => soul.listen(0, resolve));
  url = `http://localhost:${soul.address().port}`;
});

afterAll(() => new Promise((resolve) => soul.close(resolve)));

beforeEach(() => {
  requests = [];
  accessTokenValid = true;
});

describe('MCP server', () => {
  it('lists the tools', async () => {
    const client = await connect({});
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'create_table',
      'delete_row',
      'get_schema',
      'insert_row',
      'list_tables',
      'query_rows',
      'update_row',
    ]);
  });

  it('list_tables and get_schema call the tables endpoints', async () => {
    const client = await connect({});
    await call(client, 'list_tables');
    await call(client, 'get_schema', { table: 'users' });
    expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      'GET /api/tables',
      'GET /api/tables/users',
    ]);
  });

  it('query_rows maps arguments to query params', async () => {
    const client = await connect({});
    await call(client, 'query_rows', {
      table: 'orders',
      filters: 'total__gte:5,(a:1|b__null)',
      ordering: '-total',
      group_by: 'country',
      aggregate: 'count,sum:total',
      page: 2,
      limit: 5,
    });
    const params = new URL(requests[0].url, 'http://x').searchParams;
    expect(params.get('_filters')).toBe('total__gte:5,(a:1|b__null)');
    expect(params.get('_ordering')).toBe('-total');
    expect(params.get('_group_by')).toBe('country');
    expect(params.get('_aggregate')).toBe('count,sum:total');
    expect(params.get('_page')).toBe('2');
    expect(params.get('_limit')).toBe('5');
    expect(params.has('_search')).toBe(false);
  });

  it('query_rows without options sends no query string', async () => {
    const client = await connect({});
    await call(client, 'query_rows', { table: 'orders' });
    expect(requests[0].url).toBe('/api/tables/orders/rows');
  });

  it('insert_row, update_row and delete_row call the rows endpoints', async () => {
    const client = await connect({});
    await call(client, 'insert_row', { table: 't', fields: { a: 1 } });
    await call(client, 'update_row', {
      table: 't',
      pks: '1,2',
      lookup_field: 'code',
      fields: { a: 2 },
    });
    await call(client, 'delete_row', { table: 't', pks: '3' });
    expect(requests.map((r) => ({ m: r.method, u: r.url, b: r.body }))).toEqual(
      [
        { m: 'POST', u: '/api/tables/t/rows', b: { fields: { a: 1 } } },
        {
          m: 'PUT',
          u: '/api/tables/t/rows/1%2C2?_lookup_field=code',
          b: { fields: { a: 2 } },
        },
        { m: 'DELETE', u: '/api/tables/t/rows/3', b: undefined },
      ],
    );
  });

  it('create_table posts the table definition', async () => {
    const client = await connect({});
    const body = {
      name: 'items',
      schema: [{ name: 'title', type: 'TEXT', notNull: true }],
    };
    await call(client, 'create_table', body);
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/tables',
      body,
    });
  });

  it("returns Soul's message as a tool error", async () => {
    const client = await connect({});
    const result = await client.callTool({
      name: 'get_schema',
      arguments: { table: 'secret' },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Not authorized');
  });

  it('falls back to a status message when the error has no JSON body', async () => {
    const client = await connect({});
    const result = await client.callTool({
      name: 'get_schema',
      arguments: { table: 'broken' },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Soul returned 500');
  });
});

describe('authentication', () => {
  it('logs in and sends the cookies on later requests', async () => {
    const client = await connect({ username: 'agent', password: 'pw' });
    await call(client, 'list_tables');
    expect(requests[0].body).toEqual({
      fields: { username: 'agent', password: 'pw' },
    });
    expect(requests[1].cookie).toBe('accessToken=a1; refreshToken=r1');
  });

  it('sends no cookies and does not log in without credentials', async () => {
    const client = await connect({});
    await call(client, 'list_tables');
    expect(requests).toHaveLength(1);
    expect(requests[0].cookie).toBeUndefined();
  });

  it('refreshes an expired access token and retries', async () => {
    const client = await connect({ username: 'agent', password: 'pw' });
    accessTokenValid = false;
    const { data } = await call(client, 'list_tables');
    expect(data.path).toBe('/api/tables');
    expect(requests.map((r) => r.url).slice(1)).toEqual([
      '/api/tables',
      '/api/auth/token/refresh',
      '/api/tables',
    ]);
  });

  it('logs in again when there is no refresh token', async () => {
    const client = await connect({ username: 'agent', password: 'pw' });
    accessTokenValid = false;
    // a fresh server instance that never logged in has no cookies
    const { server } = createMcpServer({
      url,
      username: 'agent',
      password: 'pw',
    });
    const other = new Client({ name: 'test', version: '1.0.0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(b), other.connect(a)]);
    requests = [];
    const { data } = await call(other, 'list_tables');
    expect(data.path).toBe('/api/tables');
    expect(requests.map((r) => r.url)).toEqual([
      '/api/tables',
      '/api/auth/token/obtain',
      '/api/tables',
    ]);
    expect(client).toBeDefined();
  });
});

describe('parseArgs', () => {
  it('reads the url flag and credentials from env', () => {
    expect(
      parseArgs(['--url', 'http://soul:9000'], {
        SOUL_USERNAME: 'a',
        SOUL_PASSWORD: 'b',
      }),
    ).toEqual({ url: 'http://soul:9000', username: 'a', password: 'b' });
  });

  it('falls back to SOUL_URL', () => {
    expect(parseArgs([], { SOUL_URL: 'http://x' }).url).toBe('http://x');
  });
});
