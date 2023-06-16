<p align="center">
    <img src='docs/logo.png' height='150px' style="">
    <p align="center">
        A SQLite REST and Realtime server 
    </p>
</p>

[![justforfunnoreally.dev badge](https://img.shields.io/badge/justforfunnoreally-dev-9ff)](https://justforfunnoreally.dev)

## Installation

Install Soul CLI with npm

```bash
  npm install -g soul-cli
```

## Usage

Soul is command line tool, after installing it,
Run `soul -d sqlite.db -p 8000` and it'll start a REST API on [http://localhost:8000](http://localhost:8000) and a Websocket server on [ws://localhost:8000](ws://localhost:8000).

```bash
Usage: soul [options]


Options:
      --version             Show version number                        [boolean]
  -d, --database            SQLite database file or :memory: [string] [required]
  -p, --port                Port to listen on                           [number]
  -r, --rate-limit-enabled  Enable rate limiting                       [boolean]
  -c, --cors                CORS white list URL values                 [string]
      --help                Show help                                  [boolean]

```

Then to test Soul is working run the following command

```bash
curl http://localhost:8000/api/tables
```

It should return a list of the tables inside `sqlite.db` database.

## Documentation

API documentation is available while the project is running at [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

There's also a list of all endpoints examples at [docs/api-examples.md](docs/api-examples.md)

For websocket examples, check [docs/ws-examples.md](docs/ws-examples.md)

## Extending Soul

Soul is able to be extended (e.g. Adding custom APIs) via extensions, you can find a list of extensions at [docs/extensions-examples.md](docs/extensions-examples.md)

## Soul Studio

Soul Studio provides a GUI to work with your database.

Right now Soul Studio is in early stages of development and not useful to work with.

<p align="center">
    <img src='docs/soul-studio.png' style="">
</p>

## Development

```bash
git clone https://github.com/thevahidal/soul # Clone project
```

### Core API

```bash
cd core # Move into the core directory

cp .env.sample .env # Duplicate sample environment variables
nano .env # Update the environment variables

npm install # Install dependencies
npm run dev # Start the dev server
```

### Studio

Make sure that Soul Core API is up and running and then

```bash
cd studio # Move into the studio directory

cp .env.sample .env # Duplicate sample environment variables
nano .env # Update the environment variables

npm install # Install dependencies
npm run dev # Start the dev server
```

## Community

[Join](https://bit.ly/soul-discord) the discussion in our Discord server and help making Soul together.

## Contributing

Contributions are always welcome!

See `CONTRIBUTING.md` for ways to get started and please adhere to `CODE OF CONDUCT`.

## Authors

- [@thevahidal](https://www.github.com/thevahidal)

## License

[MIT](https://choosealicense.com/licenses/mit/)

<a href="https://trackgit.com">
<img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/la8rmyedi6oogy87pxla" alt="trackgit-views" />
</a>
