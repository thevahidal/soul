## Rows

### 1. Rows realtime changes

To subscribe to realtime changes (Insert, Update and Delete) in rows of a certain table,
use `tables/<table-name>/rows` endpoint.

```bash
wscat -c ws://localhost:8000/ws/tables/Employee
```

It should respond with the following message:

```json
{
  "message": "Subscribed to table \"Employee\""
}
```

Note that it's ready to receive messages.

Then to test it, in a new terminal, insert a new row in the table `Employee`:

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

Checkout `wscat` terminal, it should respond with the following message:

```json
{
  "type": "INSERT",
  "data": {
    "pk": 10,
    "FirstName": "Damien",
    "LastName": "Rice"
  }
}
```

Then to test update changes, let's change the `FirstName` of the row with `pk` 10:

```bash
curl --request PUT \
  --url http://localhost:8000/api/tables/Employee/rows/10 \
  --header 'Content-Type: application/json' \
  --data '{
    "fields": {
        "FirstName": "Glen"
    }
}'
```

Checkout `wscat` terminal, it should respond with the following message:

```json
{
  "type": "UPDATE",
  "_lookup_field": "EmployeeId",
  "data": {
    "pks": ["10"],
    "FirstName": "Glen"
  }
}
```

While we're testing update changes, let's see how it works in bulk update mode:

```bash
curl --request PUT \
  --url http://localhost:8000/api/tables/Employee/rows/8,9,10 \
  --header 'Content-Type: application/json' \
  --data '{
    "fields": {
        "FirstName": "David"
    }
}'
```

Note comma-separated `lookup-values` in the URL. (8,9,10)

Checkout `wscat` terminal, it should respond with the following message:

```json
{
  "type": "UPDATE",
  "_lookup_field": "EmployeeId",
  "data": {
    "pks": ["8", "9", "10"],
    "FirstName": "David"
  }
}
```

Then to test delete changes, let's delete the row with `pk` 10:

```bash
curl --request DELETE \
  --url http://localhost:8000/api/tables/Employee/rows/10
```

Checkout `wscat` terminal, it should respond with the following message:

```json
{
  "type": "DELETE",
  "_lookup_field": "EmployeeId",
  "data": {
    "pks": ["10"]
  }
}
```

That's it for realtime changes.
