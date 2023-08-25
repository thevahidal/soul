# Websocket Examples

Soul realtime right now only support `rows` changes.

## Setup Environment

To follow the below examples we need to download a sample database, install Soul CLI and also a websocket client to test.
(Please note that you can use any websocket client you want, e.g. Postman, Insomnia, etc.)

### Download Sample Database

```bash
wget https://raw.githubusercontent.com/lerocha/chinook-database/master/ChinookDatabase/DataSources/Chinook_Sqlite.sqlite # Download sample sqlite database
```

### Install Websocket client

```bash
npm i -g wscat # Install websocket client
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

1. [/ws/tables](/docs/ws/rows-examples.md) Examples for Rows websockets
