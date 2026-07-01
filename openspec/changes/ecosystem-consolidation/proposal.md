# Proposal: Ecosystem Consolidation

## Intent

Collapse 3 standalone apps (launcher, file-format, folder-format) into a single Vue 3 SPA inside the cogNNitive monorepo. Eliminate `window.open()` routing, duplicate FS access, double frontmatter parsing, and cross-repo drift. Unify on Vue 3 + format-core — folder-format's React fork and AI system are removed, not migrated.

## Scope

### In Scope
- `apps/format-editor/` — single SPA with lazy-loaded routes: `/`, `/file`, `/folder`
- Migrate file-format into `modules/file/` (move files, adjust imports)
- Build `modules/folder/` from scratch on format-core (Vue 3 + Pinia)
- Migrate launcher as `modules/launcher/` → HomeView (`/` route)
- 2 shared stores: `workspaceStore` (FS handle, permissions) + `metamodelStore` (concepts, markers)
- 2 document stores: `documentStore` (FILE mode) + `folderStore` (FOLDER mode)
- ESLint `import/no-restricted-paths` for module boundary enforcement
- vue-router `beforeEach` guard: redirect to `/` if no FS handle

### Out of Scope
- All AI code from folder-format (~40K lines) — removed, not migrated
- Changes to `packages/format-core`
- CI/CD or deployment pipeline
- Backward-compat shims for sibling repos (they will be archived)

## Capabilities

### New Capabilities
- `format-editor`: unified SPA that replaces 3 apps; handles FILE + FOLDER mode editing with persistent workspace state

### Modified Capabilities

None — no existing specs in `openspec/specs/`.

## Approach

5-phase migration inside the monorepo:

1. **Skeleton**: Create `apps/format-editor/` with Vue Router, Pinia, shared stores, `shared/` components
2. **Migrate file-format**: Move `file-format/src/` into `modules/file/`, adjust `@innv0/format-core` imports to workspace protocol
3. **Build folder editor**: Write `modules/folder/` from scratch using format-core types (no MOF custom types)
4. **Migrate launcher**: Move `launcher/src/` into `modules/launcher/`, wire as HomeView (`/`)
5. **Integrate**: Connect router, guard, stores; verify single parse pass; archive old repos

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/format-editor/` | **New** | Unified SPA with router, stores, 3 lazy modules |
| `apps/launcher/` | **Removed** | Migrated into modules/launcher/ |
| `packages/format-core/` | **Unchanged** | Referenced via workspace protocol |
| `file-format/` (sibling repo) | **Archived** | Source moved; repo set to read-only |
| `folder-format/` (sibling repo) | **Archived** | NOT migrated (React); repo set to read-only |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration regressions in file-format editor | Medium | Move files as-is first, then adjust; test each route independently |
| TypeScript path resolution for monorepo imports | Low | Use npm workspace protocol (`"@innv0/format-core": "workspace:*"`) |
| Folder editor scope creep (rebuilding from scratch) | Medium | Cap at format-core parity — no new features, only spec-compliant editing |
| Churn from large migration diff | High | Commit per phase; use chained PRs if line budget exceeded |

## Rollback Plan

Single PR — revert to restore. Sibling repos remain untouched until Phase 5 archive step; they serve as rollback target. Each phase commits independently, enabling granular revert.

## Dependencies

- `packages/format-core` must remain API-stable (no breaking changes during consolidation)
- Vue Router 4 + Pinia as new runtime deps for `apps/format-editor/`

## Success Criteria

- [ ] `vite dev` serves `/`, `/file`, and `/folder` routes from single process (no run-dev.bat)
- [ ] Dropping a FILE-mode folder → direct navigation to `/file` (no new tab)
- [ ] Dropping a FOLDER-mode folder → direct navigation to `/folder` (no new tab)
- [ ] Single frontmatter parse: launcher view parses, editor modules reuse from store
- [ ] ESLint boundary rules block cross-module imports (file ↔ folder)
- [ ] All existing format-core tests pass unchanged
- [ ] `vue-router` guard redirects to `/` when no workspace handle
