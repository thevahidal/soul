## Rows

### 1. List Rows of a Table

To list all (or some of) rows we simply call `/tables/<table-name>/rows/` endpoint with `GET` method.

```bash
curl 'localhost:8000/api/tables/Album/rows/'
```

Response

```json
{
  "data": [
    {
      "AlbumId": 1,
      "Title": "For Those About To Rock We Salute You",
      "ArtistId": 1
    },
    { "AlbumId": 2, "Title": "Balls to the Wall", "ArtistId": 2 }
    // ...
  ],
  "total": 347,
  "next": "/tables/Album?page=2",
  "previous": null
}
```

#### Query Params

- `_page` e.g. `?_page=2`, to get the second page of results.
- `_limit` e.g. `?_limit=20`, to get 20 results per page.
- `_search` e.g. `?_search=rock`, to search between rows.
- `_ordering` e.g. `?_ordering=-Title`, to order rows by title descending, or without `-` to sort ascending, e.g. `?_ordering=Title`
- `_schema` e.g. `?_schema=Title,ArtistId`, to get only the Title and ArtistId columns.
- `_extend` e.g. `?_extend=ArtistId`, to get the Artist object related to the Album.
- `_filters` e.g. `?_filters=ArtistId:1,Title:Rock`, to get only the rows where the ArtistId is 1 and the Title is Rock.

Example with query params

```bash
curl 'localhost:8000/api/tables/Album/rows?_page=1&_limit=20&_search=rock&_ordering=-Title&_schema=Title,ArtistId&_extend=ArtistId&_filters=ArtistId:90'
```

Response

```json
{
  "data": [
    {
      "Title": "Rock In Rio [CD2]",
      "ArtistId": 90,
      "ArtistId_data": { "ArtistId": 90, "Name": "Iron Maiden" }
    },
    {
      "Title": "Rock In Rio [CD1]",
      "ArtistId": 90,
      "ArtistId_data": { "ArtistId": 90, "Name": "Iron Maiden" }
    }
  ],
  "total": 2,
  "next": null,
  "previous": null
}
```

### 2. Insert a New Row

To insert a new row to a `table` call `/tables/<table-name>/rows/` endpoint with `POST` method.

```bash
curl --request POST \
  --url http://localhost:8000/api/tables/Employee/rows \
  --header 'Content-Type: application/json' \
  --data '{
	"fields": {
		"FirstName": "Damien",
		"LastName": "Rice"
	}
}'
```

Response

```json
{
  "message": "Row inserted",
  "data": {
    "changes": 1,
    "lastInsertRowid": 9
  }
}
```

#### Body Params

- `fields` e.g.

```json
"fields": {
    // fields values for the new row
}
```

### 3. Get a Row

To get a row call `/tables/<table-name>/rows/<lookup-value>/` endpoint with `GET` method.

```bash
curl http://localhost:8000/api/tables/Album/rows/1/
```

Response

```json
{
	"data": {
		"AlbumId": 1,
		"Title": "For Those About To Rock We Salute You",
		"ArtistId": 1
	}
}
```

#### Query Params

- `_lookup_field` e.g. `?_lookup_field=ArtistId`, to get the row by the ArtistId field. If not provided, the default lookup field is the primary key of the table.
- `_schema` e.g. `?_schema=Title,ArtistId`, to get only the Title and ArtistId columns.
- `_extend` e.g. `?_extend=ArtistId`, to get the Artist object related to the Album.

Example with query params

```bash
curl 'http://localhost:8000/api/tables/Album/rows/Facelift?_lookup_field=Title&_extend=ArtistId&_schema=Title'
```

Response

```json
{
	"data": {
		"Title": "Facelift",
		"ArtistId_data": {
			"ArtistId": 5,
			"Name": "Alice In Chains"
		}
	}
}
```


### 4. Update a Row

To update a row call `/tables/<table-name>/rows/<lookup-value>/` endpoint with `PUT` method.

```bash
curl --request PUT \
  --url http://localhost:8000/api/tables/Album/rows/7 \
  --header 'Content-Type: application/json' \
  --data '{
	"fields": {
		"Title": "FaceElevate"
	}
}'
```

Response

```json
{
	"message": "Row updated"
}
```

#### Query Params

- `_lookup_field` e.g. `?_lookup_field=ArtistId`, to update the row by the ArtistId field. If not provided, the default lookup field is the primary key of the table.

#### Body Params
- `fields` e.g.

```json
"fields": {
    // fields values to update
}
```


### 5. Delete a Row

To delete a row call `/tables/<table-name>/rows/<lookup-value>/` endpoint with `DELETE` method.

```bash
curl --request DELETE \
  --url http://localhost:8000/api/tables/PlaylistTrack/rows/1
```

Response

```json
{
	"message": "Row deleted",
	"data": {
		"changes": 3290,
		"lastInsertRowid": 0
	}
}
```

#### Query Params

- `_lookup_field` e.g. `?_lookup_field=ArtistId`, to delete the row by the ArtistId field. If not provided, the default lookup field is the primary key of the table.
