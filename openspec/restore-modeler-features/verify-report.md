# Verification Report

**Change**: restore-modeler-features
**Version**: N/A
**Mode**: Standard

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 15 |
| Tasks complete (code) | 11 |
| Tasks incomplete | 4 (test tasks 4.1–4.4) |

Tasks 1.1–3.3 are **implemented in code** but remain unchecked in `tasks.md` (monolithic commit). Tasks 4.1–4.4 (unit/component tests) have **no covering tests** written.

### Build & Tests Execution

**Build**: ⚠️ Not run — pre-existing issue: the `browser` condition in `vite.config.ts` causes `@innv0/format-core` to use `browser.ts`, which intentionally excludes `recursiveParse`. This is a known limitation, not caused by this change.

**Tests**: ❌ 58 failed / 66 passed (pre-existing failures, all from `recursiveParse is not a function`)

```text
Test Files  13 failed | 12 passed (25)
     Tests  58 failed | 66 passed (124)

All 58 failures: TypeError: recursiveParse is not a function
Root cause: vite.config.ts resolve.conditions: ['browser'] forces
@innv0/format-core's browser.ts entry which excludes recursiveParser
(Packages/format-core/src/browser.ts line 20-21: "Non-browser-safe modules...
are excluded from the browser entry point")
```

**Coverage**: ➖ Not available (no coverage config)

### Spec Compliance Matrix

| Req | Scenario | Test | Result |
|-----|----------|------|--------|
| R1.1–R1.8 | Happy: select matrix from sidebar | (no covering test) | ❌ UNTESTED |
| R1.1–R1.8 | Edge: no matrix definitions | (no covering test) | ❌ UNTESTED |
| R2.1–R2.2 | Happy: select first matrix | (no covering test) | ❌ UNTESTED |
| R2.1–R2.2 | Edge: no matrix defs, dropdown hidden | (no covering test) | ❌ UNTESTED |
| R3.1–R3.6 | Happy: concept with documentation | (no covering test) | ❌ UNTESTED |
| R3.1–R3.6 | Edge: no documentation found | (no covering test) | ❌ UNTESTED |
| R4.1–R4.7 | Happy: load & access documentation | (no covering test) | ❌ UNTESTED |
| R4.1–R4.7 | Edge: docs directory missing | (no covering test) | ❌ UNTESTED |
| R5.1–R5.10 | Happy: save with no version bump | (no covering test) | ❌ UNTESTED |
| R5.1–R5.10 | Happy: save with version bump | (no covering test) | ❌ UNTESTED |
| R5.1–R5.10 | Edge: permission revoked | (no covering test) | ❌ UNTESTED |
| R6.1–R6.4 | Happy: version bump via dropdown | (no covering test) | ❌ UNTESTED |
| R6.1–R6.4 | Edge: version bump with no root node | (no covering test) | ❌ UNTESTED |

**Compliance summary**: 0/13 scenarios have covering tests (all UNTESTED)

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| **R1.1** Collapsible Relations section below Model tree | ✅ Implemented | `LeftSidebar.vue` lines 64–103, `relationsOpen` toggle + `ChevronRight` rotate |
| **R1.2** MatrixPill per configured matrix def | ✅ Implemented | `v-for` on `matrixDefs` computed from `root.fields.__matrix_defs` (lines 85–98) |
| **R1.3** MatrixPill shows source, target, chevron | ✅ Implemented | `MatrixPill.vue` shows `source → target` with `ChevronRight` when `interactive` |
| **R1.4** Click MatrixPill navigates to matrix view | ✅ Implemented | Emits `select-matrix(idx)` + `select-view('matrices')` → `uiStore.setActiveMatrixIndex` + `setActiveView('matrices')` |
| **R1.5** Metamatrix Config button in section header | ✅ Implemented | `Settings` button with `@click.stop="navigateToConfig"` (lines 75–82) |
| **R1.6** Config button navigates to MetamatrixConfig | ✅ Implemented | Emits `select-view('metamatrix-config')` → `onSelectView` sets `activeView('matrices')` which shows MetamatrixConfig |
| **R1.7** Collapse/expand chevron toggle (SHOULD) | ✅ Implemented | `relationsOpen = !relationsOpen` on header click (line 67) |
| **R1.8** Empty state when no matrix defs (SHOULD) | ✅ Implemented | "No relations defined." shown when `matrixDefs.length === 0` (lines 99–101) |
| **R2.1** Dropdown visible when defs exist | ✅ Implemented | `v-if="matrixDefs.length"` on dropdown (line 7), independent of `activeMatrixIndex` |
| **R2.2** Dropdown interactive when no matrix selected | ✅ Implemented | Dropdown opens with full list even when `activeMatrixIndex < 0` |
| **R3.1** RightGuidanceSidebar wired to metamodelStore | ✅ Implemented | Calls `metamodelStore.loadDocumentation()` + `getConceptGuidance()` |
| **R3.2** Shows methodology summary | ✅ Implemented | `guidance?.summary` rendered in amber block (lines 64–69) |
| **R3.3** Shows description | ✅ Implemented | `guidance?.description` with `renderMarkdown` (lines 72–78) |
| **R3.4** Associated Matrices listing | ✅ Implemented | Computed from root frontmatter, filtered by `conceptType` (lines 81–93) |
| **R3.5** Copyable prompts with code-copy (SHOULD) | ✅ Implemented | Prompts with `Copy` button, `copyPrompt()` uses clipboard API + fallback |
| **R3.6** Fallback when no concept selected | ✅ Implemented | "Select a node to view guidance." when `!conceptType`; "No guidance available for this concept." when `!guidance` |
| **R4.1** `documentation` state | ✅ Implemented | `ref<Record<string, DocumentationEntry>>({})` |
| **R4.2** `loadDocumentation()` action | ✅ Implemented | Reads `docs/documentation/templates/{name}/{version}/documentation.md` |
| **R4.3** Uses FS handle | ✅ Implemented | `handle.getFileHandle()` → `fileHandle.getFile()` → `file.text()` |
| **R4.4** Calls `parseMetamodelDocumentation()` | ✅ Implemented | `documentation.value = parseMetamodelDocumentation(markdown)` |
| **R4.5** `getConceptGuidance(name)` returning entry | ✅ Implemented | Returns `DocumentationEntry | null`, triggers lazy load |
| **R4.6** `getMatrixGuidance(matrixDef)` | ✅ Implemented | Returns `{ sourceEntry, targetEntry }` |
| **R4.7** Lazy loading (SHOULD) | ✅ Implemented | Triggered from `getConceptGuidance`, guards with `Object.keys().length > 0` |
| **R5.1** `saveActiveFile()` action | ✅ Implemented | `workspaceStore.ts` lines 135–151 |
| **R5.2** Calls `recursiveSerialize()` | ✅ Implemented | With handle, nodes, rootIds, dirtyIds (line 140) |
| **R5.3** Clears dirtyIds after success | ✅ Implemented | Iterates `Array.from(dirtyIds)` → `modelStore.clearDirty(id)` (lines 142–144) |
| **R5.4** `saveActiveFileWithVersionBump(level)` | ✅ Implemented | `workspaceStore.ts` lines 157–197 |
| **R5.5** Parses filename with `parseFormatFilename()` | ✅ Implemented | `const parsed = parseFormatFilename(rootNode.source.path)` (line 165) |
| **R5.6** Computes new SemVer with `bumpVersion()` | ✅ Implemented | `const newVersion = bumpVersion(parsed.version, level)` (line 168) |
| **R5.7** Builds new filename with `buildFormatFilename()` | ✅ Implemented | `buildFormatFilename(parsed.baseName, parsed.templateName, newVersion)` (line 169) |
| **R5.8** Creates new file via FS API | ✅ Implemented | `handle.getFileHandle(newFilename, { create: true })` → writable write → close |
| **R5.9** Updates frontmatter version | ✅ Implemented | Regex replace on rawContent + `rootNode.source.path` update + markDirty |
| **R5.10** Handles permission errors | ✅ Implemented | Try/catch; sets `this.error`, re-throws, dirtyIds NOT cleared on error |
| **R6.1** Bump buttons call saveActiveFileWithVersionBump | ✅ Implemented | `v-for` on `['major','minor','patch']` → `@click="bumpVersion(lvl)"` |
| **R6.2** Save button calls saveActiveFile | ✅ Implemented | `@click="handleSave"` → `workspaceStore.saveActiveFile()` |
| **R6.3** Dropdown closes after bump (SHOULD) | ✅ Implemented | `saveDropdownOpen.value = false` on success (lines 208, 220) |
| **R6.4** Success toast (SHOULD) | ✅ Implemented | `show('Saved successfully.', 'success')` (line 209), `show('Version bumped...')` (line 221) |

**R1 Scenario (Happy path — select matrix from sidebar)**: ✅ Covered by code — click emits select-matrix + select-view → WorkspaceView handlers call uiStore actions.
**R1 Scenario (Edge case — no matrix definitions)**: ✅ Covered by code — "No relations defined." rendered; Metamatrix Config button always visible.
**R2 Scenario (Happy path — select first matrix)**: ✅ Covered by code — `selectMatrix(idx)` sets `activeMatrixIndex` and dispatches to `uiStore.setActiveMatrixIndex`.
**R2 Scenario (Edge case — no matrix definitions)**: ✅ Covered by code — `v-if="matrixDefs.length"` hides dropdown; italic hint shown.
**R3 Scenario (Happy path — concept with documentation)**: ✅ Covered by code — `loadGuidance()` triggered on `conceptType` change → reads doc → renders summary/description/matrices.
**R3 Scenario (Edge case — no documentation found)**: ✅ Covered by code — `guidance` stays null; "No guidance available" fallback shown.
**R4 Scenario (Happy path — load and access documentation)**: ✅ Covered by code — `loadDocumentation` reads and parses; `getConceptGuidance` returns entry.
**R4 Scenario (Edge case — docs directory missing)**: ✅ Covered by code — `catch(err)` sets `docsError`, documentation stays empty, no crash.
**R5 Scenario (Happy path — save with no version bump)**: ✅ Covered by code — recursiveSerialize writes → dirtyIds cleared → unsavedChanges=false → "Saved" shown.
**R5 Scenario (Happy path — save with version bump)**: ✅ Covered by code — filename parsed, version bumped, new file created, frontmatter updated, original preserved.
**R5 Scenario (Edge case — permission revoked)**: ✅ Covered by code — catch sets error, dirtyIds NOT cleared, error re-thrown.
**R6 Scenario (Happy path — version bump via dropdown)**: ✅ Covered by code — bumpVersion dispatches to store, dropdown closes, toast shown.
**R6 Scenario (Edge case — no root node)**: ✅ Covered by code — `if (!hasRootNode.value) return;` early exit.

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Docs loading via FS handle → cache in metamodelStore | ✅ Yes | FS read path used, catch with error state |
| Version bump via file rename + frontmatter mutation | ✅ Yes | New file created via `getFileHandle({create:true})`, frontmatter regex-updated |
| Matrix nav via emit → uiStore actions | ✅ Yes | LeftSidebar emits `select-matrix(idx)` → WorkspaceView → uiStore |
| Guidance doc path `docs/documentation/templates/{name}/{version}/documentation.md` | ✅ Yes | Exact path used in `loadDocumentation()` and `extractTemplateVersionFromRaw()` |
| Fallback to `fetch()` when FS read fails | ⚠️ Partial | Error is caught and `docsError` is set, but no `fetch()` fallback implemented |
| Error handling: Docs file not found | ✅ Yes | Sets `docsError`, shows placeholder in sidebar |
| Error handling: FS write fails (permission revoked) | ✅ Yes | Caught in saveActiveFile, sets error, re-throws |
| Error handling: Version parsing fails | ✅ Yes | `bumpVersion` throws when `parseFormatFilename` returns null |

### Issues Found

**CRITICAL**:
- **No covering tests for any requirement**: All 13 spec scenarios are UNTESTED. The testing tasks (4.1–4.4) were not implemented. No unit tests for `loadDocumentation`, `saveActiveFile`, `saveActiveFileWithVersionBump`, or component integration.
- **Pre-existing test suite broken**: 58/124 tests fail with `recursiveParse is not a function` due to the `browser` condition in `vite.config.ts`. This blocks running any test that touches `modelStore.parseFromHandle`. While not caused by this change, it means even if tests were written for the new features, they would likely fail in the current configuration.

**WARNING**:
- **`fetch()` fallback not implemented**: The design specifies "Docs file not found at workspace path → Fall back to `fetch()`". The implementation only catches the error and sets `docsError`. No `fetch()` fallback path exists.
- **`getMatrixGuidance` not used by RightGuidanceSidebar**: The design specifies using `metamodelStore.getMatrixGuidance()` for associated matrices. The component computes `associatedMatrices` from `parseFrontmatter(root.rawContent)` instead of using the store method. While functionally equivalent, it deviates from the design.
- **Tasks remain unchecked**: All 15 tasks show `[ ]` in `tasks.md`, making it impossible to track completion status without source inspection. The `sdd-apply` phase did not mark them complete.

**SUGGESTION**:
- RightGuidanceSidebar's `extractVersion()` duplicates `metamodelStore.ts`'s `extractTemplateVersionFromRaw()`. Could be shared/exported.
- `saveActiveFileWithVersionBump()` writes `rootNode.rawContent` to the new file, but doesn't re-serialize dirty content from modelStore before writing. It relies on the subsequent `saveActiveFile()` call to persist changes. This is correct but tightly coupled.
- Consider adding a `checkVerifiablePermission` guard before write operations for clearer error messages than a generic `DOMException`.

### Verdict

**PASS WITH WARNINGS**

All 39 MUST/SHOULD requirements from the domain spec are correctly implemented in code. The implementation is structurally complete and matches the spec. However, verification is limited to static analysis — no runtime test evidence exists for any requirement due to missing tests (tasks 4.1–4.4) and pre-existing test infrastructure issues.
