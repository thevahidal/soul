# API Examples

Soul is consist of 3 main namespaces: `/tables`, `/rows` and `/`. In this document we'll try to go over all of them so you can get familiar with how Soul works.

## Setup Environment

To follow the below examples we need to download a sample database and also install Soul CLI.

### Download Sample Database

```bash
wget https://raw.githubusercontent.com/lerocha/chinook-database/master/ChinookDatabase/DataSources/Chinook_Sqlite.sqlite # Download sample sqlite database
```

### Using Soul CLI

```bash
npm install -g soul-cli
soul -d ./Chinook_Sqlite.sqlite -p 8000
```

<details>
  <summary>Or Using Local Development</summary>

```bash
git clone https://github.com/thevahidal/soul # Clone project
npm install # Install dependencies
npm link # might need `sudo`
soul -d ./Chinook_Sqlite.sqlite -p 8000
```

</details>

## Namespaces

1. [/api/tables/](api/tables-examples.md) Examples for Tables endpoints
2. [/api/{table-name}/rows/](api/rows-examples.md) Examples for Rows endpoints
3. [/api/auth/](api/auth-examples.md) Examples for Authentication / Authorization endpoints
   1. [/api/{table-name}/rows/](api/rows-auth-examples.md) Examples for Rows endpoints in Auth mode
4. [/api/](api/root-examples.md) Examples for Root endpoints

## Handling Errors

If an error occurs while processing a request, it will be indicated via the presence of an `error` key and a `message` in the JSON response. For example:

```bash
curl --request POST \
  --url http://localhost:8000/api/tables \
  --header 'Content-Type: application/json' \
  --data '{
	"name": "Artist", # note that we already have an `artists` table
	"schema": [
		# ...
	]
}'
```

```json
{
  "message": "table artists already exists",
  "error": {
    "code": "SQLITE_ERROR"
  }
}
```
