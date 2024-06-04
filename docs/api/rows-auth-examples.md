## Rows in Auth mode

### 1. List Rows of a Table in Auth mode

To list rows in auth mode we call `/tables/<table-name>/rows/` endpoint with `GET` method and pass the jwt access token via Cookies.

> Note that your account needs to have access to read this table.
> Access (Authorization) in Soul is handled via "\_roles" table aka Roles.
> If you want to learn about granting permissions proceed to the next example.

```bash
curl 'localhost:8000/api/tables/Album/rows/' \
  --cookie 'accessToken=<jwt-access-token>'
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

#### Cookies

- `accessToken` the access token that you acquired before

### 2. Granting access to users

Only super users (e.g. `is_superuser=true`) or those with roles that have access to '\_roles' table can grant access to other users.

> Head over to [README](/README.md) and _Updating Super Users_ section to learn how to promote someone to a super user.

#### 2.1. Create a new Role

To create a new Role call `/tables/_roles/rows/` endpoint with `POST` method.

```bash
curl --request POST \
  --url http://localhost:8000/api/tables/_roles/rows/ \
  --header 'Content-Type: application/json' \
  --header 'Cookie: accessToken=<jwt-access-token>' \
  --data '{
  "fields": {
    "name": "editor"
  }
}'
```

Response

```json
{
  "message": "Row inserted",
  "data": {
    "changes": 1,
    "lastInsertRowid": 2
  }
}
```

Now that we have our `editor` Role, we can give it some permissions. Here we want to give it permission to `read` `Album` table.

#### 2.2. Create permissions for a Role

To create permissions for a Role call `/tables/_roles_permissions/rows/` endpoint with `POST` method.

```bash
curl --request POST \
  --url http://localhost:8000/api/tables/_roles_permissions/rows/ \
  --header 'Content-Type: application/json' \
  --header 'Cookie: <jwt-access-token>' \
  --data '{
  "fields": {
    "role_id": 2,
    "table_name": "Album",
    "create": 0,
    "read": 1,
    "update": 0,
    "delete": 0
  }
}'
```

Response

```json
{
  "message": "Row inserted",
  "data": {
    "changes": 1,
    "lastInsertRowid": 6
  }
}
```

Oh, now that we have created the Role Permission think that it's better for `editor` role to have both `read` and `create` permissions.

#### 2.3. Assign Role to a User

To assign roles to a user call `/tables/_users_roles/rows/` endpoint with `POST` method.

```bash
curl --request POST \
  --url http://localhost:8000/api/tables/_users_roles/rows/ \
  --header 'Content-Type: application/json' \
  --header 'Cookie: <jwt-access-token>' \
  --data '{
  "fields": {
    "user_id": 1,
    "role_id": 2
  }
}'
```

Response

```json
{
  "message": "Row inserted",
  "data": {
    "changes": 1,
    "lastInsertRowid": 2
  }
}
```

Now that we assigned `editor` role to a user, he / she can read the `Album` table.
