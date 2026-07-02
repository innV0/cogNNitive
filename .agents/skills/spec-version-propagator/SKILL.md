---
description: >
  Detect and propagate specification version bumps across the entire repo.
  When the FORMAT spec (or any spec) changes version, this skill identifies
  every file that needs updating — frontmatter, file names, URLs, constants,
  documentation, and test fixtures.
trigger: >
  spec version bump, propagate version, version propagation, update spec version,
  actualizar versión especificación, version bump, bump spec, check spec version,
  stale version references, update format version, rebase specs
source: cogNNitive
version: "1.0.0"
---

# Spec Version Propagator

## Purpose

The FORMAT ecosystem has a strict parent-chain dependency graph. When a specification version changes (`V_0-1-N` → `V_0-1-M`), the change **ripples** through every file that references that version — directly or transitively.

This skill maps the **complete propagation graph** and provides a companion script to detect every stale file.

## Hierarchy & Propagation Rules

```
Level 0: defiNNe (meta-spec, rarely bumped)
  │  parent of
  ▼
Level 1: FORMAT (the concrete spec)
  │  parent of
  ▼
Level 2: Templates (business, procedures, kb, catalog)
  │  parent of
  ▼
Level 3: Models, fixtures, samples
```

### What changes when a spec version bumps

| Artifact | What to Update | Example |
|---|---|---|
| **Spec file itself** | File name rename; `specification_version`; `specification_url` | `FORMAT_V_0-1-2_FORMAT.md` → `FORMAT_V_0-1-3_FORMAT.md` |
| **Level 2 Templates** | `parent.name` (e.g. `FORMAT_V_0-1-2` → `FORMAT_V_0-1-3`); `parent.url`; optionally `specification_version` | `business_V_0-1-1_FORMAT.md` |
| **Level 3 Models & Samples** | `specification_version`; `specification_url` (if it references the spec); `parent.url` (if it references a template) | `Ghostbusters_V_0-1-2_business_FORMAT.md` |
| **Test fixtures** | Same as Level 3 models | `tests/fixtures/*_FORMAT.md` |
| **Test inline frontmatter** | Hardcoded version strings in `.test.ts` files | `.test.ts` with `specification_version: "V_0-1-2"` |
| **Source code constants** | `DEFAULT_FORMAT_VERSION` in `constants.ts` | |
| **Documentation** | Version strings, file paths, URLs in `.md` docs | `docs/spec_consolidation.md` |
| **CHANGELOGs** | New entry + version strings | `specs/CHANGELOG.md`, `CHANGELOG.md` |
| **Workspace index** | `specification_version` if it references the spec | `tests/fixtures/workspace-index.md` |

## Companion Script

The **canonical detection tool** is `scripts/check-spec-version.mjs`.

```bash
# Scan for all files referencing a specific version
node scripts/check-spec-version.mjs --version V_0-1-2

# Same, but categorize by file type (specs, templates, models, tests, source, docs)
node scripts/check-spec-version.mjs --version V_0-1-2 --by-type

# Check mode: exit code 1 if any stale references found (for CI/commit hooks)
node scripts/check-spec-version.mjs --version V_0-1-2 --check

# Scan for ALL known spec versions in the repo (inventory mode, excludes archives)
node scripts/check-spec-version.mjs --inventory

# Include archived files (historical models, backup specs) in the scan
node scripts/check-spec-version.mjs --version V_0-1-2 --include-archives

# After updating a spec, verify no old references remain
node scripts/check-spec-version.mjs --version V_0-1-1 --check
```

> **Note:** By default, `archive/` and any directory named `archive` inside `openspec/` are excluded. Use `--include-archives` for comprehensive scans.

## Propagation Procedure

When bumping a spec version, follow this order:

### Step 1 — Bump the spec itself

```bash
# 1a. Copy the spec file to the new version name
cp specs/FORMAT_V_0-1-2_FORMAT.md specs/FORMAT_V_0-1-3_FORMAT.md

# 1b. Update frontmatter in the new file:
#   - specification_version: "V_0-1-3"
#   - specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.2/specs/FORMAT_V_0-1-3_FORMAT.md"
#   (use the tag that matches the repo release, not necessarily the spec version)

# 1c. If the content changed, update the spec body accordingly
```

### Step 2 — Update source-code single source of truth

Edit `apps/format-editor/src/utils/constants.ts`:

```typescript
export const DEFAULT_FORMAT_VERSION = 'V_0-1-3';
```

### Step 3 — Run the checker

```bash
node scripts/check-spec-version.mjs --version V_0-1-2 --by-type
```

This lists every file still referencing the OLD version.

### Step 4 — Propagate to templates (Level 2)

For each template spec (`business_V_0-1-1_FORMAT.md`, `procedures_V_0-1-1_FORMAT.md`, `kb_V_0-1-1_FORMAT.md`, `catalog_V_0-1-2_FORMAT.md`):

- Update `parent.name` to point to the new FORMAT version
- Update `parent.url` to point to the new FORMAT file URL
- Optionally bump the template's own version in `specification_version`

### Step 5 — Propagate to models, samples, and fixtures (Level 3)

For every model/fixture/sample that references the old version:

- Update `specification_version` (the spec version the model was authored against)
- Update `specification_url` if it references the spec directly
- Update `parent.url` if it references a template whose file path changed

### Step 6 — Update test inline frontmatter

Test files like `*.test.ts` often embed version strings. The checker script finds these.

### Step 7 — Update documentation

Search and replace version references in `docs/`:

- `docs/spec_consolidation.md`
- `docs/documentation/specifications.md`
- `docs/documentation/usage.md`
- `docs/cogNNitive/_FORMAT.md`
- `docs/SESSION_HANDOFF.md` (if still relevant)
- `docs/changesets/*.md`

### Step 8 — Update CHANGELOGs

- Add new version entry to `specs/CHANGELOG.md` (spec changelog)
- Add new version entry to `CHANGELOG.md` (repo changelog)

### Step 9 — Final verification

```bash
node scripts/check-spec-version.mjs --version V_0-1-1 --check
# Should exit 0 — no remaining old references
```

## File Pattern Reference

The script scans these glob patterns:

| Pattern | Category | What version field is checked |
|---|---|---|
| `specs/*_FORMAT.md` | Specs & Templates | `specification_version`, `parent.name`, `parent.url` |
| `specs/*/samples/*_FORMAT.md` | Samples | `specification_version`, `specification_url`, `parent.url` |
| `tests/fixtures/*_FORMAT.md` | Test Fixtures | `specification_version`, `specification_url`, `parent.url` |
| `tests/fixtures/*.md` | Workspace index | `specification_version` |
| `apps/**/tests/fixtures/models/*_FORMAT.md` | App Fixtures | `specification_version`, `specification_url`, `parent.url` |
| `apps/**/tests/**/*.test.ts` | Test code | Inline frontmatter strings |
| `packages/**/tests/**/*.test.ts` | Package tests | Inline frontmatter strings |
| `apps/**/src/**/*.ts` | Source code | `DEFAULT_FORMAT_VERSION` |
| `packages/**/src/**/*.ts` | Source code | Version strings, comments |
| `docs/**/*.md` | Documentation | Version string references |
| `CHANGELOG.md` | Changelog | Version entries |
| `specs/CHANGELOG.md` | Spec changelog | Version entries |
| `.agents/skills/**/SKILL.md` | Skills | Version references in contexts |

## URL Version Format

When updating URLs, note the two-part version scheme:

```
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-2_FORMAT.md"
                                         ^^^^^^^ ^^^^^^^
                                    repo-tag       spec-file-version
```

- **Repo tag** (`v0.1.1`): The Git tag of the release that contains this spec version
- **Spec file version** (`V_0-1-2`): The file name's version

These are often different! The repo tag stays at the last release; the spec file version is the spec's own version number. When bumping, you typically only bump the **spec file version**, not the repo tag (that happens at release time).
