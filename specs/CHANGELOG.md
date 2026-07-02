# FORMAT Specification Changelog

## V_0-1-4 (Current)
- Workspace `index.md` now uses standard Markdown links `[...](...)` instead of wikilinks `[[...]]` for OKF compatibility
- Added OKF (Open Knowledge Format) relationship documentation (§5.1.1) with explicit compatibility table and rationale
- Added `type` requirement in frontmatter for all distributed `_FORMAT.md` files (§5.1.2) to maintain OKF conformance
- Updated index block syntax (§4.2) to support Markdown links alongside wikilinks and `_F index:` markers
- Documented that `_F` markers are safely ignored by OKF consumers as plain text
- Updated template and model examples to reference V_0-1-4 parent chain
- File renamed from `FORMAT_V_0-1-3_FORMAT.md` to `FORMAT_V_0-1-4_FORMAT.md`

## V_0-1-3
- Removed FILE/FOLDER mode dual representation; unified under single body syntax
- Removed `mode` from model frontmatter; replaced with optional `asset_mode`
- Added workspace structure (§5) with `index.md` entry point and wikilink model discovery
- Simplified relationship type definitions (single `representation` instead of `file_representation` + `folder_representation`)
- Removed FOLDER mode body structure section (§6)
- Updated philosophy: removed "Mode-aware" principle, added "Unified structure"
- Removed catalog sample from examples table (FOLDER mode sample)

## V_0-1-2
- Unified FILE and FOLDER modes in a single spec
- Added relationship type system (hierarchy, evaluable_matrix, graph_edge, sequence)
- Templates now declare mode and relationship_declarations
- _F index: syntax alongside [[wikilinks]]
- FOLDER mode specification with _FORMAT.md discovery

## V_0-1-1
- _F structural marker syntax introduced
- Template system formalized
- Index block support

## V_0-1-0
- Initial FORMAT specification
