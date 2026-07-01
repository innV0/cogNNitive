# Design: Ecosystem Consolidation

## Technical Approach

Collapse 3 standalone apps into a single Vue 3 SPA (`apps/format-editor/`) with 3 lazy-loaded routes (`/`, `/file`, `/folder`). Shared Pinia stores hold FS handle and parsed model; module-specific stores hydrate from them. ESLint enforces module isolation. `window.open()` calls become `router.push()`.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Framework | Vue 3 + Pinia + Vite vs React + Zustand vs Svelte | Existing launcher (`apps/launcher/`) and file-format already use Vue 3 + Pinia + Vite. Choosing anything else would mean rewriting migration targets. | **Vue 3 + Pinia + Vite** — zero rewrite cost for launcher and file-format migration. |
| Monorepo placement | New `apps/format-editor/` with `modules/` subdir vs flat `apps/file/`, `apps/folder/`, `apps/launcher/` | Flat approach loses shared stores and composables; each app would need its own Pinia instance. Single SPA with modules preserves shared state. | **Single `apps/format-editor/`** with `modules/` — shared `stores/` and `shared/` accessible to all modules. |
| FS abstraction | Refactor useFileSystem.ts in-place vs create new shared composable | Existing composable in `file-format/src/` is tightly coupled to FILE-mode types (`FileItem`). Extracting shared core (connect, read, save, scan) with mode-specific wrappers avoids breaking the existing module during migration. | **Extract `shared/composables/useFileSystem.ts`** with directory-handle primitives. Module composables wrap it for their mode. |
| Folder driver | Rewrite driver-folder.ts for browser vs keep node:fs and shim at build time | `driver-folder.ts` uses `node:fs/promises` — unusable in browser. Browser adapter using `FileSystemDirectoryHandle` is straightforward: `readdir` → `handle.values()`, `readFile` → `handle.getFileHandle().getFile().text()`. | **Browser adapter** (`shared/utils/browserDriverFolder.ts`) that mirrors `FolderModel` output using File System Access API. |
| Parse strategy | Parse once in launcher vs parse on each route activation | Launcher already detects mode — it can parse the root `_FORMAT.md` during detection. Storing the result avoids redundant I/O and CPU. | **Single parse pass**: `detectMode()` calls `parseModel()`; result stored in `workspaceStore.parsedModel`. Modules hydrate from store. |
| Route loading | Eager vs lazy (`defineAsyncComponent`) | Eager loads all modules upfront — unnecessary for single-mode sessions. | **Lazy**: `/` (launcher, always loaded), `/file` and `/folder` as `defineAsyncComponent`. |

## Data Flow

```
User drops folder on DropZone
  │
  ▼
workspaceStore.importFromDrop(items)
  ├─ useFileSystem.initialize(FileSystemDirectoryHandle)
  ├─ detectMode(handle) → FILE | FOLDER | NONE
  ├─ parseModel(rootContent)   ← single parse pass
  └─ workspaceStore.parsedModel = result
       │
       ▼
    router.push(/file)  or  router.push(/folder)
       │
       ▼
  [vue-router beforeEach guard]
    hasHandle? → proceed : redirect /
       │
       ▼
  Lazy-loaded module activates (onMounted)
    ├─ reads workspaceStore.parsedModel
    ├─ populates module store (documentStore or folderStore)
    └─ renders editor UI
         │
         ▼  (user edits + saves)
    moduleStore.writeBack()
      → serializeModel() or per-element serialize
      → useFileSystem.saveFileContent(handle, path, content)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/format-editor/package.json` | Create | SPA manifest with vue, pinia, vue-router, `@innv0/format-core: workspace:*` |
| `apps/format-editor/vite.config.ts` | Create | Vite config with `@/` alias, vue plugin, browser resolve condition |
| `apps/format-editor/index.html` | Create | SPA entry point |
| `apps/format-editor/src/main.ts` | Create | createApp + createPinia + createRouter |
| `apps/format-editor/src/App.vue` | Create | `<router-view />` shell |
| `apps/format-editor/src/router/index.ts` | Create | 3 routes with `beforeEach` guard checking `workspaceStore.hasHandle` |
| `apps/format-editor/src/stores/workspace.ts` | Create | Pinia store: `handle`, `hasHandle`, `mode`, `parsedModel`, `importFromDrop()`, `verifyPermission()` |
| `apps/format-editor/src/stores/metamodel.ts` | Create | Pinia store: `concepts`, `markers`, `matrices` derived from parsed model frontmatter |
| `apps/format-editor/src/shared/composables/useFileSystem.ts` | Create | Shared FS primitives: `initialize()`, `readFile()`, `writeFile()`, `walk()`, `verifyPermission()` |
| `apps/format-editor/src/shared/utils/browserDriverFolder.ts` | Create | Browser adapter for `driver-folder` pattern using `FileSystemDirectoryHandle` |
| `apps/format-editor/src/modules/launcher/` (dir) | Create | **Migrated** from `apps/launcher/src/`. DropZone, detection, recent folders. Wired as `HomeView.vue` → `/` route. |
| `apps/format-editor/src/modules/file/` (dir) | Create | **Migrated** from `file-format/src/`. Stores adjusted to reference shared `workspaceStore` and `metamodelStore`. |
| `apps/format-editor/src/modules/file/stores/document.ts` | Modify | Replace local `useFileSystem` with shared composable; hydrate from `workspaceStore.parsedModel` instead of re-parsing. |
| `apps/format-editor/src/modules/file/stores/workspace.ts` | Delete | Replaced by shared `stores/workspace.ts` |
| `apps/format-editor/src/modules/folder/` (dir) | Create | **New**. Tree view, element editor, graph edge editor. Uses format-core types only. |
| `apps/format-editor/src/modules/folder/stores/folderStore.ts` | Create | Pinia store: `tree[]`, `selectedElement`, `editElement()`, `bulkSave()`. Hydrates from `workspaceStore.parsedModel`. |
| `apps/format-editor/.eslintrc.cjs` | Create | `import/no-restricted-paths`: `modules/file → modules/folder`, `modules/folder → modules/file`. Both allowed: `stores/`, `shared/`. |
| `apps/launcher/` (dir) | Delete | Source moved to `modules/launcher/`. |
| Root `package.json` | Modify | Add `apps/format-editor` to workspaces if needed; remove `apps/launcher` workspace entry post-migration. |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | workspaceStore (handle, mode, permission), metamodelStore (derived frontmatter), folderStore (tree mutations), browserDriverFolder | Vitest + happy-dom (already in deps). Mock `FileSystemDirectoryHandle` with `structuredClone`-based fake. |
| Integration | Route guard (redirect when no handle), lazy module loading, cross-module navigation | Vitest + `@vue/test-utils` mounting `App.vue` with Pinia + Router. |
| E2E | Full flow: drop folder → detect mode → edit → save | Playwright. Verify no new tab opens, single process serves all routes. |
| Regression | format-core tests | Run `packages/format-core` vitest suite — must pass unchanged. |

## Open Questions

- [ ] **folderStore serialization**: Should a bulk save touch only dirty elements (requires dirty-tracking per `FolderElement`) or write all? R13 in the spec implies both modes are needed — flag for sdd-tasks.
- [ ] **Vue Router history mode**: Hash vs HTML5? Hash works out-of-the-box with `vite preview`; HTML5 needs server config. Decision needed before Phase 1.
- [ ] **Tailwind vs existing CSS variables**: file-format uses Tailwind, launcher uses CSS custom properties. Consolidate on one system during migration or keep both?
- [ ] **IndexedDB handle persistence**: launcher uses `showDirectoryPicker()` (no IndexedDB). file-format uses `db.ts` with IndexedDB. Which persistence model for the unified SPA?
