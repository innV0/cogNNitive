# Design: OpenCode FORMAT Agent

Natural-language editing/querying of FORMAT models through OpenCode Desktop, backed by a format-aware MCP server over `@innv0/format-core`. Additive and isolated — no change to existing apps.

## Architecture overview

Two interchangeable frontends over one shared core. Only the OpenCode Desktop frontend ships in this change; the embedded chat is a future, additive client of the same MCP server.

```
  OpenCode Desktop  ──┐
  (this change)       │      ┌──────────────────────────┐      ┌───────────────────┐
                      ├────► │  format-mcp (MCP server)  │────► │  @innv0/format-core│
  Embedded chat in    │      │  read/validate/apply      │      │  parse · validate  │
  format-editor  ─────┘      │  get_spec · get_template  │      │  serialize         │
  (future, out of scope)     └────────────┬─────────────┘      └─────────┬─────────┘
                                          │                              │
                                          └──────────────┬───────────────┘
                                                         ▼
                                          ┌────────────────────────────┐
                                          │  Public FORMAT spec URL     │
                                          │  (single source of truth,   │
                                          │   versioned, cached)        │
                                          └────────────────────────────┘
```

**Layer contract (non-negotiable):** all FORMAT knowledge and mutation logic lives in `format-mcp` + `format-core`. OpenCode config (`opencode.json`, `agents/format.md`, rules) is declarative and behavior-only. This is what keeps the future embedded chat additive instead of a rewrite.

## Component design

### 1. MCP server (`format-mcp`)

A thin Node/Bun package that depends on `@innv0/format-core` and speaks MCP over stdio (OpenCode starts it as a child process). Package location: `packages/format-mcp` (library-adjacent to `format-core`) — chosen over `apps/` because it is a headless dependency, not a user-facing app.

Tool surface (semantic, not line-level):

| Tool | Input | Output | Notes |
|------|-------|--------|-------|
| `list_models` | `{ root? }` | list of `{ id, path, mode, version }` | Scans `models/`; `mode` = FILE or FOLDER |
| `read_model` | `{ id }` | parsed model (concepts, elements, fields, markers, matrices, relationships) | Uses `format-core` parser; FILE or FOLDER driver per node |
| `get_spec` | `{ version? }` | spec document text/structure | Fetches public URL; cached (ETag); version resolved from arg or model SemVer |
| `get_template` | `{ name, version? }` | template schema | Same fetch/cache/version rules; `name` ∈ business, procedures, kb |
| `validate_model` | `{ id \| content }` | `{ valid, errors[] }` | Deterministic; runs `format-core` validator against the resolved template |
| `apply_change` | `{ id, op, args }` | updated model **or** `{ valid:false, errors[] }` | Intent ops (add concept / add field / set marker / …); writes then re-validates in one call |

Design rules:
- **Validation is deterministic and tool-owned.** The LLM never claims validity; it calls `validate_model`/`apply_change` and self-corrects from `errors[]`.
- **`apply_change` is atomic-ish:** parse → mutate → serialize → validate. If validation fails, it returns errors and does **not** leave a corrupted file (write only on valid, or write-then-report with a clear invalid flag — see Open Questions).
- **FILE vs FOLDER is internal.** Tools accept a model `id`; the server dispatches to the correct `format-core` driver by the model's on-disk representation. Callers do not choose a driver.

### 2. Single source of truth (`get_spec` / `get_template`)

- **Source:** the published, versioned FORMAT spec/template URL, e.g. `https://raw.githubusercontent.com/innV0/cogNNitive/v{semver}/specs/FORMAT_V_{semver}_FORMAT.md` (matching the existing `specification_url` convention in the models).
- **Version resolution:** a model's version comes from its filename SemVer (`..._V_0-1-1_...`). `get_spec`/`get_template` default to that version; an explicit `version` arg overrides.
- **Caching:** cache by URL+ETag (or version tag). On a cache hit with unchanged ETag, serve cached content. On network failure, serve last-known cached content and annotate staleness; never silently fabricate spec content.
- **Shared consumption:** `format-core`'s validator resolves the template from the same source (directly or via the same fetch helper), so validator and agent share one truth.

### 3. Behavior-only rules

A portable Markdown rules file (referenced by the FORMAT agent) containing **workflow, not spec**:
- "To learn the current FORMAT rules for a model, call `get_spec`/`get_template` — do not assume."
- "After any edit, call `validate_model`; if `errors[]` is non-empty, fix and re-validate before reporting success."
- FILE vs FOLDER handling notes (call the semantic tool; never guess a driver).
- Naming/SemVer conventions are *pointed to* (via the spec) rather than copied.

Runtime-agnostic on purpose so a future embedded chat loads the same file.

### 4. FORMAT primary agent (distribution unit)

- **`opencode.json`**: register the local MCP server under `mcp` (type local, command to start `format-mcp`).
- **`.opencode/agents/format.md`**: a primary agent that appears in OpenCode's Build/Plan dropdown with:
  - a dedicated model + low temperature (deterministic structured editing),
  - **permissions scoped to `models/`** (edits confined; `bash`/`webfetch` set to ask or off as appropriate),
  - the MCP tools enabled,
  - a reference to the behavior-only rules file.
- Committed to the repo → anyone opening the project in OpenCode Desktop gets the FORMAT mode ready.

## Verified platform constraints (rationale)

| Constraint | Consequence for this design |
|------------|-----------------------------|
| OpenCode is an MCP client (local stdio + remote) | We expose FORMAT via a local stdio MCP server — first-class, no forking OpenCode |
| OpenCode supports user-defined primary agents (opencode.json / agents/*.md) shown in the mode dropdown | The FORMAT agent is a supported, committable distribution unit |
| OpenCode plugin API is backend-only (Node/Bun); lifecycle hooks only | No plugin is used for logic; **no** custom UI panel exists |
| No UI-panel/webview extensibility today (open FRs anomalyco/opencode #19919, #5971, no maintainer commitment) | Embedding `format-editor` inside OpenCode is out of scope; the visual path (later) is the inverse — embed a chat inside our own app |

## Alternatives considered

| Option | Why not (for this change) |
|--------|---------------------------|
| Skill/prompt embeds the FORMAT spec directly | Violates single source of truth; spec drift makes the agent lie. Rejected. |
| OpenCode plugin renders `format-editor` in a side panel | Not possible today (backend-only plugin API, no UI panels). Rejected. |
| Embed chat inside `format-editor` first | More work; user chose to start with the apps separate. Deferred, kept additive. |
| Raw file-edit tools only (no semantic `apply_change`) | Agent edits blind and corrupts FORMAT; loses the validation loop. Rejected as the primary path. |
| Remote/hosted MCP server | Unneeded for local single-user editing; adds ops surface. Deferred. |

## Migration / future-compat

The embedded chat (future) is a **new client of the same MCP server**, not a replacement. Nothing built here is thrown away provided the layer contract holds: logic in `format-mcp` + `format-core`, OpenCode config thin. OpenCode also runs as a headless server, so the future embedded chat could even reuse that runtime rather than rebuilding the agent loop.

## Open questions

1. **`apply_change` write semantics on invalid result** — write-then-flag-invalid, or reject-without-writing? Leaning reject-without-writing to guarantee files never hold invalid FORMAT; confirm against how `format-editor` persists.
2. **`format-core` public surface** — does it already export parse/validate/serialize + a spec-fetch helper, or do we add a thin façade? Prefer reusing existing exports; add only an additive façade if missing.
3. **Spec URL publication** — is the versioned spec already reachable at a stable public URL, or is publishing it a prerequisite task?
4. **Package placement** — `packages/format-mcp` (preferred) vs `apps/format-mcp`. Preference: `packages/` (headless dependency).
