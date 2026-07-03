# OpenCode FORMAT Agent

The **FORMAT agent** lets you create, edit, and query FORMAT models through natural language in **OpenCode Desktop**.

## Prerequisites

- OpenCode Desktop v1.17.x (or later)
- This project cloned and opened in OpenCode
- The `format-mcp` MCP server built once: `npm run build --workspace=packages/format-mcp`

## Selecting the FORMAT Agent

1. Open the project in OpenCode Desktop
2. Look for the **mode dropdown** in the chat/composer toolbar (shows the current agent name)
3. Select **FORMAT** from the dropdown
4. The six FORMAT MCP tools are now available in your session

If FORMAT doesn't appear in the dropdown, verify:
- `opencode.json` exists at the project root
- `.opencode/agents/format.md` exists with valid frontmatter
- The MCP server was built (`packages/format-mcp/dist/server.js` exists)

## Example Prompts

```
List all available FORMAT models
```

```
Read the Ghostbusters model and show me its structure
```

```
Add a new concept "Innovation" with type "text" to the Ghostbusters model
```

```
Add a new element "Cloud Infrastructure" to the Components concept with description "All cloud-hosted services"
```

```
Validate the Ghostbusters model
```

```
What does the business template define? Use get_template
```

## Architecture

```
OpenCode Desktop → format-mcp (MCP server) → @innv0/format-core
                        ↓
            Public FORMAT Spec URL (single source of truth)
```

- All FORMAT logic lives in the MCP server and `format-core`
- Validation is **deterministic** — the validator decides validity, not the LLM
- Specification content is never duplicated into rules/agent config — always fetched via `get_spec` / `get_template`
- Edits are scoped to `models/` by permission configuration

## Troubleshooting

| Symptom | Solution |
|---------|----------|
| Agent not in dropdown | Check `opencode.json` and `.opencode/agents/format.md` exist |
| MCP tools not loading | Rebuild with `npm run build --workspace=packages/format-mcp` |
| Validation fails | Ensure the model's `parent_spec.url` is reachable (public GitHub URL) |
| `apply_change` returns errors | The change was rejected by the validator — fix errors and retry |

## Files Added by This Change

| File | Purpose |
|------|---------|
| `packages/format-mcp/` | MCP server wrapping `@innv0/format-core` |
| `opencode.json` | Registers `format-mcp` server and FORMAT agent |
| `.opencode/agents/format.md` | FORMAT primary agent definition |
| `.opencode/rules/format.md` | Behavior-only workflow rules |
