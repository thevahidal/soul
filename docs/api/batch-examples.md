## Batch

`POST /api/batch` runs several row writes (insert, update, delete) in one transaction. If any operation fails, none are applied.

Each operation is the REST call you would make on its own: a `method`, a `path` and an optional `body`. Supported paths are `/api/tables/<table-name>/rows` (`POST`) and `/api/tables/<table-name>/rows/<pks>` (`PUT`, `DELETE`, with `?_lookup_field=` supported).

```bash
curl --request POST \
  --url http://localhost:8000/api/batch \
  --header 'Content-Type: application/json' \
  --data '{
  "operations": [
    {
      "method": "POST",
      "path": "/api/tables/Album/rows",
      "body": { "fields": { "Title": "New Album", "ArtistId": 1 } }
    },
    {
      "method": "PUT",
      "path": "/api/tables/Artist/rows/1",
      "body": { "fields": { "Name": "Renamed" } }
    },
    { "method": "DELETE", "path": "/api/tables/Album/rows/2" }
  ]
}'
```

Response: one result per operation, in order.

```json
{
  "results": [
    { "status": 201, "body": { "message": "Row inserted", "data": {} } },
    { "status": 200, "body": { "message": "Row updated", "data": {} } },
    { "status": 200, "body": { "message": "Row deleted", "data": {} } }
  ]
}
```

If an operation fails, the whole batch is rolled back and the response has the status of the failure plus the `index` of the failing operation:

```json
{
  "message": "table Album has no column named Nope",
  "index": 0
}
```

### Limits

- Between 1 and 100 operations per request.
- Only row writes. `GET` and other paths are rejected.
- Tables `_users`, `_roles`, `_users_roles` and `_roles_permissions` are not allowed.
- In auth mode, every operation needs the same table permission as the equivalent single request. If one is denied, the response is `403` and nothing is written.
- WebSocket events are sent only after the batch commits.
