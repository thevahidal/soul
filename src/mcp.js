const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const FILTERS_HELP =
  'Comma-separated, ANDed. e.g. "name:John,age__gte:20,id:[1,2],(a:1|b__null),!city:Paris". ' +
  'Operators after __: eq neq lt gt lte gte null notnull like contains startswith between in notin. ' +
  'Wrap a value in double quotes to use , : | ( ) in it.';

const createClient = ({
  url = 'http://localhost:8000',
  username,
  password,
  fetchFn = fetch,
}) => {
  const base = url.replace(/\/$/, '');
  const cookies = new Map();

  const storeCookies = (res) => {
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  };

  const send = async (method, path, body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (cookies.size > 0) {
      headers.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    }
    const res = await fetchFn(`${base}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    storeCookies(res);
    return res;
  };

  const login = async () => {
    if (!username || !password) {
      return false;
    }
    const res = await send('POST', '/auth/token/obtain', {
      fields: { username, password },
    });
    return res.ok;
  };

  const request = async (method, path, body) => {
    let res = await send(method, path, body);

    // expired access token: refresh once, fall back to a fresh login
    if (res.status === 401 && username && password) {
      const refreshed = cookies.has('refreshToken')
        ? (await send('GET', '/auth/token/refresh')).ok
        : false;
      if (refreshed || (await login())) {
        res = await send(method, path, body);
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Soul returned ${res.status}`);
    }
    return data;
  };

  return { request, login };
};

const toResult = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data) }],
});

const toError = (error) => ({
  isError: true,
  content: [{ type: 'text', text: error.message }],
});

const queryString = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      search.set(key, value);
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

const table = z.string().describe('Table name');
const pks = z
  .string()
  .describe('Primary key value(s), comma-separated for several rows');
const lookupField = z
  .string()
  .optional()
  .describe('Column to match pks against (defaults to the primary key)');

const createMcpServer = (options = {}) => {
  const client = createClient(options);
  const server = new McpServer({ name: 'soul', version: '1.0.0' });

  const tool = (name, description, inputSchema, handler) => {
    server.registerTool(name, { description, inputSchema }, async (args) => {
      try {
        return toResult(await handler(args));
      } catch (error) {
        return toError(error);
      }
    });
  };

  tool('list_tables', 'List the tables and views of the database', {}, () =>
    client.request('GET', '/tables'),
  );

  tool('get_schema', 'Get the columns of a table', { table }, ({ table }) =>
    client.request('GET', `/tables/${encodeURIComponent(table)}`),
  );

  tool(
    'query_rows',
    'List rows of a table with filtering, search, ordering, pagination, distinct and group/aggregate',
    {
      table,
      filters: z.string().optional().describe(FILTERS_HELP),
      search: z
        .string()
        .optional()
        .describe('Case-insensitive search across all columns'),
      ordering: z
        .string()
        .optional()
        .describe('e.g. "name" or "-price" or "category,-price"'),
      schema: z
        .string()
        .optional()
        .describe('Comma-separated columns to return'),
      extend: z
        .string()
        .optional()
        .describe('Comma-separated foreign key columns to expand'),
      distinct: z
        .string()
        .optional()
        .describe('Comma-separated columns to return unique values of'),
      group_by: z.string().optional().describe('Column(s) to group by'),
      aggregate: z
        .string()
        .optional()
        .describe('e.g. "count,sum:price,avg:price,min:x,max:x"'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().optional(),
    },
    ({ table, page, limit, ...query }) =>
      client.request(
        'GET',
        `/tables/${encodeURIComponent(table)}/rows${queryString({
          _filters: query.filters,
          _search: query.search,
          _ordering: query.ordering,
          _schema: query.schema,
          _extend: query.extend,
          _distinct: query.distinct,
          _group_by: query.group_by,
          _aggregate: query.aggregate,
          _page: page,
          _limit: limit,
        })}`,
      ),
  );

  tool(
    'insert_row',
    'Insert a row into a table',
    { table, fields: z.record(z.string(), z.any()).describe('Column values') },
    ({ table, fields }) =>
      client.request('POST', `/tables/${encodeURIComponent(table)}/rows`, {
        fields,
      }),
  );

  tool(
    'update_row',
    'Update the row(s) with the given primary key(s)',
    {
      table,
      pks,
      lookup_field: lookupField,
      fields: z.record(z.string(), z.any()).describe('Column values to set'),
    },
    ({ table, pks, lookup_field, fields }) =>
      client.request(
        'PUT',
        `/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(
          pks,
        )}${queryString({ _lookup_field: lookup_field })}`,
        { fields },
      ),
  );

  tool(
    'delete_row',
    'Delete the row(s) with the given primary key(s)',
    { table, pks, lookup_field: lookupField },
    ({ table, pks, lookup_field }) =>
      client.request(
        'DELETE',
        `/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(
          pks,
        )}${queryString({ _lookup_field: lookup_field })}`,
      ),
  );

  tool(
    'create_table',
    'Create a table. An id primary key and createdAt/updatedAt columns are added unless disabled.',
    {
      name: z.string().describe('Table name'),
      schema: z
        .array(
          z.object({
            name: z.string(),
            type: z.enum([
              'TEXT',
              'NUMERIC',
              'INTEGER',
              'REAL',
              'BLOB',
              'BOOLEAN',
              'DATE',
              'DATETIME',
            ]),
            notNull: z.boolean().optional(),
            unique: z.boolean().optional(),
            primaryKey: z.boolean().optional(),
            foreignKey: z
              .object({ table: z.string(), column: z.string() })
              .optional(),
          }),
        )
        .describe('Column definitions'),
      autoAddCreatedAt: z.boolean().optional(),
      autoAddUpdatedAt: z.boolean().optional(),
    },
    (body) => client.request('POST', '/tables', body),
  );

  return { server, client };
};

const parseArgs = (argv, env) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, '')] = argv[i + 1];
  }
  return {
    url: args.url || env.SOUL_URL,
    username: env.SOUL_USERNAME,
    password: env.SOUL_PASSWORD,
  };
};

module.exports = { createMcpServer, createClient, parseArgs };
