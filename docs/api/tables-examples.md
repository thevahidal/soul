## Tables

### 1. List Tables

To list all tables we simply call `/tables` endpoint with `GET` method.

```bash
curl 'localhost:8000/api/tables'
```

Response

```json
{
  "data": [
    { "name": "Album" },
    { "name": "Artist" }
    // ...
  ]
}
```

#### Query Params

- `_search` e.g. `?_search=art`, to search between tables.
- `_ordering` e.g. `?_ordering=-name`, to order tables by name descending, or without `-` to sort ascending, e.g. `?_ordering=name`

Example with query params

```bash
curl 'localhost:8000/api/tables?_search=pl&_ordering=-name'
```

Response

```json
{
  "data": [
    { "name": "Playlist" },
    { "name": "PlaylistTrack" },
    { "name": "Employee" }
    // ...
  ]
}
```

### 2. Create Tables

To create a new table use the following `POST` endpoint.

```bash
curl --request POST \
  --url http://localhost:8000/api/tables \
  --header 'Content-Type: application/json' \
  --data '{
	"name": "pets",
	"autoAddCreatedAt": true,
	"autoAddUpdatedAt": false,
	"schema": [
		{
			"name": "name",
			"type": "Text",
			"index": true
		},
		{
			"name": "birth_date",
			"type": "Date",
			"notNull": true
		},
		{
			"name": "owner_id",
			"type": "Integer",
			"foreignKey": {
				"table": "artists",
				"column": "ArtistId",
				"onDelete": "CASCADE",
				"onUpdate": "CASCADE"
			}
		}
	]
}'

```

Response

```json
{
  "message": "Table created",
  "data": {
    "name": "pets",
    "schema": [
      {
        "cid": 0,
        "name": "createdAt",
        "type": "DATETIME",
        "notnull": 0,
        "dflt_value": "CURRENT_TIMESTAMP",
        "pk": 0
      },
      {
        "cid": 1,
        "name": "id",
        "type": "INTEGER",
        "notnull": 0,
        "dflt_value": null,
        "pk": 1
      },
      {
        "cid": 2,
        "name": "name",
        "type": "TEXT",
        "notnull": 0,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 3,
        "name": "birth_date",
        "type": "Date",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 4,
        "name": "owner_id",
        "type": "INTEGER",
        "notnull": 0,
        "dflt_value": null,
        "pk": 0
      }
    ]
  }
}
```

#### Body Params

- `name` e.g. `name: pets`, to be used as the table name
- `autoAddCreatedAt` e.g. `autoAddCreatedAt: false` to automatically add a created at field, default `true`
- `autoAddUpdatedAt` e.g. `autoAddCreatedAt: false` to automatically add a updated at field, default `true`
- `schema` e.g.

```json
"schema": [
	{
		"name": "name", // field name (required)
		"type": "TEXT", // field type (required) (one of `TEXT | NUMERIC | INTEGER | REAL | BLOB | BOOLEAN | DATE | DATETIME)
		"index": true, // should this field be indexed?
		"default": "John", // field default value
		"notNull": false, // should this field be non-nullable?
		"unique": false, // should this field be unique?
		"primaryKey": true // should this field be the primaryKey? if false Soul will add an auto-increment primary key field
	},
	{
		"name": "user_id",
		"foreignKey": {
			"table": "users", // foreign key table
			"column": "id", // foreign key related field
			"onDelete": "CASCADE", // on delete constraint (on of CASCADE | SET NULL | SET DEFAULT | RESTRICT)
			"onUpdate": "CASCADE" // on update constraint (on of CASCADE | SET NULL | SET DEFAULT | RESTRICT)
		}
	},
	// ...
]
```

### 3. Get a Table's Schema

To get a table's schema call `/tables/<table-name>` endpoint with `GET` method.

```bash
curl 'localhost:8000/api/tables/genres'
```

Response

```json
{
  "data": [
    {
      "cid": 0,
      "name": "GenreId",
      "type": "INTEGER",
      "notnull": 1,
      "dflt_value": null,
      "pk": 1
    },
    {
      "cid": 1,
      "name": "Name",
      "type": "NVARCHAR(120)",
      "notnull": 0,
      "dflt_value": null,
      "pk": 0
    }
  ]
}
```

### 4. Delete / Drop a Table

> CAUTION: Be careful when using this endpoint, it will delete the table and all its data.

To delete a table call `/tables/<table-name>` with a `DELETE` endpoint.

```bash
curl --request DELETE \
  --url http://localhost:8000/api/tables/pets
```

Response

```json
{ "message": "Table deleted" }
```
