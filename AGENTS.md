# Soul

SQLite REST and realtime (WebSocket) server. Published to npm as `soul-cli` (CLI: `soul`). Node 22/24/26, CommonJS, Express 5, better-sqlite3.

## Commands

- `npm run dev` — regenerate swagger, run with nodemon
- `npm test` — jest (needs no setup; env vars are set in the script)
- `npm run test:coverage` — enforces thresholds in `package.json` (`jest.coverageThreshold`)
- `npm run lint` / `npm run format` — eslint / prettier
- `npm run swagger-autogen` — regenerates `src/swagger/swagger.json`; commit it when routes change
- `scripts/dev.sh` — local instance with a ready superuser

A husky pre-commit hook runs the full test suite and lint-staged.

## Layout (`src/`)

Request flow: `routes/` → `middlewares/` (+ `schemas/` Joi validation) → `controllers/` → `services/` → `db/`.

- `controllers/auth/` — users, roles, tokens
- `extensions.js` — user-provided extensions (`docs/extensions-examples.md`)
- `websocket.js` — realtime; `cli.js` / `commands.js` — CLI
- `config/` — env-driven config; new env vars go in `.env.sample` and `README.md`
- Tests live next to the code as `*.test.js`; shared helpers in `src/tests/`

## Conventions

- Single quotes, 2-space indent, prettier-formatted. Few comments.
- Add or update tests with every change; keep coverage above the thresholds.
- Commits and PR titles use conventional prefixes: `feat:`, `fix:`, `perf:`, `docs:`, `chore:`, `ci:`, `test:`, `refactor:`. Breaking changes use `feat!:` or a `BREAKING CHANGE:` footer. These drive the version bump.
- Don't edit `version` in `package.json` by hand. release-please opens a release PR from merged commits; merging it tags, creates the GitHub Release and publishes to npm (`.github/workflows/release.yml`). Force a version with a `Release-As: x.y.z` commit footer.
