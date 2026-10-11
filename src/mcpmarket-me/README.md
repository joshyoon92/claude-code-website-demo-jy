MCPmarket plugin for Claude Code.

## Install

Install from https://app.mcpmarket.com, either with the one-line install
command or by downloading a pre-configured ZIP.

## Layout

- `.claude-plugin/plugin.json` — plugin manifest
- `.mcp.json` — MCP server config (toolkit URL + API token)
- `hooks/hooks.json` — `SessionStart` hook
- `hook-shim.sh` — exports `MCPMARKET_*` env vars then runs `shared/sync.sh`

The shared sync logic lives in `shared/sync.sh`.
