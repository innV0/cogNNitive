# format-editor Specification

## Purpose

Unified Vue 3 SPA consolidating launcher, file-format, folder-format. Single FS handle, two modes: FILE (one _FORMAT.md) and FOLDER (hierarchy). No AI in folder module.

## Requirements

| # | Requirement | S | Description |
|---|------------|---|-------------|
| R1 | FS Handle Recovery | MUST | Recover directory handle from IndexedDB on startup; re-verify permission |
| R2 | Shared Handle | MUST | Single workspaceStore.handle consumed by all modules, no re-prompt |
| R3 | Navigation Guard | MUST | Redirect `/file` and `/folder` to `/` when hasHandle is false |
| R4 | Folder Drop | MUST | Accept directory drops via File System Access API |
| R5 | Mode Detection | MUST | FOLDER: root `_FORMAT.md` + sub dirs with `_FORMAT.md`; FILE: `.md` with `mode:"FILE"` frontmatter, no root `_FORMAT.md`; default to FOLDER when root `_FORMAT.md` exists |
| R6 | Single Parse | MUST | Parse once during detection; store in workspaceStore.parsedContent; modules hydrate from store |
| R7 | FILE Load | MUST | Read `_FORMAT.md` from shared handle when `/file` activates |
| R8 | FILE Edit | MUST | Edit concepts, markers, matrices in documentStore |
| R9 | FILE Save | MUST | Write documentStore back to `_FORMAT.md` via shared handle |
| R10 | Folder Discovery | MUST | Walk tree from handle; collect all `_FORMAT.md` paths |
| R11 | Folder Tree | MUST | Render FolderElements as navigable tree using format-core types |
| R12 | Folder Edit | MUST | Edit type, fields, markers, graph_edges in folderStore |
| R13 | Folder Save | MUST | Write each element back to its `_FORMAT.md` via shared handle |
| R14 | No AI Code | MUST NOT | Folder module: zero AI imports, SDKs, or generation UI |
| R15 | Module Boundary | MUST NOT | FILE↔FOLDER cross-imports blocked; shared/ and stores/ allowed for both |
| R16 | _FORMAT.md Only | MUST | Discover only `_FORMAT.md`; ignore `iNNfo.md` |

## Scenarios

| R  | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| R1 | Valid | IndexedDB has handle | App starts | hasHandle=true |
| R1 | Revoked | Permission revoked | verifyPermission fails | Discard handle, redirect `/` |
| R2 | Shared | wsStore.handle valid | `/file` and `/folder` activated | Same handle instance, no prompt |
| R2 | After mode-switch | Navigated `/file`→`/folder` | `/folder` reads handle | No re-auth dialog |
| R3 | Block | hasHandle=false | Navigate `/file` | Redirect `/` |
| R3 | Pass | hasHandle=true | Navigate any route | No redirect |
| R4 | Accept dir | Launcher open | Drop directory | Handle acquired, detection runs |
| R4 | Reject file | Launcher open | Drop a file | Error shown, no handle |
| R5 | FOLDER match | root+sub have `_FORMAT.md` | Detection runs | mode=FOLDER |
| R5 | FILE match | `.md` has `mode:"FILE"`, no root `_FORMAT.md` | Detection runs | mode=FILE |
| R5 | Default FOLDER | Both signals present | Detection runs | mode=FOLDER (root wins) |
| R5 | No match | Only `.txt` files | Detection runs | Error reported |
| R6 | Folder reuse | parsedContent in wsStore | `/folder` activates | Hydrate, no re-walk |
| R6 | File reuse | parsedContent in wsStore | `/file` activates | Hydrate, no re-read |
| R7 | Loaded | Handle→FILE dir | `/file` activates | Content rendered |
| R7 | Missing | No `_FORMAT.md` in dir | `/file` activates | Error state |
| R8 | Edit concept | Concepts loaded | User edits name | documentStore updated |
| R8 | Add marker | Document loaded | User adds marker | Markers array appended |
| R9 | Save ok | Unsaved changes | User saves | File overwritten |
| R9 | Save fail | Handle revoked | User saves | Error, redirect `/` |
| R10 | Found | sub-a, sub-b have `_FORMAT.md` | Tree walked | Both in tree |
| R10 | Excluded | Subdir has only `.txt` | Tree walked | Excluded |
| R11 | Rendered | Tree has parent+child | `/folder` renders | Expand/collapse tree |
| R11 | Empty | Tree empty | `/folder` renders | Empty-state message |
| R12 | Edit type | Element selected | User changes type | folderStore updated |
| R12 | Add edge | Two elements exist | User creates graph_edge | Added to source graph_edges |
| R13 | Single save | One element dirty | User saves it | One file overwritten |
| R13 | Bulk save | Three elements dirty | User saves all | Three files written |
| R14 | No imports | Folder module source | AI-import scan runs | Zero matches |
| R14 | No UI | Folder editor rendered | User explores | No AI buttons |
| R15 | Blocked | Lint configured | File imports `@/modules/folder/` | Lint error |
| R15 | Allowed | Folder imports `@/shared/` | Lint runs | No error |
| R16 | Priority | Both `_FORMAT.md` and `iNNfo.md` | Discovery runs | Only `_FORMAT.md` |
| R16 | Ignored | Only `iNNfo.md`, no `_FORMAT.md` | Discovery runs | No format definition |
