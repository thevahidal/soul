<p align="center">
    <img src='docs/logo.png' height='150px' style="">
    <p align="center">
        A SQLite REST and Realtime server
    </p>
</p>

[![justforfunnoreally.dev badge](https://img.shields.io/badge/justforfunnoreally-dev-9ff)](https://justforfunnoreally.dev)
[![All Contributors](https://img.shields.io/github/all-contributors/thevahidal/soul?color=ee8449&style=flat-square)](#contributors)
[![trackgit](https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/la8rmyedi6oogy87pxla)](https://trackgit.com)

## Installation

Install Soul CLI with npm

```bash
  npm install -g soul-cli
```

## Usage

### 1. Running Soul

Soul is command line tool, after installing it,
Run `soul -d sqlite.db -p 8000` and it'll start a REST API on [http://localhost:8000](http://localhost:8000) and a Websocket server on [ws://localhost:8000](ws://localhost:8000).

```bash
Usage: soul [options]


Options:
      --version             Show version number                        [boolean]
  -d, --database            SQLite database file or :memory: [string] [required]
  -p, --port                Port to listen on                           [number]
  -r, --rate-limit-enabled  Enable rate limiting                       [boolean]
  -c, --cors                CORS whitelist origins                [string]
  -a, --auth                Enable authentication and authorization [boolean]
  -ats, --accesstokensecret          Access Token Secret                              [string]
  -atet, --accesstokenexpirationtime        Access Token Expiration Time                      [string]
  -rts, --refreshtokensecret         Refresh Token Secret                              [string]
  -rtet, --refreshtokenexpirationtime       Refresh Token Expiration Time                     [string]
  -S, --studio              Start Soul Studio in parallel
      --help                Show help

```

Then to test Soul is working run the following command

```bash
curl http://localhost:8000/api/tables
```

It should return a list of the tables inside `sqlite.db` database.

### 2. Running Soul in Auth mode

To run Soul in auth mode, allowing login and signup features with authorization capabilities in your database tables, follow these steps:

Run the Soul command with the necessary parameters:

```
soul --d foobar.db -a -ts <your_jwt_secret_value> -atet=4H -rtet=3D
```

Note: When configuring your JWT Secret, it is recommended to use a long string value for enhanced security. It is advisable to use a secret that is at least 10 characters in length.

In this example:

The `-a` flag instructs Soul to run in auth mode.
The `-ts` flag allows you to pass a JWT secret value for the `access and refresh tokens` generation and verification. Replace <your_jwt\_\_secret_value> with your desired secret value.
The `-atet` flag sets the JWT expiration time for the access token. In this case, it is set to four hours (4H), meaning the token will expire after 4 hours.
Teh `-rtet` flag sets the JWT expiration time for the refresh token. In this case, it is set to three days (3D), meaning the token will expire after 3 days.

Here are some example values for the `-atet` and `rtet` flags

- 60M: Represents a duration of 60 minutes.
- 5H: Represents a duration of 5 hours.
- 1D: Represents a duration of 1 day.

NOTE: It is crucial to securely store a copy of the `-ts`(`Token Secret`) value used in Soul. Once you pass this values, make sure to keep a backup because you will need it every time you restart Soul. Losing this secret values can result in a situation where all of your users are blocked from accessing Soul.

### 3. Updating Super Users

To modify a superuser information in a database, you can utilize the `updatesuperuser` command. This command allows you to change a superuser's `password` or upgrade/downgrade a normal user to a `superuser`. Below is an example of how to use it:

```
soul --d foobar.db updatesuperuser --id=1 password=<new_password_for_the_user> // Update the password for the superuser with ID 1

soul --d foobar.db updatesuperuser --id=1 --is_superuser=true // Upgrade the user with ID 1 to a superuser

soul --d foobar.db updatesuperuser --id=1 --is_superuser=false // Revoke the superuser role from the superuser with ID 1
```

## Documentation

API documentation is available while the project is running at [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

There's also a list of all endpoints examples at [docs/api-examples.md](docs/api-examples.md)

For websocket examples, check [docs/ws-examples.md](docs/ws-examples.md)

## Extending Soul

Soul is able to be extended (e.g. Adding custom APIs) via extensions, you can find a list of extensions at [docs/extensions-examples.md](docs/extensions-examples.md)

## Soul-mates

A collection of projects that revolve around the Soul ecosystem.

- [Soul Studio](https://github.com/thevahidal/soul-studio) provides a GUI to work with your database.

  Right now Soul Studio is in early stages of development and not useful to work with.

    <p align="center">
        <img src='docs/soul-studio.png' style="">
    </p>

- [RCO-Soul](https://github.com/DeepBlueCLtd/RCO-Soul) The purpose of this project is to demonstrate how to run a React admin client using Soul as a REST API service.

## Development

```bash
git clone https://github.com/thevahidal/soul # Clone project

cp .env.sample .env # Duplicate sample environment variables
nano .env # Update the environment variables

npm install # Install dependencies
npm run dev # Start the dev server
```

## Community

[Join](https://bit.ly/soul-discord) the discussion in our Discord server and help making Soul together.

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Contributing

Contributions are always welcome!

See `CONTRIBUTING.md` for ways to get started and please adhere to `CODE OF CONDUCT`.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://linktr.ee/thevahidal"><img src="https://avatars.githubusercontent.com/u/20302825?v=4?s=100" width="100px;" alt="Vahid Al"/><br /><sub><b>Vahid Al</b></sub></a><br /><a href="https://github.com/thevahidal/soul/commits?author=thevahidal" title="Code">💻</a> <a href="https://github.com/thevahidal/soul/pulls?q=is%3Apr+reviewed-by%3Athevahidal" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AbegaM"><img src="https://avatars.githubusercontent.com/u/70259638?v=4?s=100" width="100px;" alt="Abenezer Melkamu"/><br /><sub><b>Abenezer Melkamu</b></sub></a><br /><a href="https://github.com/thevahidal/soul/commits?author=AbegaM" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/IanMayo"><img src="https://avatars.githubusercontent.com/u/1108513?v=4?s=100" width="100px;" alt="Ian Mayo"/><br /><sub><b>Ian Mayo</b></sub></a><br /><a href="https://github.com/thevahidal/soul/commits?author=IanMayo" title="Code">💻</a> <a href="https://github.com/thevahidal/soul/pulls?q=is%3Apr+reviewed-by%3AIanMayo" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://godot.id"><img src="https://avatars.githubusercontent.com/u/40712686?v=4?s=100" width="100px;" alt="Hanz"/><br /><sub><b>Hanz</b></sub></a><br /><a href="https://github.com/thevahidal/soul/commits?author=HanzCEO" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/KoenDG"><img src="https://avatars.githubusercontent.com/u/1440619?v=4?s=100" width="100px;" alt="Koen De Groote"/><br /><sub><b>Koen De Groote</b></sub></a><br /><a href="https://github.com/thevahidal/soul/commits?author=KoenDG" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TahaKhanAbdalli"><img src="https://avatars.githubusercontent.com/u/50602678?v=4?s=100" width="100px;" alt="Muhammad Taha Khan"/><br /><sub><b>Muhammad Taha Khan</b></sub></a><br /><a href="https://github.com/thevahidal/soul/commits?author=TahaKhanAbdalli" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification.
