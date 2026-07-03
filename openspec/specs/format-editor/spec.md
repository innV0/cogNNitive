# Delta for format-editor (hierarchy-model)

## Purpose

Correct the FOLDER-mode hierarchy derivation in the recursive parser (`recursiveParser.ts`). Establishes the Root/Concept/Element/Sub-element node model, a per-mode source of truth for hierarchy on read, and the rule that a directory without `_FORMAT.md` is a concept/group node that the walk must recurse into rather than abort on. Refines `deep-integration`'s R5 (Recursive Parser — Read). Read-only: no index-block generation, no FILE↔FOLDER conversion, no wikilink/relationship-view/AI work.

## MODIFIED Requirements

### Requirement: Recursive Parser (Read)

The parser MUST walk a workspace recursively, and for each node invoke `format-core`'s FILE or FOLDER read primitive according to that node's on-disk representation, inserting the result into the same `modelStore` graph. A directory with no `_F.md` MUST NOT abort the walk: it MUST become a concept/group node, and the walk MUST recurse unconditionally into that directory's children. A directory with a present but unparseable `_F.md` MUST report an issue for that node AND still recurse into that directory's children (its subtree is not dropped).

(Previously: a missing `_F.md` was treated as a fatal parse failure — `parseFolderNode`'s catch block returned before reaching `dirHandle.entries()`, aborting the branch and silently dropping the whole subtree.)

#### Scenario: Recursive read across mixed tree

- GIVEN workspace root is FOLDER with nested FILE and FOLDER children
- WHEN the parser runs
- THEN all nodes (root and descendants, regardless of mode) appear in the same graph

#### Scenario: Missing `_FORMAT.md` becomes a concept node and recursion continues

- GIVEN a directory has no `_F.md` (e.g. `AILab`)
- WHEN the parser visits that directory
- THEN the directory becomes a concept/group node
- AND the walk recurses into its child entries instead of aborting

#### Scenario: Present-but-unparseable `_FORMAT.md` still recurses

- GIVEN a directory's `_F.md` exists but fails to parse (malformed content)
- WHEN the parser visits that directory
- THEN an issue is reported for that node's path
- AND the walk still recurses into that directory's children (no subtree is dropped)

#### Scenario: Read failure isolated to one node

- GIVEN one nested node is malformed
- WHEN the parser runs
- THEN an error is reported for that node; sibling nodes still parse into the graph

## ADDED Requirements

### Requirement: Concept/Element/Sub-element Node Model

The graph MUST distinguish three node kinds beneath the root: Concept (a type, from the metamodel), Element (an instance of a concept), and Sub-element (a nested instance). Children MUST follow this rule: the root's children are concepts; a concept's children are its elements; an element's children are its sub-elements.

#### Scenario: Bare directory recognized as a concept

- GIVEN a top-level directory has no `_FORMAT.md` (e.g. `AILab`)
- WHEN the tree is built
- THEN the directory is represented as a concept node, not an element node

#### Scenario: Directory with `_FORMAT.md` and `type` recognized as an element

- GIVEN a directory has a parseable `_F.md` declaring `type: "AILab"` (e.g. `AILab/Anthropic`)
- WHEN the tree is built
- THEN the directory is represented as an element node of concept `AILab`, nested under the `AILab` concept node

### Requirement: Union of In-File and Directory Children

The children of a node MUST be the union of its in-file children (derived from the index-block taxonomy via `normalizeElementsIntoGraph`) and its child directories/files, with no duplicate and no dropped children.

#### Scenario: Union with no in-file children

- GIVEN a concept node has only child directories and no index-block taxonomy entries
- WHEN the tree is built
- THEN all child directories appear as children with no duplicates

#### Scenario: Union with both sources present

- GIVEN a node has index-block taxonomy children AND child directories
- WHEN the tree is built
- THEN the node's children are the union of both sources, and no child is counted twice or omitted

### Requirement: Per-Mode Hierarchy Source of Truth (Read)

On read, the source of truth for hierarchy MUST be per-mode: for FILE nodes, the index block (`taxonomy`) is the source of truth for element hierarchy; for FOLDER nodes, the directory structure is the source of truth. The root index block MUST NOT be treated as a hierarchy source for a FOLDER-mode subtree.

#### Scenario: FILE node hierarchy from index block

- GIVEN a FILE node's `_F.md` declares an index-block taxonomy
- WHEN the parser builds that node's element hierarchy
- THEN the hierarchy matches the taxonomy edges, not any directory structure

#### Scenario: FOLDER node hierarchy from directory structure

- GIVEN a FOLDER-mode root has bare concept directories and element leaf directories
- WHEN the parser builds the tree
- THEN the hierarchy is derived from directory nesting, and the root's own index block (if any) is not used to derive that FOLDER subtree's hierarchy

### Requirement: Metamodel Binding with Structural Fallback

A concept/group node MUST bind to a matching metamodel concept when the resolved metamodel provides one (semantic enrichment). When the metamodel cannot be resolved (e.g. browser-side parent-spec-chain resolution is unavailable), the node MUST remain a structural concept/group node rather than being dropped, altered incorrectly, or causing a crash.

#### Scenario: Metamodel resolves the concept

- GIVEN the resolved metamodel defines concept `AILab`
- WHEN a bare directory named `AILab` is parsed
- THEN the concept node is tagged as bound to metamodel concept `AILab`

#### Scenario: Metamodel cannot be resolved

- GIVEN the metamodel cannot be resolved in the browser for a bare directory
- WHEN that directory is parsed
- THEN the directory still becomes a structural concept/group node
- AND its subtree is still walked and included in the graph

### Requirement: Catalog Fixture Loads to a Non-Empty Tree

Loading a catalog-shaped directory handle (root `_FORMAT.md` in FOLDER mode, bare concept directories, element leaf directories with `_FORMAT.md` and `type:`) MUST yield a non-empty tree containing each bare concept directory as a concept node with its element leaf directories as children.

#### Scenario: `AI_Industry_V_1-0-0_catalog`-shaped fixture parses end-to-end

- GIVEN a catalog-shaped fixture modeled on `models/AI_Industry_V_1-0-0_catalog/` (bare `AILab` directory containing `Anthropic/_F.md` with `type: "AILab"`)
- WHEN `recursiveParse` runs over the fixture's root directory handle
- THEN the resulting tree is non-empty
- AND it contains concept node `AILab` with element child `Anthropic`
- AND `Anthropic` carries `type: "AILab"`

### Requirement: Scope Guard — No Write-Path, Conversion, or Downstream Feature Changes

This slice MUST NOT introduce index-block generation on save, FILE↔FOLDER conversion, cross-boundary wikilinks or their UI, relationship view editors, or AI functionality. `packages/format-core`'s public API and behavior MUST remain unchanged.

#### Scenario: No index-block generation triggered by this slice's read fix

- GIVEN a FOLDER-mode workspace is parsed and no save is performed
- WHEN the tree is inspected
- THEN no index block has been generated or written for any FOLDER node

#### Scenario: `format-core` unchanged

- GIVEN `packages/format-core`'s existing test suite and public API
- WHEN this slice's changes are applied
- THEN the suite passes unchanged and no existing signature or behavior is altered

---

## Port-Legacy-Gaps Delta Requirements

The following requirements were introduced by the `port-legacy-gaps` change, which ported legacy features from predecessor SPAs (file-format, folder-format) into the format-editor.

### Requirement: BlockSheet — Extended Content Sections

The existing `BlockSheet.vue` (which currently renders a header, markers, edit fields, inline markdown description, field list, and a simple relationships section) MUST be extended with:

- **Full Markdown rendering** using the `marked` library (instead of `renderInlineMarkdown`)
- **Inline GraphViewer** mode in a `320px` container when the "Visual" tab is active
- **BlockRelationships** component replacing the current inline relationships list
- **BlockMatrixSummary** chips section showing matrix participation
- **NodeMedia** component for asset display with lightbox
- **FieldViewer** widget-based field rendering replacing the current simple field list
- **Four detail tabs** (View, Visual, History, Compliance) replacing the current single-body layout
- **File attachments** section at the bottom of the View tab

The existing `isEditing` mode MUST remain functional and render the current field editor layout (WidgetField grid + description textarea). The read-mode body MUST now use the tab system.

#### Scenario: BlockSheet render modes unchanged for edit

- GIVEN a BlockSheet in edit mode
- WHEN the user clicks the pencil icon
- THEN the existing field grid and description textarea render (identical to current behavior)
- AND the new tabs/content sections are hidden during edit

### Requirement: BlockFeed — Pass-through Wiring

`BlockFeed.vue` MUST pass through all new events and props to `BlockSheet`:

- `navigate-to-node` event from inline GraphViewer and relationships
- `show-add-child` button on the concept sheet (already wired)
- The `conceptFields` and `hasMarkers` props pass through unchanged

The `selectedItemName` behavior (expanding the matching instance sheet) MUST remain unchanged.

### Requirement: LeftSidebar — Instance Counters and Grouping Refinements

`LeftSidebar.vue` MUST remain compatible with the revised tree components:

- The `groupByConcept` prop on `ConceptTreeNode` MUST continue to work
- Instance counters in `VirtualGroupNode` MUST render via the existing `children.length` display
- The "Relations" section with `MatrixPill` components MUST remain unchanged
- Graph View button must continue routing to `uiStore.setActiveView('graph')`

The existing resize handle at the right edge of the sidebar MUST continue to work. Sidebar width persistence is handled by the session-persistence spec.

### Requirement: ConceptTreeNode — Colored Pills, Popups, Ghost States

`ConceptTreeNode.vue` MUST be extended with:

- Colored pills with YIQ-optimized text contrast
- Info icon button (appears on hover) with teleported popup
- Ghost state rendering for empty nodes
- Instance counter for concept-like nodes

The existing recursive child rendering, virtual grouping, expand/collapse, and move-up/move-down controls MUST remain unchanged.

### Requirement: VirtualGroupNode — Enhanced Styling

`VirtualGroupNode.vue` MUST use enhanced styling: colored left border (`borderLeft: '3px solid'` the concept color), light background tint, expand/collapse chevron, concept icon from `IconRenderer`, uppercase bold tracking-wider name in the concept color, and an instance counter badge. The existing recursive `ConceptTreeNode` rendering for children MUST remain unchanged.

### Requirement: MatricesGrid — Virtual Scrolling (replaces flat table)

`MatricesGrid.vue` MUST replace its current flat `<table>` rendering with virtual scrolling for both rows and columns. The matrix definition parsing (`__matrix_defs`), cell storage format (`MatrixName||Row||Col` keys), and Markdown export MUST remain unchanged.

The existing matrix dropdown selector, value distribution bar, and copy-table button MUST remain functional and interact with the virtual scroller.

### Requirement: GraphViewer — Inline Mode Slot

`GraphViewer.vue` MUST support a new `inline` mode prop. When `inline: true`:

- Height is constrained to `320px` (configurable via a `height` prop)
- No layout selector header renders
- The zoom controls remain (intrinsic to d3 zoom)
- The `localNodeId` prop scopes the graph to the given node's relationships

The existing full-page mode (no `inline` prop) MUST remain unchanged.

### Requirement: modelStore — Enhanced Node Support

`modelStore` MUST support the new fields that the ported components rely on:

- `assets?: string[]` on `ModelNode` — already exists in the type definition but may not be populated by the current parser. The parser MUST NOT be modified in this slice; store actions must handle `assets` if present.
- `assetMode?: 'centralized' | 'per-element'` — already exists in `ModelNode` type.

No new store actions are needed. The existing `upsertNode`, `markDirty`, `getNode`, `getChildren`, `getRoots` continue to work.

### Requirement: metamodelStore — Taxonomy and Perspectives

`metamodelStore` MUST be extended with:

- `taxonomyEdges` computed property — taxonomy edges parsed from root node frontmatter `taxonomy` field
- `conceptTree` computed property — hierarchical tree from edges
- `getNeighborhood(conceptName)` function — returns parents, children, and perspective

The existing `concepts`, `markers`, `getConceptByName`, `getConceptFields`, documentation, and guidance accessors MUST remain unchanged.

### Requirement: workspaceStore — Auto-Backup, URL Loading, Version Save

`workspaceStore` MUST integrate:

- Auto-backup before save (`backupEnabled` flag, `enableBackup`/`disableBackup` actions)
- `loadFromUrl(url)` action
- The existing `saveActiveFileWithVersionBump` action MUST be verified to work with the new version panel

#### Scenario: Auto-backup runs before save

- GIVEN `workspaceStore.backupEnabled` is `true` and a node is dirty
- WHEN `saveActiveFile()` runs
- THEN a backup is written to `backups/` before the main save
- AND the backup filename includes the current timestamp

### Requirement: utils/db.ts — Session, Tree State, Sidebar Persistence

A new `utils/db.ts` module MUST provide IndexedDB persistence: generic wrapper with versioned schema (v2, database name `'format-editor'`), stores for `session`, `treeState`, and `sidebarWidths`. The existing `openHandleDb`/`storeHandle`/`loadStoredHandle` in `workspaceStore` MUST continue to work alongside the new module (they use the same database but different object stores).

### Requirement: ModelInfoPanel — Version Management Section

`ModelInfoPanel.vue` MUST add a version management section with current version display, three bump buttons (major/minor/patch) with hover preview, description text, and save button. The version panel MUST be disabled when no handle, currently saving, or no root node. The existing model metadata display, workspace info, and plain text view MUST remain unchanged.
