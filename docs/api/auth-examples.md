## Authentication / Authorization

These endpoints are for Soul in the Auth mode. For that you need to enable auth mode by setting the `AUTH=true` environment variable or using the `-a` argument when starting a Soul server.

### 1. Obtain an access token

To obtain an access token call `/auth/token/obtain/` endpoint with `POST` method.

```bash
curl -v --request POST \
  --url http://localhost:8000/api/auth/token/obtain \
  --header 'Content-Type: application/json' \
  --data '{
	"fields": {
		"username": "damien",
		"password": "strongpass"
	}
}'
```

Response

```
...
< Set-Cookie: accessToken=<jwt-access-token>; Path=/; HttpOnly
< Set-Cookie: refreshToken=<jwt-refresh-token>; Path=/; HttpOnly
...
```

> You can see that when login is successful, Soul sets two cookies one for the access token and the other for the refresh token.

```json
{
  "message": "Success",
  "data": {
    "userId": 1
  }
}
```

#### Body Params

- `fields` containing `username` and `password` e.g.

```json
"fields": {
		"username": "damien",
		"password": "strongpass"
}
```

> Here's how the jwt access token payload looks like:

```json
{
  "subject": "accessToken",
  "username": "damien",
  "userId": 1,
  "isSuperuser": "false",
  "roleIds": [1],
  "iat": 1717427688,
  "exp": 1717463688
}
```

### 2. Refresh token

To refresh and obtain a new access token call `/auth/token/refresh/` endpoint with `GET` method.

```bash
curl -v http://localhost:8000/api/auth/token/refresh \
  --cookie 'refreshToken=<jwt-refresh-token>'
```

Response

```
...
< Set-Cookie: accessToken=<jwt-access-token>; Path=/; HttpOnly
< Set-Cookie: refreshToken=<jwt-refresh-token>; Path=/; HttpOnly
...
```

> There you get a new token pair

```json
{
  "message": "Success",
  "data": {
    "userId": 1
  }
}
```

#### Cookies

- `refreshToken` the refresh token that you acquired before

### 3. Change password

To change your account password call `/auth/change-password/` endpoint with `PUT` method.

```bash
curl --request PUT \
  --url http://localhost:8000/api/auth/change-password \
  --header 'Content-Type: application/json' \
  --data '{
    "fields": {
      "currentPassword": "strongpass",
      "newPassword": "anotherstrongpass"
    }
  }' \
  --cookie 'accessToken=<jwt-access-token>'
```

Response

```json
{
  "message": "Password updated successfully",
  "data": {
    "id": 1,
    "username": "damien"
  }
}
```

#### Body Params

- `fields` containing `currentPassword` and `newPassword` e.g.

```json
"fields": {
  "currentPassword": "strongpass",
  "newPassword": "anotherstrongpass"
}
```

#### Cookies

- `accessToken` the access token that you acquired before

### 4. Logout

In order to logout from your account e.g. remove access and refresh cookies and also revoke your refresh token (access token lifetime is very short and doesn't need to be revoked) call `/auth/logout/` endpoint with `GET` method.

```bash
curl http://localhost:8000/api/auth/change-password \
  --cookie 'accessToken=<jwt-access-token>' \
  --cookie 'refreshToken=<jwt-refresh-token>'
```

Response

```json
{
  "message": "Logout successful"
}
```

#### Cookies

- `accessToken` the access token that you acquired before
- `refreshToken` the refresh token that you acquired before
