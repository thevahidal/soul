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
cd core/
npm install # Install dependencies
npm link # might need `sudo` 
soul -d ./Chinook_Sqlite.sqlite -p 8000 -e "/absolute/path/to/_extensions/"
```
</details>


## Creating an API extension

To create an extension, create a new folder named `_extensions`. Then create a file named `api.js` inside it. This file will contain the extension code.

```js
const hello = {
  method: 'GET',
  path: '/api/hello-soul',
  handler: (req, res, db) => {
    res.status(200).json({ 
        message: 'Hello Soul!'
    });
  },
};

const timestamp = {
  method: 'GET',
  path: '/api/timestamp',
  handler: (req, res, db) => {
    res.status(200).json({
        timestamp: Date.now(),
    });
  },
};

const greetings = {
  method: 'POST',
  path: '/api/greetings/:name',
  handler: (req, res, db) => {
    const { name } = req.params;
    const { greeting } = req.body;
    res.status(200).json({
        message: `${greeting} ${name}!`,
    });
  },
}

const searchTables = {
  method: 'GET',
  path: '/api/search-tables',
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
