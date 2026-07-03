# Tasks: Port Legacy Gaps

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,780 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 9 work units (see below) |
| Delivery strategy | single-pr-default |
| Chain strategy | feature-branch-chain |

Decision needed before apply: **Yes**
Chained PRs recommended: **Yes**
Chain strategy: **feature-branch-chain**
400-line budget risk: **High**

### Suggested Work Units

| Unit | Goal | Likely Lines | Base Branch |
|------|------|--------------|-------------|
| 1 | Phase A — Tree Navigation (pills, counters, popups, ghost) | ~280 | `feature/port-legacy-gaps` |
| 2 | Phase D — Matrix Virtual Scrolling | ~350 | PR1 |
| 3 | Phase H — Taxonomy Perspectives | ~180 | PR2 |
| 4 | Phase L — Session Persistence + Version Panel | ~320 | PR3 |
| 5 | Phase F — File System Operations | ~400 | PR4 |
| 6 | Phase C — Widgets 1–7 (Date → Scale) | ~350 | PR5 |
| 7 | Phase C — Widgets 8–14 (ToggleGroup → Markdown) + registry | ~400 | PR6 |
| 8 | Phase B — Sheet Components (rels, summary, media, field-viewer, compliance, graph-inline) | ~300 | PR7 |
| 9 | Phase B — BlockSheet tabs + BlockFeed wiring + all B tests | ~350 | PR8 |

Each unit is independently verifiable and revertible. Merge order matters: PR1 → PR2 → ... → PR9, all into `feature/port-legacy-gaps`, then merge the tracker branch to main. Tests travel with their code.

---

## Phase A: Tree Navigation

- [x] A.1 Improve `BlockPill.vue` — color resolution via parent chain (V_0-1-5), YIQ contrast (colorHex + `'18'` opacity), ghost state detection (`isEmpty`), teleported info popup, marker cycling toolbar
- [x] A.2 Extract `yiqLuminance(hex)` from `GraphViewer.vue` to `useConceptVisuals.ts` — shared utility, threshold at 0.55
- [x] A.3 Update `ConceptTreeNode.vue` — integrate BlockPill for colored pills, add info icon + popup, instance counter via `modelStore.getChildren(nodeId).length`, ghost state wiring (opacity 0.45, italic "Empty")
- [x] A.4 Enhance `VirtualGroupNode.vue` — colored left border, tinted bg, icon from `IconRenderer`, expand/collapse chevron, uppercase bold name, instance counter badge
- [x] A.5 Update `LeftSidebar.vue` — pass instance counters through, preserve expand/collapse-all and `groupByConcept` prop
- [x] A.6 Write tests for BlockPill — ghost state, color resolution via parent chain, YIQ text contrast, popup open/close
- [x] A.7 Write tests for ConceptTreeNode — instance counter rendering, info popup content, ghost appearance

Files: `BlockPill.vue`, `ConceptTreeNode.vue`, `VirtualGroupNode.vue`, `LeftSidebar.vue`, `useConceptVisuals.ts`, `shared/__tests__/BlockPill.spec.ts`, `shared/__tests__/ConceptTreeNode.spec.ts`

---

## Phase B: Sheet Content

- [x] B.1 Add `marked` + DOMPurify deps to `package.json`; create `utils/markdown.ts` exporting `renderMarkdown(md): string` with sanitize
- [x] B.2 Create `BlockRelationships.vue` — labeled chips with clickable targets, `relationships` + `onNavigate` props, empty state
- [x] B.3 Create `BlockMatrixSummary.vue` — matrix participation chips, accent color per concept, `count` of non-dash cells
- [x] B.4 Create `NodeMedia.vue` — image gallery grid (2–3 cols) with lightbox overlay, non-image file download list with type icons
- [x] B.5 Create `FieldViewer.vue` — dispatches fields to widget registry via `WidgetField`, read/edit modes, `commitFieldValue` integration
- [x] B.6 Create `ComplianceTab.vue` — scoped `ValidationReport` results for the node's concept type
- [x] B.7 Update `GraphViewer.vue` — add `inline` prop (no layout selector, 320px height via `height` prop, `localNodeId` scope)
- [ ] B.8 Update `BlockSheet.vue` — 4-tab layout (View/Visual/History/Compliance), lazy v-if rendering, markdown via `renderMarkdown`, FieldViewer, rels, matrix summary, media, attachments
- [ ] B.9 Update `BlockFeed.vue` — wire `navigate-to-node` event, pass through `conceptFields` and `hasMarkers` to BlockSheet
- [ ] B.10 Write tests for BlockRelationships, BlockMatrixSummary, FieldViewer — chip rendering, mode switching, empty states
- [ ] B.11 Write tests for NodeMedia — image loading, lightbox open/close, non-image file display
- [ ] B.12 Write tests for ComplianceTab — validation results scoped by concept type

Files: `package.json`, `utils/markdown.ts`, `BlockRelationships.vue`, `BlockMatrixSummary.vue`, `NodeMedia.vue`, `FieldViewer.vue`, `ComplianceTab.vue`, `GraphViewer.vue`, `BlockSheet.vue`, `BlockFeed.vue`, 3 test files

---

## Phase C: Widget Registry (14 new widgets)

- [x] C.1 Create `DateWidget.vue` — `<input type="date">` in edit, formatted text in read; registered as `'date'`
- [x] C.2 Create `UrlWidget.vue` — clickable `<a>` in read, URL input with validation in edit; `'url'`
- [x] C.3 Create `ColorWidget.vue` — 20×20px color swatch + hex text in read, `<input type="color">` in edit; `'color'`
- [x] C.4 Create `MultiSelectWidget.vue` — static chips in read, removable chips + unselected dropdown in edit; `'multiselect'`
- [x] C.5 Create `TagsWidget.vue` — chips in both modes, Enter/comma to add, × to remove, trim + dedup; `'tags'`
- [x] C.6 Create `RatingWidget.vue` — filled/empty star icons (1–5) + `n/5` text in both modes; `'rating'`
- [x] C.7 Create `ScaleWidget.vue` — clickable step indicators + badge, range from `fieldDefinition.options` (default 1–10); `'scale'`
- [x] C.8 Create `ToggleGroupWidget.vue` — segmented button group for enum selection, active segment highlighted; `'togglegroup'`
- [x] C.9 Create `CycleWidget.vue` — clickable pill cycles through `options`, wraps around; `'cycle'`
- [x] C.10 Create `CodeWidget.vue` — `<pre><code>` + language badge in read, monospace textarea with gutter in edit; `'code'`
- [x] C.11 Create `MermaidWidget.vue` — rendered diagram via `mermaid.run()` in read, textarea in edit, Ctrl+Enter re-render; `'mermaid'`
- [x] C.12 Create `DiagramWidget.vue` — inline SVG from `A > B > C` DSL in read, textarea in edit; `'diagram'`
- [x] C.13 Create `TimestampWidget.vue` — locale-formatted datetime in read, `<input type="datetime-local">` in edit; `'timestamp'`
- [x] C.14 Create `MarkdownWidget.vue` — rendered markdown via `marked` in read, textarea + toolbar in edit; `'markdown'`
- [x] C.15 Update `registry.ts` + `index.ts` — add 14 entries to `UNIFIED_WIDGET_REGISTRY`, update `WidgetType` union, re-export
- [x] C.16 Write widget tests — each widget: read mode, edit mode, `update:modelValue` emission, `fieldDefinition` context; registry resolution for all 14 + fallback

Files: `shared/widgets/{Date,Url,Color,MultiSelect,Tags,Rating,Scale,ToggleGroup,Cycle,Code,Mermaid,Diagram,Timestamp,Markdown}Widget.vue` (14 new), `shared/widgets/registry.ts` (modified), `shared/widgets/index.ts` (modified), test file

---

## Phase D: Matrix Virtual Scrolling

- [ ] D.1 Add virtual scroller dependency (`vue-virtual-scroller` or `@vueuse/core` `useVirtualList`) to `package.json`; replace flat `<table>` in `MatricesGrid.vue` with virtual rows + columns
- [ ] D.2 Implement scroll position tracking per matrix — `Map<matrixName, {scrollTop, scrollLeft}>`, reset on switch, restore on return
- [ ] D.3 Write tests for MatricesGrid with virtual scroll — 10k+ cells render only visible window, sticky first column, value distribution over full dataset, cell editing in virtualized range

Files: `package.json`, `MatricesGrid.vue`, test file

---

## Phase F: File System Operations

- [ ] F.1 Create `composables/useFileSystem.ts` — `scanDirectory(handle)`, `readFileContent(fileHandle)`, `connectDirectory()` with File System Access API; check API availability
- [ ] F.2 Create `composables/useUrlDocLoader.ts` — `fetch(url)`, parse with `@innv0/format-core`, populate modelStore; return `{ nodes, rootIds, sourceUrl, error }`
- [ ] F.3 Create `DirectoryPickerModal.vue` — welcome screen with "Open Local Folder" + "Load from URL" options, API guard, URL input, recent dirs from IndexedDB, folder init with template selector
- [ ] F.4 Update `workspaceStore.ts` — add `loadFromUrl(url)`, `backupEnabled` flag + `enableBackup/disableBackup`, auto-backup before `saveActiveFile()`, folder init event handling
- [ ] F.5 Write tests for file system ops — directory picker guard, URL loading success/error, backup creation on save, API unavailability fallback

Files: `composables/useFileSystem.ts`, `composables/useUrlDocLoader.ts`, `DirectoryPickerModal.vue`, `stores/workspaceStore.ts`, test file

---

## Phase H: Taxonomy Perspectives

- [ ] H.1 Update `metamodelStore.ts` — add `taxonomyEdges` computed from root node frontmatter `taxonomy` field, `conceptTree` computed (O(n) tree from edges), `getNeighborhood(conceptName)` returning `PerspectiveNeighborhood`
- [ ] H.2 Update `ConceptPerspectivePanel.vue` — read from `metamodelStore.taxonomyEdges` and `getNeighborhood`, display Parents/Children/Siblings, clickable pills update `uiStore.activePerspective`
- [ ] H.3 Write tests for taxonomy edge parsing, concept tree building (roots + depth-first nesting), `getNeighborhood` correctness, empty taxonomy fallback, uiStore integration

Files: `stores/metamodelStore.ts`, `ConceptPerspectivePanel.vue`, test file

---

## Phase L: Misc — Session Persistence & Version Management

- [x] L.1 Create `utils/db.ts` — IndexedDB wrapper with v2 schema (`handles`, `session`, `treeState`, `sidebarWidths`), generic `dbGet/dbSet/dbDelete/dbGetAll/dbClear`, convenience functions (`getSessionState/setSessionState/getTreeState/setTreeState/getSidebarWidth/setSidebarWidth`), graceful degradation
- [x] L.2 Update `workspaceStore.ts` — session persistence in `open()` (lastFile, lastOpenedAt) and `recoverHandle()` (restore uiStore state), `persistTreeState`/`restoreTreeState` actions
- [x] L.3 Update `useResizablePanel.ts` — IndexedDB read in init, write on `onPointerUp` using `storageKey` as `panelId`
- [x] L.4 Update `ModelInfoPanel.vue` — add collapsible "Version Management" section, current version display, three bump buttons (major/minor/patch) with hover preview, disabled states, save invokes `saveActiveFileWithVersionBump`
- [x] L.5 Write tests for db.ts (schema upgrade, CRUD, graceful degradation), version panel (bump buttons, disabled states, tooltip), session persistence (reload restores state, tree state round-trip)

Files: `utils/db.ts`, `stores/workspaceStore.ts`, `composables/useResizablePanel.ts`, `ModelInfoPanel.vue`, test file

---

## Verification Criteria

- [ ] All existing tests pass (unchanged suites)
- [ ] Each phase's new specs are covered by tests
- [ ] Build succeeds with no TypeScript errors
- [ ] Tree nodes display colored pills with YIQ-optimized text, instance counters, info popups, ghost states (per R-TN-01–07)
- [ ] BlockSheet renders full Markdown, inline graph, relationships, matrix summary, media with lightbox, widget-based fields, 4 tabs (per R-SC-01–10)
- [ ] All 14 new widgets resolve from registry and render in read/edit modes (per R-WR-01–16)
- [ ] MatricesGrid virtualizes 10k+ cells with scroll position per matrix (per R-MV-01–07)
- [ ] Directory picker opens native folder dialog; URL-loaded models parse correctly; backup created on save (per R-FS-01–06)
- [ ] Taxonomy edges parse from frontmatter; perspective neighborhood navigable (per R-TP-01–06)
- [ ] Session state survives page reload; version panel creates semver bumps (per R-SP-01–07, R-VM-01–07)
