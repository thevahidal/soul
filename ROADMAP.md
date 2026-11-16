# Soul Roadmap

This document captures where Soul is today and the direction agreed on for
what comes next. Written to hand off to a fresh session — it should be
enough context to start executing without re-deriving the "why."

## Where Soul is today

Soul started as a lighter, JS-based take on PocketBase: point it at a
SQLite file and get an instant REST + realtime API, with auth/authorization
and an extensions mechanism. It picked up some attention via Hacker News
and Reddit early on.

As of `main` (merged PR #240, tagged `v0.9.0`), Soul just went through a
full production-hardening pass:

- Fixed `npm install` failing outright on modern Node (better-sqlite3/bcrypt
  had no prebuilds for Node 20+; both bumped, `engines` now `22.x–26.x`).
- Closed a real, exploitable SQL injection surface across the rows/tables
  endpoints (identifiers are now allowlist-validated against the live
  schema; values are always parameter-bound; regression tests prove
  injection payloads are neutralized).
- Added WebSocket auth (previously anyone could subscribe to realtime
  changes on any table regardless of the REST permission model), graceful
  shutdown, a global error handler that doesn't leak stack traces, CORS/
  helmet hardening.
- Found and fixed several real latent bugs along the way: revoked-refresh-
  token cleanup silently never worked (comparing an INTEGER timestamp
  against a TEXT `CURRENT_TIMESTAMP` never matched), `authService` ignored
  its own dependency-injection parameter, extension `POST`/`PUT`/`DELETE`
  handlers never received `db` (only `GET` did, contradicting the docs),
  a broken rate-limit config key mismatch.
- CI now runs lint + tests across a Node 22/24/26 × ubuntu/macos matrix,
  plus CodeQL.
- Test coverage went from ~83% to ~94% (branches ~70% → ~88%), with a
  coverage-threshold gate enforced in CI so it can't regress silently.

**Net effect: the core (rows/tables REST API, auth, realtime, permissions)
is now solid and reasonably well-defended.** That's the foundation the
rest of this roadmap builds on — it wasn't true before this pass.

Soul Studio (a Prisma-Studio-like data browser, separate repo) exists but
is pre-alpha — the main README still says "not useful to work with yet."

## Strategic direction

Considered and **rejected**: pivoting Soul + Soul Studio into a broad
business-app suite (CRM/inventory/accounting/etc. on a shared framework).
Reasoning: that market's moat is years of vertical business-app logic, not
infrastructure, and it means competing head-on with incumbents that are
15+ years in with large module ecosystems and paid-support businesses.
It would mean abandoning Soul's current, real niche to restart as a much
larger, much slower-to-differentiate project — and Soul Studio is nowhere
near ready to be the UI layer for that anyway.

**Decided direction instead: lean into Soul as the safe, instant backend
for AI-agent-built apps.** This niche got more relevant, not less, as
agents write more backend code — the bug list above (SQL injection, a
missing auth check, a silently-broken rate limiter) is exactly the class
of mistake an LLM writing bespoke CRUD+auth code from scratch tends to
ship. A tool that turns "here's a SQLite file" into a safe, permissioned,
realtime API removes that entire failure surface.

## Roadmap

Ordered by priority / leverage. Each item should be scoped and planned
properly (via `/plan` or similar) when picked up — this is direction, not
a detailed spec.

### 1. MCP server (start here)

Smallest scope, highest signal for where Soul's actual users increasingly
are. Expose the already-hardened service layer as MCP tools so agents
(Claude Code, Cursor, etc.) can attach to a Soul-backed DB directly instead
of hand-rolling HTTP calls.

Tools to expose (mirroring existing REST semantics):

- `list_tables`, `get_schema`
- `query_rows` (reuse the existing `_filters`/`_search`/`_ordering`/
  `_schema`/`_extend` semantics from `rows.js`)
- `insert_row`, `update_row`, `delete_row`
- `create_table` (JSON schema in, same shape as the existing REST
  `POST /tables`)

Should sit directly on `src/services/rowService.js` /
`src/services/tableService.js` / `src/utils/sql.js` — no new validation
logic needed, just a transport layer. Open question to resolve when
starting: ship as a separate package, or a mode on the existing CLI
(e.g. `soul --mcp`)?

### 2. Make the safety properties part of the pitch

Write up the specific bug classes found and fixed in the hardening pass
(injection via unvalidated identifiers, the WS auth gap, the rate-limit
bug) as the actual argument for "safe to let an agent drive this." The
regression tests added during that work are the receipts.

Consider: an ongoing adversarial/fuzz test suite (random or LLM-generated
filter/ordering/table-name payloads) as both a visible regression guard
and something to point to.

### 3. LLM-native schema workflows

Soul's `createTable` API already takes a JSON schema description rather
than raw DDL — lean into that explicitly ("describe your schema, don't
write SQL"). Add incremental schema evolution (an alter-table / add-column
endpoint) so an agent can iterate on a schema across a conversation
instead of only create-once. Consider migration history/versioning if
this sees real use.

### 4. Soul Studio v1 — scoped, not full-featured

Target workflow: agent writes to the DB via Soul, human opens Studio to
inspect and correct it. Not a general-purpose admin framework.

Needs: table/row browser, inline edit, respecting the same permission
model as the API. Explicitly **not** in scope for v1: dashboards, complex
relation UIs, anything Retool-shaped — get the core loop solid first.

### 5. Scoped agent credentials

Package the existing per-table CRUD permission/role system (see
`authService.hasTablePermission`) as a named feature: give an agent a key
that can only read/write specific tables. Likely needs a lighter API-key
auth mode alongside the current username/password + JWT flow, scoped at
key-creation time to specific tables/verbs. Addresses a real, currently
annoying problem in agentic products (over-broad tool access).

### 6. Cheap wins

- Ship an `llms.txt`.
- Explicitly point agents at the already-generated OpenAPI/Swagger spec
  (`npm run swagger-autogen`) — "give this file to your coding agent and
  it knows how to drive the API." Most of the work already exists.

## Explicitly out of scope (for now)

- ERP-style business-app suite.
- General-purpose no-code app builder.
- Multi-database support (Postgres/MySQL) — SQLite-native is a feature of
  this niche, not a limitation to fix.

## Starting a new session

- Codebase state: `main` is current as of `v0.9.0` / PR #240 merge.
- Test commands: `npm test` (fast, no coverage) / `npm run test:coverage`
  (enforces the coverage threshold — this is what CI runs).
- CI: Node 22/24/26 × ubuntu/macos, plus CodeQL, on push/PR.
- Key files for MCP work specifically: `src/services/rowService.js`,
  `src/services/tableService.js`, `src/utils/sql.js` (identifier
  validation — reuse this, don't reinvent it), `src/controllers/rows.js` /
  `src/controllers/tables.js` (existing REST-layer patterns to mirror for
  parameter semantics).
