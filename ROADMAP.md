# Soul Roadmap

Ordered by importance. Each item should be scoped and planned when picked up;
this is direction, not a detailed spec.

## Done

- Query capabilities: `_distinct`, `_group_by`/`_aggregate`, more filter
  operators, OR groups, multi-column `_ordering` (`95b70e4`).
- MCP server: `soul-mcp` exposes the REST API as MCP tools (`docs/mcp.md`).

## Next

### 1. Row-level permissions

Permissions today are per table and per verb only. Add rules like
`user_id = :current_user` per table/verb so users only see and edit their own
rows. Foundation for item 2.

### 2. Scoped agent credentials

Give an agent a key that can only read/write specific tables (see
`authService.hasTablePermission`). Needs a lighter API-key auth mode alongside
username/password + JWT, scoped at creation to tables/verbs (and rows, once
item 1 lands).

### 3. Schema evolution

Add an alter-table / add-column endpoint so a schema can change after
creation. Consider migration history if it sees real use.

### 4. Write-path hardening

- `bulkWrite` is a single `INSERT ... VALUES`; large batches will hit
  SQLite's bound-variable limit. Chunk inside a transaction.
- Bulk update/delete by filter.
- Upsert (`ON CONFLICT`).
- Multi-operation transactions.

### 5. Production operations

- Health/readiness endpoint and basic metrics.
- Backup story documented in `docs/self-hosting.md` (e.g. Litestream).
- Structured logging and deployment guidance (Docker, reverse proxy).

### 6. Auth completeness

Audit `docs/auth.md` and fill gaps: password reset, email verification, API
keys (overlaps item 2), optional OAuth. Verify what exists before scoping.

### 7. Adversarial test suite

Fuzz the filter/ordering/table-name inputs (random or generated payloads),
including `_group_by`, `_aggregate` and OR groups, as a regression guard
against injection.

### 8. Soul Studio v1

Table/row browser and inline edit, respecting the same permission model as
the API. Not in scope for v1: dashboards, complex relation UIs.

### 9. Search and pagination

- Full-text search via FTS5 instead of `LIKE` across every column in
  `_search`.
- Cursor (keyset) pagination; offset pagination gets slow on deep pages.

### 10. File storage

Attach files to rows (local disk first, S3-compatible later).

### Cheap wins

- Ship an `llms.txt`.
- Point agents at the generated OpenAPI spec (`npm run swagger-autogen`).

## Out of scope

- Multi-database support (Postgres/MySQL).
