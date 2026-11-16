# MCP server

`soul-mcp` lets MCP clients (Claude Code, Cursor, ...) work with a running Soul through tools. It calls Soul's REST API, so permissions, validation and realtime broadcasts apply exactly as they do for any other client.

## Setup

Start Soul as usual, then add `soul-mcp` to your MCP client:

```json
{
  "mcpServers": {
    "soul": {
      "command": "npx",
      "args": ["-p", "soul-cli", "soul-mcp", "--url", "http://localhost:8000"],
      "env": {
        "SOUL_USERNAME": "agent",
        "SOUL_PASSWORD": "..."
      }
    }
  }
}
```

| Setting                    | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `--url` or `SOUL_URL`      | Soul base URL, default `http://localhost:8000`       |
| `SOUL_USERNAME`/`PASSWORD` | Soul user to log in as (omit to connect anonymously) |

## Authentication

Create a dedicated Soul user for the agent and give its role only the table permissions it needs (see [auth.md](auth.md)). `soul-mcp` logs in at startup and refreshes the token when it expires. The model never sees the password; requests outside the role's permissions return an error.

Without credentials, requests are anonymous: they get the permissions of the anon role (`--anonrole`), or fail with 401 if none is set.

## Tools

| Tool           | Description                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `list_tables`  | List tables and views                                                                                     |
| `get_schema`   | Columns of a table                                                                                        |
| `query_rows`   | `filters`, `search`, `ordering`, `schema`, `extend`, `distinct`, `group_by`, `aggregate`, `page`, `limit` |
| `insert_row`   | Insert a row from `fields`                                                                                |
| `update_row`   | Update row(s) by `pks` (optional `lookup_field`)                                                          |
| `delete_row`   | Delete row(s) by `pks` (optional `lookup_field`)                                                          |
| `create_table` | Create a table from a JSON schema, same body as `POST /api/tables`                                        |

`query_rows` arguments map to the `_filters`, `_search`, ... query params described in [api/rows-examples.md](api/rows-examples.md).
