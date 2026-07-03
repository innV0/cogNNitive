# iNNfo Specification Changelog

## V_0-2-0 (Current) — BREAKING
- **Ecosystem rename**: `FORMAT` → `iNNfo` across the entire specification and codebase
- **Structural marker**: `_F` → `_NN` (section headers, element markers, index entries, matrices)
- **File suffix**: `_F.md` → `_NN.md` for all current-version files
- **Version bump**: V_0-1-5 → V_0-2-0 (MAJOR — breaking change, no backward compat)
- **Packages renamed**: `@innv0/format-core` → `@innv0/innfo-core`, `@innv0/format-mcp` → `@innv0/innfo-mcp`, `@innv0/format-editor` → `@innv0/innfo-editor`
- **Environment variable**: `FORMAT_MODELS_DIR` → `INNFO_MODELS_DIR`
- Legacy `_F.md` files and `_F` markers are NOT recognized by the V_0-2-0 parser

## V_0-1-5
- **Compact file suffix**: Renamed `_FORMAT.md` → `_F.md` across all FORMAT files. Reduces typing overhead by ~9 chars per file reference. (§8.1)
- **Short frontmatter fields**: Renamed `specification_version` → `spec_version`, `specification_url` → `spec_url`. Shorter YAML keys with identical semantics.
- **Patch bump**: V_0-1-4 → V_0-1-5. Updated source constants, JSDoc examples, and CHANGELOG to reflect the new version.
- No behavioral or spec-level requirement changes.

## V_0-1-4
- **BREAKING CORRECTION**: Unified element syntax. ALL concept types (`text`, `weight`, `list`, `category`, `steps`, `sequence`) use bullet-list syntax (`* _F ConceptName:`). Numbered lists (`1. _F ...`, `2. _F ...`) are NOT supported — the parser only recognizes `*` and `-` bullets, and numbered lists add no semantic value since element order is already determined by document position. (§4.3)
- Removed "Numbered list with _F markers" from the syntax table for `steps` and `sequence` types
- Updated serializer to always emit `*` prefix regardless of concept type
- Updated procedures template example to use `* _F Work:` instead of `1. _F Work:`
- Workspace `index.md` now uses standard Markdown links `[...](...)` instead of wikilinks `[[...]]` for OKF compatibility
- **Clarified valid list characters**: Both index blocks (§4.2) and concept blocks (§4.3) now explicitly state that only `*` (asterisk) and `-` (hyphen) are valid bullet characters. The regex patterns are included as normative references. Numbered lists are explicitly disallowed in both sections.

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
