# format-editor

The unified workspace editor for the iNNv0 FORMAT ecosystem. Open any folder and edit FILE and FOLDER mode models in a single tree.

## Features

- **Unified workspace** — open a folder via the File System Access API (`showDirectoryPicker`)
- **Single parse pass** — recursive parser walks every directory exactly once
- **Mixed tree** — FILE and FOLDER mode models coexist in one sidebar tree
- **Metamodel-driven forms** — NodeForm renders fields based on the resolved metamodel
- **IndexedDB persistence** — workspace handles stored for fast reopen without re-prompting
- **FORMAT validation** — validate workspace content against spec contracts (coming from launcher port)

## Architecture

```
apps/format-editor/
├── src/
│   ├── main.ts              ← Vue app entry (Pinia + Router)
│   ├── App.vue              ← Root component (<router-view />)
│   ├── router/
│   │   └── index.ts          ← Routes: / (HomeView), /workspace (WorkspaceView)
│   ├── views/
│   │   ├── HomeView.vue      ← Open workspace picker
│   │   └── WorkspaceView.vue ← Sidebar tree + NodeForm layout
│   ├── components/
│   │   ├── SidebarTree.vue   ← Navigable tree from modelStore
│   │   ├── SidebarTreeNode.vue ← Single node in the tree
│   │   └── NodeForm.vue      ← Metamodel-driven field editor
│   ├── stores/
│   │   ├── workspaceStore.ts ← FS handle, parse orchestration, IndexedDB
│   │   └── modelStore.ts     ← Parsed model graph (nodes, children, metamodel)
│   ├── model/
│   │   ├── types.ts          ← ModelNode, kind discriminators
│   │   ├── metamodel.ts      ← resolveEffectiveMetamodel
│   │   ├── recursiveParser.ts ← parseFolderNode + parseFileNode
│   │   ├── recursiveSerializer.ts ← Write path (future)
│   │   ├── identity.ts       ← IdentityRegistry for dedup + collisions
│   │   └── fs-types.ts       ← DirectoryHandleLike abstraction
│   └── shared/               ← Ported launcher utilities (validator, toast, history)
└── tests/
    ├── unit/
    ├── golden/
    └── integration/
```

## Key concepts

### Node kinds

| Kind | Description | Source |
|------|-------------|--------|
| `root` | Workspace root node | Root `_FORMAT.md` |
| `concept` | Type/group node (no own file) | Bare directory, or `# _F` section in FILE mode |
| `element` | Instance node | Directory with `_FORMAT.md` carrying `type:`, or index-block entry |

### Parse flow

1. User picks a folder → `workspaceStore.open(handle)`
2. `modelStore.parseFromHandle(handle)` → `recursiveParse(handle)`
3. `parseFolderNode` classifies each directory:
   - Has parseable `_FORMAT.md` → element/root node + in-file children
   - No `_FORMAT.md` → concept/group node (recursion continues)
   - Unparseable `_FORMAT.md` → concept node + recorded issue (recursion continues)
4. Tree is the **union** of in-file children and child directories

## Development

```bash
# From repo root
npm run build -w @innv0/format-core   # Build dependency first
npm run dev -w @innv0/format-editor   # Start dev server (default port 5173)

# Run tests
npm run test -w @innv0/format-editor
```
