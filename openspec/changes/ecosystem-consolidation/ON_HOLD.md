# ON HOLD

**Status:** Paused — 2026-07-01

This change (`ecosystem-consolidation`) is **on hold**, not cancelled.

## Why

The current plan consolidates infrastructure (single FS handle, one Pinia store, one
router, one parse pass) but treats FILE and FOLDER as two isolated modules with a hard
lint wall between them (R15). Review concluded this bakes in a shallow "two apps" model
and discards folder-format's capabilities (widget system, provenance, rules/workflows)
by rebuilding the folder editor at format-core parity.

`format-core` already models FILE and FOLDER as **two serializations of one `ParsedModel`**
(`SpecFrontmatter.mode: Mode | Mode[]`, `RelationshipTypeDef.file_representation` /
`folder_representation`). The deeper integration leans on that invariant instead of
walling the two modes apart.

## Superseded by

A new change (working name: `deep-integration`) is being defined via SDD. Its north star:
one metamodel, one normalized element graph, storage mode (file/folder) as an orthogonal
per-node projection, unified relationship model with swappable views, and cross-boundary
wikilinks over a global node identity scheme.

Do not implement the tasks in this folder until the redesign decision is finalized.
