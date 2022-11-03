## Root

### 1. Transaction 

To start a transaction call `/transaction` endpoint with `POST` method.

```bash
curl --request POST \
  --url http://localhost:8000/api/transaction \
  --header 'Content-Type: application/json' \
  --data '{
    "transaction": [
        {
            "statement": "INSERT INTO Artist (ArtistId, Name) VALUES (:id, :name)",
            "values": { "id": 100000, "name": "Glen Hansard" }
        },
        {
            "query": "SELECT * FROM Artist ORDER BY ArtistId DESC LIMIT 1"
        }
    ]
}'
```

Response

```json
{
	"data": [
		{
			"changes": 1,
			"lastInsertRowid": 100000
		},
		[
			{
				"ArtistId": 100000,
				"Name": "Glen Hansard"
			}
		]
	]
}
```