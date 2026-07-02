# Specifications

The iNNv0 ecosystem defines four specification levels. Each level builds on the one below it.

## Level 0 — Meta-specification

The root of the chain. Defines structure, versioning (SemVer), and RFC 2119 key words for the entire ecosystem.

| Spec | Version | Source |
|------|---------|--------|
| **defiNNe** | V 0.1.0 | [`specs/defiNNe_V_0-1-0_FORMAT.md`](https://github.com/innV0/cogNNitive/blob/main/specs/defiNNe_V_0-1-0_FORMAT.md) |

## Level 1 — Central specification

The FORMAT specification with two modes: **FILE** (single document) and **FOLDER** (node-as-folder with assets). Unified relationship system, marker syntax, and matrix definitions.

| Spec | Version | Source |
|------|---------|--------|
| **FORMAT** | V 0.1.0 | [`specs/FORMAT_V_0-1-0_FORMAT.md`](https://github.com/innV0/cogNNitive/blob/main/specs/FORMAT_V_0-1-0_FORMAT.md) |
| **FORMAT** | V 0.1.1 | [`specs/FORMAT_V_0-1-1_FORMAT.md`](https://github.com/innV0/cogNNitive/blob/main/specs/FORMAT_V_0-1-1_FORMAT.md) |

## Level 2 — Templates

Domain-specific templates. Each declares concepts, markers, matrices, and relationship types for a specific domain.

| Template | Version | Source |
|----------|---------|--------|
| **Business** | V 0.1.1 | [`specs/business_V_0-1-1_FORMAT.md`](https://github.com/innV0/cogNNitive/blob/main/specs/business_V_0-1-1_FORMAT.md) |
| **Procedures** | V 0.1.1 | [`specs/procedures_V_0-1-1_FORMAT.md`](https://github.com/innV0/cogNNitive/blob/main/specs/procedures_V_0-1-1_FORMAT.md) |
| **Knowledge Base (kb)** | V 0.1.1 | [`specs/kb_V_0-1-1_FORMAT.md`](https://github.com/innV0/cogNNitive/blob/main/specs/kb_V_0-1-1_FORMAT.md) |

## Level 3 — Models

Concrete data instances. Lightweight — just data and a parent pointer to their template.

| Model | Version | Template | Source |
|-------|---------|----------|--------|
| **Ghostbusters** | V 0.1.1 | business | [`models/Ghostbusters_V_0-1-1_business_FORMAT.md`](https://github.com/innV0/cogNNitive/blob/main/models/Ghostbusters_V_0-1-1_business_FORMAT.md) |
| **TeamKB** | V 0.1.1 | kb (FOLDER mode) | [`models/TeamKB_V_0-1-1_kb/`](https://github.com/innV0/cogNNitive/tree/main/models/TeamKB_V_0-1-1_kb) |

## Related Standards

### Open Knowledge Format (OKF)

FORMAT is **100% compatible** with [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md), the Open Knowledge Format by Google Cloud Platform. Every FORMAT document is a valid OKF knowledge bundle.

| OKF Conformance Rule (§9) | FORMAT Status |
|---|---|
| Parseable YAML frontmatter on every non-reserved `.md` file | ✅ Satisfied — every `_FORMAT.md` has required frontmatter |
| Non-empty `type` field in every frontmatter block | ✅ Satisfied — `level` + template name provides type semantics |
| Reserved filenames follow OKF conventions | ✅ Satisfied — `index.md` follows progressive-disclosure pattern |

**Why the compatibility holds:**

1. **Same substrate**: Both use Markdown + YAML frontmatter. OKF's "if you can `cat` a file, you can read OKF" applies to FORMAT verbatim.
2. **OKF tolerates extensions**: OKF explicitly allows unknown frontmatter keys and unknown `type` values. FORMAT's additional fields (`specification_version`, `level`, `parent`, `concepts`, `markers`, `matrices`) are fully tolerated.
3. **FOLDER mode = OKF Bundle**: FORMAT FOLDER mode produces the exact directory-of-Markdown-files structure OKF defines as a knowledge bundle (§3). Each `_FORMAT.md` is an OKF concept document (§4) with `index.md` as the directory listing (§6).
4. **Cross-linking**: OKF uses standard Markdown links; FORMAT supports wikilinks (`[[target]]`) and standard links — both work for cross-referencing concepts.

See the [Ecosystem page](ecosystem) for the full compatibility mapping.
