# Extensions Examples

Soul extensions are a way to extend the functionality of Soul. Extensions are written in JavaScript and can be used to add new endpoints, modify existing endpoints, or add new functionality to Soul.

## Types of Extensions

- API Extensions: Add new endpoints to Soul

## Setup Environment

To follow the below examples we need to download a sample database and also install Soul CLI.

### Download Sample Database

```bash
wget https://raw.githubusercontent.com/lerocha/chinook-database/master/ChinookDatabase/DataSources/Chinook_Sqlite.sqlite # Download sample sqlite database
```

### Using Soul CLI

```bash
npm install -g soul-cli
soul -d ./Chinook_Sqlite.sqlite -p 8000 -e "/absolute/path/to/_extensions/"
```

<details>
  <summary>Or Using Local Development</summary>

```bash
git clone https://github.com/thevahidal/soul # Clone project
npm install # Install dependencies
npm link # might need `sudo`
soul -d ./Chinook_Sqlite.sqlite -p 8000 -e "/absolute/path/to/_extensions/"
```

</details>

## Creating an API extension

To create an extension, create a new folder named `_extensions`. Inside it, add
one or more `.js` files containing your route definitions -- Soul loads
**every** `.js` file in the extensions directory (not just a single `api.js`),
and merges all their exported routes together. This lets you split routes
across files however makes sense for your project (e.g. `users.js`,
`reports.js`), instead of cramming everything into one file.

Each route definition supports:

- `method` -- any HTTP method Express supports (`GET`, `POST`, `PUT`,
  `DELETE`, `PATCH`, ...).
- `path` -- the Express route path.
- `handler(req, res, db)` -- your route handler. `db` is always the same
  `better-sqlite3` database instance Soul itself uses, so you can run your
  own queries against it.
- `auth` (optional) -- require authentication/authorization for this route,
  reusing the same checks Soul's core REST API uses. See
  [Protecting extension routes with `auth`](#protecting-extension-routes-with-auth)
  below.

```js
// _extensions/api.js
const hello = {
  method: "GET",
  path: "/api/hello-soul",
  handler: (req, res, db) => {
    res.status(200).json({
      message: "Hello Soul!",
    });
  },
};

const timestamp = {
  method: "GET",
  path: "/api/timestamp",
  handler: (req, res, db) => {
    res.status(200).json({
      timestamp: Date.now(),
    });
  },
};

const greetings = {
  method: "POST",
  path: "/api/greetings/:name",
  handler: (req, res, db) => {
    const { name } = req.params;
    const { greeting } = req.body;
    res.status(200).json({
      message: `${greeting} ${name}!`,
    });
  },
};

const searchTables = {
  method: "GET",
  path: "/api/search-tables",
  handler: (req, res, db) => {
    const { q } = req.query;
    const sql = `
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name LIKE $searchQuery
    `;
    try {
      const tables = db.prepare(sql).all({
        searchQuery: `%${q}%`,
      });
      res.status(200).json({
        tables,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },
};

module.exports = {
  hello,
  timestamp,
  greetings,
  searchTables,
};
```

Alright, now we can test if the extension is working:

```bash
curl http://localhost:8000/api/hello-soul
```

It should return:

```json
{
  "message": "Hello Soul!"
}
```

And the same for the `timestamp` endpoint:

```bash
curl http://localhost:8000/api/timestamp
```

It should return:

```json
{
  "timestamp": 1620000000000
}
```

And `greetings` endpoint:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"greeting": "Hello"}' http://localhost:8000/api/greetings/John
```

It should return:

```json
{
  "message": "Hello John!"
}
```

And `list-tables` endpoint:

```bash
curl http://localhost:8000/api/search-tables?q=al
```

It should return:

```json
{
  "tables": [
    {
      "name": "Album"
    }
  ]
}
```

## Protecting extension routes with `auth`

By default, extension routes are public, regardless of Soul's `AUTH` setting.
To require authentication (and optionally authorization), add an `auth`
field to the route definition. It accepts:

- `true` -- the request must have a valid access token. Any authenticated
  user is allowed in; the handler doesn't run for anyone else.
- `{ superuserOnly: true }` -- the request must have a valid access token
  **and** belong to a superuser.
- `{ table: 'tableName' }` -- the request must have a valid access token
  **and** have permission on `tableName` for the request's HTTP method,
  using the same role-based permission checks Soul's core `/api/:name`
  routes use (so a route guarded with `{ table: 'orders' }` follows
  whatever read/write permissions the caller's role already has on the
  `orders` table).

If `auth` is omitted, the route is public and `AUTH` has no effect on it.
If Soul's `AUTH` setting is off, all `auth`-guarded routes behave as if
`auth` were omitted (no token is required), matching how the core REST API
behaves when auth is disabled.

```js
// _extensions/admin.js
const purgeSessions = {
  method: "POST",
  path: "/api/admin/purge-sessions",
  auth: { superuserOnly: true },
  handler: (req, res, db) => {
    db.prepare("DELETE FROM _sessions").run();
    res.status(200).json({ message: "Sessions purged" });
  },
};

const myOrders = {
  method: "GET",
  path: "/api/my-orders",
  auth: { table: "orders" },
  handler: (req, res, db) => {
    // req.user is the decoded access token payload
    const orders = db
      .prepare("SELECT * FROM orders WHERE userId = ?")
      .all(req.user.id);
    res.status(200).json({ orders });
  },
};

module.exports = {
  purgeSessions,
  myOrders,
};
```

Calling `purge-sessions` without a token returns a `401`:

```bash
curl -i -X POST http://localhost:8000/api/admin/purge-sessions
```

Calling it with a valid, non-superuser token returns a `403`; with a
superuser's token, it runs the handler and returns `200`.
