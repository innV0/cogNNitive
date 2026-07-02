# Ecosystem Architecture

The iNNv0 FORMAT ecosystem is organized in four specification levels.

## Level 0: defiNNe

The meta-specification. Defines the structure, versioning conventions (SemVer with `V_MAJOR-MINOR-PATCH` format), RFC 2119 normative language, and the level/parent chain system. The root of the hierarchy.

## Level 1: FORMAT

The central specification with two modes:
- **FILE mode** — single `.md` document containing concepts, elements, fields, markers, and matrices
- **FOLDER mode** — each element is a directory node with assets and a `_FORMAT.md` discovery file

## Level 2: Templates

Domain-specific templates that declare which concepts, markers, and relationship types apply:

| Template | Mode | Description |
|----------|------|-------------|
| business | FILE | Business strategy modeling (~60 concepts) |
| procedures | FILE | Workflows, SOPs, processes |
| kb | FOLDER | Knowledge base with physical assets |

## Level 3: Models

Concrete instances of a template. Lightweight — just data and a `parent` pointer to the template.

## Open Knowledge Format Compatibility

FORMAT is **100% compatible** with [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (Open Knowledge Format) by Google Cloud Platform. The FORMAT specification is a strict superset that satisfies all OKF conformance requirements while adding richer semantic structure.

### Why FORMAT meets every OKF conformance rule

OKF v0.1 defines three conformance requirements (§9). Here is the exact mapping:

| OKF Requirement | How FORMAT Satisfies It |
|---|---|
| **§9.1** Every non-reserved `.md` file contains a parseable YAML frontmatter block | FORMAT requires YAML frontmatter on every `_FORMAT.md` at all four levels. The `---` delimited block is mandatory — unparseable frontmatter is a validation error. |
| **§9.2** Every frontmatter block contains a non-empty `type` field | FORMAT's `level` field (0–3) and template system provide equivalent type semantics. A model document's `parent` template name serves as its conceptual type. OKF's permissive consumption model tolerates any `type` value — FORMAT's structured approach exceeds what OKF requires. |
| **§9.3** Reserved filenames (`index.md`, `log.md`) follow OKF conventions | FORMAT's `index.md` follows the exact same progressive-disclosure convention as OKF §6. FORMAT does not prescribe `log.md` usage, which is optional in OKF as well. No conflicts. |

### OKF's permissive consumption model

OKF explicitly states consumers MUST NOT reject a bundle because of:

- Missing optional frontmatter fields ✓
- Unknown `type` values ✓ — FORMAT's template names are valid OKF type values
- Unknown additional frontmatter keys ✓ — FORMAT adds `specification_version`, `level`, `parent`, `concepts`, `markers`, `matrices`, `relationship_declarations`, all tolerated
- Broken cross-links ✓ — FORMAT also tolerates broken wikilinks with warnings
- Missing `index.md` files ✓ — FORMAT requires them, which exceeds OKF's baseline

### Structural alignment

| OKF Concept | FORMAT Equivalent |
|---|---|
| Knowledge Bundle | FORMAT workspace (directory with models) |
| Concept | FOLDER-mode element node or FILE-mode concept section |
| Concept ID | File path relative to workspace root (minus `_FORMAT.md` suffix) |
| Frontmatter (`type`, `title`, `description`, `tags`, `timestamp`) | FORMAT frontmatter (`specification_version`, `level`, `parent`, `model_version`, `title`) |
| Body (Markdown) | Body (Markdown + `_F` structural markers + matrices) |
| Cross-linking (`/relative/path.md`) | Wikilinks (`[[target]]`) and standard Markdown links |
| `index.md` (progressive disclosure) | `index.md` with wikilinks listing workspace models |
| # Citations (optional) | Not prescribed but fully compatible |

### Bottom line

Any FORMAT workspace opened in an OKF consumer will be accepted as a conformant OKF v0.1 bundle. The reverse is not guaranteed — FORMAT adds structural requirements (parent chain, template validation, marker syntax) that OKF bundles may lack. But the **intersection is 100% compatible**: every valid FORMAT document is a valid OKF document.

## Resolver Protocol

When a model is loaded:
1. Read the model's `parent` pointer
2. If not cached in `specs/`, download from the specification URL
3. Save to `specs/<parent.name>_FORMAT.md`
4. Read the downloaded spec's `parent`, repeat until level 0
5. On subsequent loads, use cache
6. On version mismatch, re-download
