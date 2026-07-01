# Architecture Decision: folder-format

> **Status**: Executed — 2026-07-01
> **Supersedes**: Original iNNfo repo changeset

The old `innV0/iNNfo` repo is archived. A new clean repo `innV0/folder-format` was created as the canonical home for the FOLDER mode platform.

## What happened

1. **Created** `https://github.com/innV0/folder-format` as a fresh repo
2. **Copied** source code from `innV0/iNNfo`, stripped of legacy files
3. **Added** `@innv0/format-core: "file:../cogNNitive/packages/format-core"` dependency
4. **Added** `scripts/bootstrap-specs.mjs` for CI setup
5. **Pushed** as single initial commit `ecc1bd1`

## Key differences from old iNNfo repo

| Aspect | Old iNNfo | folder-format |
|--------|-----------|---------------|
| Name | iNNfo | folder-format |
| Identity | Knowledge mgmt system | FORMAT FOLDER mode |
| Dependency | No format-core | `@innv0/format-core` via `file:` |
| Spec source | Implicit | Consumed from cogNNitive |
| CI bootstrap | Manual | `npm run setup` |

## Relationship

```
folder-format/       ← this repo (React SPA)
cogNNitive/          ← sibling dir: specs + format-core library
```

## Spec resolution chain

```
FORMAT spec  → cogNNitive/specs/FORMAT_V_0-1-0_FORMAT.md
Parent       → cogNNitive/specs/defiNNe_V_0-1-0_FORMAT.md
Template     → cogNNitive/specs/kb_V_0-1-0_FORMAT.md
```
