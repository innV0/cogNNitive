# Tasks: Launcher Decommission + Sibling Repo Archival

Order matters: **salvage value (Phase 1–2) before deleting anything (Phase 3–4).**

## Phase 1: Port high-value validation

- [ ] 1.1 Port `apps/launcher/src/utils/validator.ts` → `apps/format-editor/src/shared/validator.ts`; keep the `@innv0/format-core` dependency, adapt imports
- [ ] 1.2 Port `ValidationReport` / `ValidationCheck` / `ValidationSummary` from `launcher/src/types.ts` into a format-editor types module
- [ ] 1.3 Port `apps/launcher/src/components/ValidationReport.vue` → `format-editor` (uses the computed `checksByCategory` / `passedCountByCategory` already optimized in remediation)
- [ ] 1.4 Wire validation into `WorkspaceView` (or a panel): validate the opened workspace against the FORMAT contract and surface the report

## Phase 2: Port recent-folders, toast, samples

- [ ] 2.1 Port `utils/history.ts` (dedup by `path`) + `FolderHistoryEntry`; ADAPT persistence to align with `workspaceStore`'s IndexedDB handle store (single `FORMAT-db`)
- [ ] 2.2 Port `components/RecentFolders.vue` into `HomeView`; on reopen, resolve the stored handle and call `workspaceStore.open()`
- [ ] 2.3 Port `composables/useToast.ts` + `components/ToastMessage.vue`; use for save/error feedback in `WorkspaceView`
- [ ] 2.4 ADAPT `components/SampleFolders.vue` + `SampleFolder` type; wire to the repo `sample/` directory as onboarding entries
- [ ] 2.5 (Optional) ADAPT the drag-drop affordance from `DropZone.vue` into `HomeView` alongside the existing `showDirectoryPicker` button

## Phase 3: Remove the launcher

- [ ] 3.1 Confirm no remaining `format-editor` import references anything under `apps/launcher/`
- [ ] 3.2 Delete `apps/launcher/` (drops `useAppUrls.ts`, `detector.ts`, `FolderExplorer.vue`, `ResultCard.vue`, `LauncherConfig` — all obsolete)
- [ ] 3.3 Update root `package.json` workspaces if the launcher was explicitly listed (currently covered by the `apps/*` glob — verify no launcher-specific config remains)
- [ ] 3.4 Remove launcher-specific screenshots/artifacts from repo root if now stale (`file-format-3001.png`, `folder-format-3002.png`)

## Phase 4: Archive sibling repos (safe — nothing external points to them)

- [ ] 4.1 In `../file-format/` and `../folder-format/`: tear down or redirect the Vercel deployment (`vercel.json` present in both)
- [ ] 4.2 Add an `.archived` marker file to each repo root
- [ ] 4.3 Replace each `README.md` with an archival notice redirecting to `cogNNitive` / `apps/format-editor`
- [ ] 4.4 (If hosted on GitHub) mark each repository as archived / read-only in its settings

## Verification

- [ ] V.1 `format-editor` builds and its unit tests pass after the ports
- [ ] V.2 Validation report renders for a known FORMAT workspace and flags a deliberately malformed one
- [ ] V.3 Recent-folders reopen resolves a stored handle without re-prompting permission
- [ ] V.4 `packages/format-core` suite still 20/20 green
- [ ] V.5 No dangling imports to `apps/launcher/` remain anywhere in the monorepo
