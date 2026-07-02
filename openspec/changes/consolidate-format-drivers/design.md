# Design: consolidate-format-drivers

## Technical Approach

Refactor the two existing driver implementations (`driver-file.ts`, `driver-folder.ts`) behind a common `ModelDriver` interface, move the recursive parser (and its dependency chain: types, identity, metamodel resolution) from the Vue app into `packages/format-core`, then fix all derived defects in dependency order across 3 chained PRs.

No new runtime dependencies. No UI changes in PR 1 or PR 2. No framework migrations.

## Architecture Decisions

### Decision: Interface over abstract class for ModelDriver

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Abstract class | Can share base logic (e.g. path normalization) but couples to inheritance hierarchy | ❌ Reject |
| Interface | Structural typing, trivially faked in tests, no coupling | ✅ Adopt |

The interface is kept minimal (4 methods). Shared logic (path joining, file extension checks) lives in standalone helpers.

### Decision: Factory function over DI container

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Dependency injection container | More ceremony, no existing DI in project | ❌ Reject |
| `createDriver(type, uri)` factory | Simple, explicit, easy to swap in tests | ✅ Adopt |

```ts
export function createDriver(type: DriverType, baseUri: string): ModelDriver {
  switch (type) {
    case 'FILE':  return new FileDriver(baseUri)
    case 'FOLDER': return new FolderDriver(baseUri)
  }
}
```

### Decision: `recursiveParser` moves to core, not stays in app

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep in app with driver abstraction | App-only, non-browser clients (MCP, CLI) must reimplement | ❌ Reject |
| Move to `format-core` | Single import for all clients, app becomes pure consumer | ✅ Adopt |

The migration path: types → identity → metamodel → recursiveParser move in that dependency order, each as a file move (not rewrite). The app's `model/types.ts` becomes a thin re-export file.

### Decision: `sourceMode` as new field, not storageMode modification

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reuse `storageMode` with new semantics | Risk of breaking existing UI switches | ❌ Reject |
| Add `sourceMode` field | Backward-compatible, explicit intent | ✅ Adopt |

`storageMode` stays as-is (indicates the storage container). `sourceMode` indicates how this specific node was produced (parsed from a `_FORMAT.md` vs structural placeholder).

### Decision: Asset paths as relative strings, not a dedicated store

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Asset content in IndexedDB | Heavy, out of scope | ❌ Reject |
| Asset paths only | Lightweight, driver resolves them. Sufficient for display. | ✅ Adopt |

Assets are stored as relative path strings on `ModelNode.assets`. The driver resolves them to actual files when needed.

### Decision: `spec_consolidation.md` refactored to meta-document, not deleted

The document contains valuable rationale that doesn't belong in a spec (repo structure decisions, migration plans, diff tables). It should be kept but stripped of spec-duplicating content.

### Decision: Validator migration is a move, not a rewrite

The app validator (`validateFormatContent()`, 287 lines) is proven and tested. Moving it into `format-core` is a mechanical relocation plus import path update. No behavior changes.

### Decision: AST parser for byte-fidelity is future work (not in this change)

`serializeModel()` canonical formatting is a known lossy path. The `fidelityWarning` flag (FR-2.9) is a pragmatic intermediate step. A full AST-based parser that preserves trivia (comments, whitespace, field ordering) is the correct long-term solution, but it is a substantial project (~1,500–2,000 lines) with its own parser design, AST types, and non-destructive serializer. It belongs in a dedicated SDD change.

## Architecture

### Before

```
                    ┌──────────────────────────────────────┐
                    │          format-editor (Vue)          │
                    │                                      │
                    │  recursiveParser.ts                   │
                    │    ├── walks DirectoryHandleLike      │
                    │    ├── imports parseModel()           │
                    │    └── produces ModelNode[]           │
                    │                                      │
                    │  recursiveSerializer.ts               │
                    │    ├── walks DirectoryHandleLike      │
                    │    ├── parseModel → serializeModel    │
                    │    └── writes through FileHandleLike  │
                    │                                      │
                    │  types.ts / identity.ts / metamodel.ts│
                    │  validator.ts (full, 287 lines)       │
                    └──────────┬───────────────────────────┘
                               │
                    ┌──────────▼───────────────────────────┐
                    │        format-core (library)          │
                    │                                      │
                    │  parser.ts ←── driver-file.ts        │
                    │  (FILE only)     (FileDriver API)    │
                    │                                      │
                    │  driver-folder.ts                     │
                    │    (FolderDriver API → FolderElement) │
                    │                                      │
                    │  validator.ts (minimal, 112 lines)    │
                    └──────────────────────────────────────┘

                    Non-browser clients (MCP, CLI):
                      ↯ No access to recursiveParser — must reimplement
```

### After (PR 1 + PR 2 complete)

```
                    ┌──────────────────────────────────────┐
                    │          format-editor (Vue)          │
                    │                                      │
                    │  recursiveSerializer.ts               │
                    │    ├── accepts ModelDriver            │
                    │    ├── driver.writeModel(uri)         │
                    │    └── (+) fidelity warning          │
                    │                                      │
                    │  types.ts (thin re-export from core)  │
                    │  validator.ts (thin re-export)        │
                    │  workspaceStore.ts (creates driver)   │
                    └──────────┬───────────────────────────┘
                               │  import { recursiveParse }
                               │  import { ModelDriver }
                    ┌──────────▼───────────────────────────┐
                    │        format-core (library)          │
                    │                                      │
                    │  driver.ts ←── ModelDriver interface  │
                    │    ├── driver-file.ts implements     │
                    │    └── driver-folder.ts implements   │
                    │                                      │
                    │  recursiveParser.ts (MOVED from app)  │
                    │    ├── accepts ModelDriver            │
                    │    ├── driver.readModel(uri)          │
                    │    ├── driver.listChildren(uri)       │
                    │    └── produces ModelNode[]           │
                    │                                      │
                    │  types.ts ← ModelNode + all graph types│
                    │  identity.ts ← IdentityRegistry       │
                    │  metamodel.ts ← resolveEffective...   │
                    │                                      │
                    │  parser.ts (FILE parsing, unchanged)   │
                    │  validator.ts (unified, ~350 lines)   │
                    │    ├── validateModel() ← existing    │
                    │    ├── validateFormatContent() ← new │
                    │    └── validateFormatSyntax() ← new  │
                    └──────────────────────────────────────┘

                    Non-browser clients (MCP, CLI):
                      import { recursiveParse, createDriver } from '@innv0/format-core'
                      const driver = createDriver('FOLDER', '/path/to/model')
                      const { nodes, rootIds } = await recursiveParse(handle, driver)
```

### Flow per operation

**Open workspace (PR 2):**
```
workspaceStore.open(handle)
  → detect mode (handle.kind === 'directory' ? 'FOLDER' : 'FILE')
  → createDriver(mode, handle.name)
  → import { recursiveParse } from '@innv0/format-core'
  → recursiveParse(handle, driver)
      → for each root entry:
          driver-driven dispatch (same code path for both modes)
          → driver.readModel(uri) → ParsedModel → normalize → ModelNode
      → enhanced in PR 3:
          driver.listAssets(uri) → populate node.assets
          parse graph_edges → populate node.relationships
  → modelStore.setGraph(nodes, rootIds)
```

**Save changes:**
```
recursiveSerialize(root, nodes, dirtyIds, driver)
  → for each dirty root node:
      if node has relationships (FOLDER mode):
        → inject graph_edges into frontmatter before write (PR 3)
      driver.writeModel(node.source.path, serializeNode(node))
      → fidelity: rawContent preserved? 'exact' : 'canonical' (warning)
```

## Testing Strategy

| Test file | PR | Type | What it covers |
|-----------|----|------|---------------|
| `driver-folder.test.ts` | 1 | Unit (fake FS) | Discovery, assets, empty dirs, nested elements, round-trip |
| `driver-file.test.ts` | 1 | Unit (temp file) | Read/write round-trip, sync/async, error handling |
| `recursive-parser.test.ts` | 2 | Unit (fake handles) | Mixed trees, graph_edges, collisions, concept types |
| `folder-integration.test.ts` | 3 | Integration (real sample) | Music_History + graph_edges round-trip |
| Existing tests (unchanged) | All | Regression | All FILE-mode tests continue passing |

## Backward Compatibility

| Concern | Strategy |
|---------|----------|
| `recursiveParse()` existing callers | Optional `driver` param — omitted = old behavior |
| `driver-file.ts` / `driver-folder.ts` old exports | Kept as `@deprecated` wrappers delegating to `ModelDriver` |
| `validateModel()` in format-core | Signature unchanged |
| App `types.ts` | Becomes thin re-export — all existing imports keep working |
| App `modelStore.ts` | Imports `recursiveParse` from `@innv0/format-core` — path change only |
| Non-browser clients (new) | `import { recursiveParse, createDriver } from '@innv0/format-core'` |

## File Change Map

### PR 1 — Core Abstraction

```
CREATE:
  packages/format-core/src/driver.ts           ← ModelDriver interface + factory

MOVE (from apps/format-editor/src/model/ → packages/format-core/src/):
  types.ts                                     ← ModelNode + all graph types
  identity.ts                                  ← IdentityRegistry
  metamodel.ts                                 ← resolveEffectiveMetamodel
  recursiveParser.ts                           ← accepts optional ModelDriver

MODIFY:
  packages/format-core/src/driver-file.ts       ← implement ModelDriver
  packages/format-core/src/driver-folder.ts     ← implement ModelDriver
  packages/format-core/src/index.ts             ← export new + moved symbols

CREATE (tests):
  packages/format-core/tests/driver-folder.test.ts
  packages/format-core/tests/driver-file.test.ts
```

### PR 2 — App Wiring & Alignment

```
MODIFY:
  apps/format-editor/src/model/types.ts         ← thin re-export from core
  apps/format-editor/src/model/recursiveSerializer.ts ← import from core, accept driver
  apps/format-editor/src/stores/workspaceStore.ts   ← createDriver, pass to recursiveParse
  apps/format-editor/src/shared/validator.ts    ← thin re-export from core
  packages/format-core/src/validator.ts         ← add validateFormatContent + validateFormatSyntax
  packages/format-core/src/index.ts             ← export new validator symbols
  apps/format-editor/src/model/recursiveParser.ts ← deleted (moved to core in PR 1)
  docs/spec_consolidation.md                    ← strip duplicated spec content

MOVE:
  specs/FORMAT_V_0-1-0_FORMAT.md               → archive/specs/
  specs/FORMAT_V_0-1-1_FORMAT.md               → archive/specs/

CREATE:
  specs/CHANGELOG.md
  packages/format-core/tests/recursive-parser.test.ts
```

### PR 3 — Data Completeness & Fixes

```
MODIFY:
  packages/format-core/src/types.ts             ← add assets, sourceMode
  packages/format-core/src/recursiveParser.ts   ← listAssets + graph_edges read
  apps/format-editor/src/model/recursiveSerializer.ts ← graph_edges write
  apps/format-editor/src/components/MatricesGrid.vue ← D14 fix (dropdown outside v-else)
  packages/format-core/src/validator.ts         ← any additional syntax checks

CREATE:
  packages/format-core/tests/folder-integration.test.ts
```

## Future Work (not in this change)

- **AST parser**: Replace `serializeModel`'s canonical reformatting with a non-destructive AST that preserves trivia (comments, whitespace, field ordering). Requires new parser, AST types, and serializer — ~1,500–2,000 lines.
- **Asset UI**: Display and manage assets within format-editor.
- **TABLE/CSV driver**: Third storage mode for tabular data with companion `_FORMAT.md`.
- **FOLDER → FILE conversion**: Export a FOLDER model as a single FILE document.
