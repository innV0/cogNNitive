# Tasks: Ecosystem Consolidation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 3,500+ |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (FILE+LAUNCHER migrate) → PR 3 (FOLDER build) → PR 4 (Integration+cleanup) |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base |
|------|------|-----------|------|
| 1 | SPA skeleton, shared stores, shared composables, ESLint boundaries | PR 1 | feature/ecosystem-consolidation |
| 2 | FILE module migration (~50 files moved) + LAUNCHER migration (~7 files) | PR 2 | PR 1 branch |
| 3 | FOLDER module from scratch (8 files, zero AI) | PR 3 | PR 2 branch |
| 4 | Router wiring, guard, verification, cleanup (archive old repos) | PR 4 | PR 3 branch |

---

## Phase 1: Foundation (PR 1)

- [ ] 1.1 Create `apps/format-editor/package.json`: vue 3.5, pinia 2.1, vue-router 4, `@innv0/format-core: workspace:*`, tailwindcss 3.4, vite 6
- [ ] 1.2 Create `apps/format-editor/vite.config.ts`: `@/` alias → `src/`, vue plugin, hash router mode, browser resolve condition
- [ ] 1.3 Create `index.html`, `src/main.ts` (createApp→createPinia→createRouter→mount), `src/App.vue` (`<router-view/>`)
- [ ] 1.4 Create `src/router/index.ts`: 3 lazy routes (`/`→HomeView, `/file`→FileEditorView, `/folder`→FolderEditorView), `beforeEach` guard checking `workspaceStore.hasHandle`
- [ ] 1.5 Create `src/stores/workspace.ts` (Pinia): `handle`, `hasHandle`, `mode`, `parsedModel`, `importFromDrop(items)`, `verifyPermission()`. Load IndexedDB handle on boot (single `FORMAT-db`)
- [ ] 1.6 Create `src/stores/metamodel.ts` (Pinia): `concepts`, `markers`, `matrices`, `hierarchyConcepts` derived from `workspaceStore.parsedModel.frontmatter`
- [ ] 1.7 Create `src/shared/composables/useFileSystem.ts`: extract FS primitives from `file-format/src/composables/useFileSystem.ts` — `initialize()`, `readFile()`, `writeFile()`, `walk()`, `scanDirectory()`, `verifyPermission()`
- [ ] 1.8 Create `src/shared/utils/browserDriverFolder.ts`: mirrors `format-core/src/driver-folder.ts` pattern — `walkDirectory(handle)`, `discoverFolder(handle)` — using `FileSystemDirectoryHandle` instead of `node:fs`
- [ ] 1.9 Create `apps/format-editor/.eslintrc.cjs`: `import/no-restricted-paths` — `modules/file → modules/folder` blocked, `modules/folder → modules/file` blocked; both allow `@/stores/`, `@/shared/`

## Phase 2: Migrate FILE module (PR 2)

- [ ] 2.1 Copy `file-format/src/` → `apps/format-editor/src/modules/file/` preserving structure: `components/editor/` (18 files), `components/layout/` (6 files), `components/ui/` (2 files), `composables/` (5 files + `__tests__/`), `stores/` (3 files + `__tests__/`), `types/index.ts`, `utils/` (12 files + `__tests__/`)
- [ ] 2.2 Update imports: `@/` → `@/modules/file/` in all .vue/.ts files; `../types` → `@/modules/file/types`; `@innv0/format-core` stays unchanged
- [ ] 2.3 Delete `modules/file/stores/workspace.ts` — replaced by `@/stores/workspace` (Phase 1)
- [ ] 2.4 Refactor `modules/file/stores/document.ts`: import `useWorkspaceStore` from `@/stores/workspace`; hydrate from `workspaceStore.parsedModel` instead of re-parsing `_FORMAT.md`; use shared `useFileSystem` composable for save
- [ ] 2.5 Refactor `modules/file/stores/metamodel.ts`: import from `@/stores/metamodel` (merge concepts/markers from shared store); remove duplicate local parse logic
- [ ] 2.6 Create `modules/file/FileEditorView.vue` — lazy route entry; onMounted reads `workspaceStore.parsedModel`, populates `documentStore`, renders file-format editor UI

## Phase 3: Build FOLDER module (PR 3)

- [ ] 3.1 Create `modules/folder/types.ts`: re-export `FolderElement`, `SpecFrontmatter`, `GraphEdge` from `format-core`; add `FolderOptions`, `DirtyElement` locals
- [ ] 3.2 Create `modules/folder/composables/folderLoader.ts`: `loadFolderElements(handle: FileSystemDirectoryHandle)` — calls `browserDriverFolder.discoverFolder()`, returns `FolderElement[]`. Implements `discoverFolder()` per R10 (walks tree, collects `_FORMAT.md` paths, excludes `iNNfo.md` per R16)
- [ ] 3.3 Create `modules/folder/composables/folderWriter.ts`: `saveElement(handle, element: FolderElement)` — serializes element fields/markers/graphEdges to `_FORMAT.md` frontmatter; `bulkSave(handle, elements, dirtyPathSet)` — writes only hash-differing elements (R13)
- [ ] 3.4 Create `modules/folder/stores/folderStore.ts` (Pinia): `tree[]` (FolderElement nesting), `selectedPath`, `editElement(path, patch)`, `dirtySet` (Set<string> via content-hash comparison), `bulkSave()` calling folderWriter, hydrates from `workspaceStore.parsedModel` on activation
- [ ] 3.5 Create `modules/folder/components/FolderTree.vue`: recursive tree rendering `FolderElement.children`, expand/collapse, selection emit, empty-state when tree is empty (R11). Uses format-core `FolderElement` type directly
- [ ] 3.6 Create `modules/folder/components/ElementSheet.vue`: edit selected element's `type`, `fields` (key-value), `markers` (key-value), `graph_edges` (target+label pairs) (R12). Emits patches to `folderStore.editElement()`
- [ ] 3.7 Create supporting sub-components: `FieldsForm.vue` (dynamic form from `FieldDefinition[]`), `MarkersBadge.vue` (marker chips with color/icon), `GraphEdgesEditor.vue` (edge list with add/remove)
- [ ] 3.8 Create `modules/folder/FolderEditorView.vue`: lazy route entry; onMounted hydrates folderStore from workspaceStore.parsedModel; renders FolderTree + ElementSheet in split pane. ZERO AI imports, SDKs, or generation UI (R14)

## Phase 4: Migrate LAUNCHER module (PR 2)

- [ ] 4.1 Copy `apps/launcher/src/` → `apps/format-editor/src/modules/launcher/`: `components/DropZone.vue`, `components/FolderExplorer.vue`, `components/RecentFolders.vue`, `components/ResultCard.vue`, `components/SampleFolders.vue`, `components/ToastMessage.vue`, `components/ValidationReport.vue`, `composables/useAppUrls.ts`, `composables/useToast.ts`, `utils/detector.ts`, `utils/history.ts`, `utils/validator.ts`, `types.ts`
- [ ] 4.2 Adapt `DropZone.vue`: accept `FileSystemDirectoryHandle` via `showDirectoryPicker()` (not legacy `input[webkitdirectory]`); call `workspaceStore.importFromDrop(items)` → detection + parse + `router.push(/file|/folder)` (R4, R5). Remove all `window.open()` calls
- [ ] 4.3 Adapt `utils/detector.ts`: integrate `detectMode()` with `browserDriverFolder.discoverFolder()`; store parsed model in `workspaceStore.parsedModel` (single parse per R6); detect FILE (`.md` with `mode:"FILE"`) vs FOLDER (root `_FORMAT.md`) per R5
- [ ] 4.4 Create `modules/launcher/HomeView.vue`: wraps DropZone + RecentFolders; header with "cogNNitive" branding; uses IndexedDB (`FORMAT-db`) for recent folders persistence

## Phase 5: Integration + Cleanup (PR 4)

- [ ] 5.1 Wire router: verify all 3 lazy routes load; `beforeEach` guard redirects `/file`/`/folder`→`/` when `hasHandle=false` (R3)
- [ ] 5.2 Verify single parse pass: drop folder → `importFromDrop()` parses once → `/file` and `/folder` hydrate from `workspaceStore.parsedModel` without re-reading FS (R6, R7)
- [ ] 5.3 Verify cross-module nav: navigate launcher→`/file`→`/folder` without re-prompting permission (R2)
- [ ] 5.4 Verify ESLint boundaries: confirm `file ↔ folder` cross-imports are blocked, `stores/` and `shared/` allowed (R15)
- [ ] 5.5 Verify no AI in folder: scan `modules/folder/` for AI imports/SDKs/generation UI — must be zero (R14)
- [ ] 5.6 Run `packages/format-core/` test suite — all tests must pass unchanged
- [ ] 5.7 Run `apps/format-editor/` unit tests (Vitest + happy-dom): workspaceStore handle lifecycle, folderStore dirty tracking, browserDriverFolder walk
- [ ] 5.8 Remove `apps/launcher/` directory; update root `package.json` workspaces (remove launcher entry if present)
- [ ] 5.9 Archive sibling repos: mark `file-format/` and `folder-format/` as read-only (add `.archived` marker, update README)
