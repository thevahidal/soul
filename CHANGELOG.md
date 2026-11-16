# Changelog

## [0.11.0](https://github.com/thevahidal/soul/compare/soul-cli-v0.10.0...soul-cli-v0.11.0) (2026-11-16)


### Features

* add distinct, group/aggregate, new filter operators, OR groups and NOT to rows query ([95b70e4](https://github.com/thevahidal/soul/commit/95b70e4984fca5377b71b41e6736afb13a65083f))


### Bug Fixes

* reject repeated query params in row query helpers ([41f1cce](https://github.com/thevahidal/soul/commit/41f1cce2dc6d1a4467018612e31b285fe540c924))

## [0.10.0](https://github.com/thevahidal/soul/compare/soul-cli-v0.9.4...soul-cli-v0.10.0) (2026-11-16)


### Features

* add global error handling, graceful shutdown, WebSocket auth, CORS/helmet ([e8c6c7b](https://github.com/thevahidal/soul/commit/e8c6c7b2bfe5f671974c785107cb652e62843d14))
* **core/cli:** Added `-S` flag ([654c1f5](https://github.com/thevahidal/soul/commit/654c1f598ed288e2d58c2284697d962f57c615ba))
* **core:** Integrated soul-studio ([60f240f](https://github.com/thevahidal/soul/commit/60f240f6a695ccf9e322a892f1d2ee6606eaee40))
* expose foreign key info on GET /api/tables/:name ([b3eff42](https://github.com/thevahidal/soul/commit/b3eff42c471c36f6927ceaceade17e2d1ff8a4f0))
* harden extensions with multi-file loading, opt-in auth, generic methods ([e832b94](https://github.com/thevahidal/soul/commit/e832b9460292710f8cfed6e0bec35b77fa846d6d))
* make auth cookie SameSite/Secure configurable ([1a9ac43](https://github.com/thevahidal/soul/commit/1a9ac432aae6ce63a70b246664ebc568c18943b4))
* **npm-publish:** Added proper ci, build, publish procedure ([82cf9d4](https://github.com/thevahidal/soul/commit/82cf9d42230dfa0ee78d17f3ef4cb3f78922d021))
* **npm-publish:** Added proper ci, build, publish procedure ([553b7be](https://github.com/thevahidal/soul/commit/553b7be19915afd3e95d95452a527cb9c8225ffd))


### Bug Fixes

* **ci:** drop Node 20 from engines/CI matrix, unsupported by better-sqlite3 13 ([35b63ed](https://github.com/thevahidal/soul/commit/35b63ed49a3d649eece7cda8cc1ae6c267445f39))
* **core:** Fixed Soul Studio startup misconfiguration ([2b39777](https://github.com/thevahidal/soul/commit/2b3977759b78fb2c3a3a86991273f843931bfa7e))
* correct _users_roles unique constraint to (user_id, role_id) ([021c058](https://github.com/thevahidal/soul/commit/021c058ee825db17d9e9c844b936dbd0fad4f3a7))
* correct _users_roles unique constraint to (user_id, role_id) ([c06b403](https://github.com/thevahidal/soul/commit/c06b4039e600176e96400ce21ef0d2a6f12a3ea4))
* don't reject requests over an unrelated cookie the browser sends ([a99a329](https://github.com/thevahidal/soul/commit/a99a3296d8acd15edc8760a01d644fe3627241b7))
* give every JWT a unique jti to prevent cross-session revocation ([27f920e](https://github.com/thevahidal/soul/commit/27f920ea3a0c076bea1d1fa79fce68c5c52ba70c))
* keep yargs on 17 (v18 is ESM-only, breaks Jest on Node 22) ([a908687](https://github.com/thevahidal/soul/commit/a90868725282e2f2906a8a1102e0212baac7ad71))
* mount Studio at root and filter by path, not app.use('/studio', ...) ([acb66d9](https://github.com/thevahidal/soul/commit/acb66d911b355847c9bb59e4b52605f1da748135))
* mount Studio at root and filter by path, not app.use('/studio', ...) ([8f1b2fa](https://github.com/thevahidal/soul/commit/8f1b2fac7d80e1584fb375770c3072dd12c7972c))
* **npm-publish:** Removed `needs` key ([51a64cf](https://github.com/thevahidal/soul/commit/51a64cf103ccf0b89d175573ecf89923ad9d43cc))
* **npm-publish:** Removed `needs` key ([cdef494](https://github.com/thevahidal/soul/commit/cdef4943ba4dcb5ba0b10f99b6ca7ada3efe023c))
* **security:** address CodeQL findings on workflow permissions and PRAGMA/DROP ([97ae630](https://github.com/thevahidal/soul/commit/97ae6305be0ddd866a0ab3f7e6abdf6569464409))
* **security:** close SQL injection surface, validate identifiers against schema ([efeb8d1](https://github.com/thevahidal/soul/commit/efeb8d1152a0f0d8bfbf4c0dfd705aa4aae56fa7))
* **security:** eliminate PRAGMA identifier interpolation via table-valued functions ([aca2756](https://github.com/thevahidal/soul/commit/aca27566094d677a622edf5f41c8fe129cd4c8d3))
* unblock npm install, fix startup race, and rate-limit config bug ([e3b4f16](https://github.com/thevahidal/soul/commit/e3b4f16ac84fe697606085c9726b42a7c102df16))
* updatesuperuser crashes when setting --is_superuser via SQLite bind ([f5c3038](https://github.com/thevahidal/soul/commit/f5c30389d3e701314998229a2dee19e1232d855b))
