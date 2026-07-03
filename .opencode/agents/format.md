---
id: format
name: FORMAT
model: sonnet
temperature: 0.1
mcp: true
rules:
  - ${workspaceFolder}/.opencode/rules/format.md
permissions:
  files:
    allow: ["${workspaceFolder}/models/**"]
---

# FORMAT Agent

The FORMAT agent lets you create, edit, and query FORMAT models using natural language. It exposes six MCP tools through the `format-mcp` server and loads behavior-only rules from `.opencode/rules/format.md`.

## What it does

- List and inspect FORMAT models with `list_models` / `read_model`
- Validate models against their template with `validate_model`
- Apply semantic changes with `apply_change` (add concepts, fields, elements, markers)
- Retrieve the FORMAT specification and templates with `get_spec` / `get_template`

## Limits

- Edits are scoped to the `models/` directory
- The agent does NOT embed FORMAT spec content — it calls `get_spec` / `get_template` to learn current rules
- Validation and editing is deterministic (powered by `@innv0/format-core`), never asserted by the LLM
