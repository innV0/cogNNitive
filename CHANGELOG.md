# Changelog

## v0.2.0 (2026-07-03)

### BREAKING: Renamed FORMAT → iNNfo
- **Structural marker**: `_F` → `_NN` across all source code, tests, and documentation
- **File suffix**: `_F.md` → `_NN.md` for all current-version files
- **Packages**: `@innv0/format-core` → `@innv0/innfo-core`, `@innv0/format-mcp` → `@innv0/innfo-mcp`, `@innv0/format-editor` → `@innv0/innfo-editor`
- **Version bump**: V_0-1-5 → V_0-2-0 (MAJOR, breaking)
- Legacy `_F.md` files are no longer parsed by the V_0-2-0 parser

## v0.1.0 (2026-07-01)

Initial release of the iNNv0 specification ecosystem.

### Specs
- defiNNe V_0-1-0 — Meta-specification (level 0)
- FORMAT V_0-1-0 — Format specification (level 1)
- business V_0-1-0 — Business template (level 2)
- procedures V_0-1-0 — Procedures template (level 2)
- kb V_0-1-0 — Knowledge base template (level 2)

### Models
- Ghostbusters V_0-1-0_business — Business model example
- TeamKB V_0-1-0_kb — Knowledge base model example

### Packages
- @innv0/format-core v0.1.0 — TypeScript parser, resolver, validator
