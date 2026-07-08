# iNNfo Specification Changelog

All notable changes to the iNNfo specification ecosystem are documented here.

| Version | Date | Status | Summary |
|---|---|---|---|
| [v0.1.0](v0.1.0/) | 2026-07-06 | **Active** | First versioned release. Resets from legacy FORMAT lineage. Introduces versioned directory structure with level-based organization, `latest/` alias with stable filenames, INDEX.md per version, and CHANGELOG.md. All specs use `specification_version`/`specification_url` frontmatter per defiNNe. Templates reference `iNNfo_V_0-1-0` as parent (replaces `FORMAT`). |

## v0.1.0 (2026-07-06) — Active

### Structural Changes
- **Versioned directories**: Each spec version lives in `vMAJOR.MINOR.PATCH/` with level-based subdirectories (`level0/`, `level1/`, `level2/`).
- **Level organization**: Specs organized by hierarchy level — `level0/` for meta-spec, `level1/` for concrete spec, `level2/` for templates with nested samples.
- **`latest/` alias with stable filenames**: Files use names without version numbers (e.g. `defiNNe_NN.md` instead of `defiNNe_V_0-1-0_NN.md`), so external consumers can always reference `specs/latest/level1/iNNfo_NN.md` and get the current version.
- **CHANGELOG.md**: Added with version table.
- **INDEX.md**: Added per version directory and per `latest/`.

### Specification Changes
- **defiNNe V_0-1-0**: Reset from V_0-1-1. Removed legacy migration sections. Added §7.1 Version Directory Structure covering the level-based organization. Updated all examples and parent chains.
- **iNNfo V_0-1-0**: Reset from V_0-2-0. **Fixed frontmatter field names**: `spec_version` → `specification_version`, `spec_url` → `specification_url` (now defiNNe-conformant). Parent chain updated to `defiNNe_V_0-1-0`.
- **business_V_0-1-1**: Parent chain updated from `FORMAT_V_0-1-1` → `iNNfo_V_0-1-0`.
- **procedures_V_0-1-1**: Parent chain updated from `FORMAT_V_0-1-1` → `iNNfo_V_0-1-0`.
- **catalog_V_0-1-2**: Parent chain updated from `FORMAT_V_0-1-2` → `iNNfo_V_0-1-0`.

### Sample Updates
- All sample files migrated to use `_NN` markers (from legacy `_F`).
- Sample parent chain URLs point to the new level-based paths.
- Samples organized by template: each lives in its template's `samples/` folder.

### Errata (2026-07-08, in-place)
- **Level-2 templates mislabeled as level 3**: `business_V_0-1-1`, `procedures_V_0-1-1`, and `catalog_V_0-1-2` declared `level: 3` in their frontmatter. Corrected to `level: 2` per defiNNe §1/§5.3. This defect caused `getTemplate` (innfo-core resolver) to prefer these templates over real level-3 models via `getSpecForLevel(cache, 3)`.
- **Spurious `model_version` on templates**: the same three templates carried a `model_version` key, which defiNNe §5.3 reserves for level-3 models. Removed from the level-2 frontmatter.
- Applied to both the versioned `v0.1.0/` files and their `latest/` mirrors.

### Backwards Compatibility Notes
- Previous spec versions (FORMAT V_0-1-0 through V_0-1-5) have been removed. Historical copies are in `specs.bak/`.
- Models authored against legacy `FORMAT_V_*` or `_F.md` conventions are NOT compatible and must be migrated.
