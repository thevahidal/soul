<div style='text-align: center'>
    <img src='docs/logo.png' height='150px' style="">
    <div style='margin-bottom: 10px'>
        A RESTful server for SQLite 
    </div>

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/thevahidal/soul/blob/main/LICENSE)
</div>


## Installation
Install Soul CLI with npm

```bash
  npm install -g soul-cli
```
    
## Usage
Soul is command line tool, after installing it,
Run ```soul -d sqlite.db -p 8000``` and it'll start a RESTful API on [localhost:8000](http://localhost:8000).
```bash
Usage: soul [options]


Options:
      --version             Show version number                        [boolean]
  -d, --database            SQLite database file or :memory: [string] [required]
  -p, --port                Port to listen on                           [number]
  -r, --rate-limit-enabled  Enable rate limiting                       [boolean]
      --help                Show help                                  [boolean]

```


## Documentation

API documentation is available while running the project at [/docs](http://localhost:8000/docs)
## Development

```bash
  git clone https://github.com/thevahidal/soul # Clone project
  cd soul # Move into the soul directory

  cp .env.sample .env # Duplicate sample environment variables
  nano .env # Update the environment variables

  npm install # Install dependencies
  npm run dev # Start the dev server
```


## Contributing

Contributions are always welcome!

See `contributing.md` for ways to get started and please adhere to `code of conduct`.


## Acknowledgements

 - Ghost Icon by Mr. Minuvi from [Noun Project](https://thenounproject.com/browse/icons/term/ghost/)

## Authors

- [@thevahidal](https://www.github.com/thevahidal)


## License

[MIT](https://choosealicense.com/licenses/mit/)

