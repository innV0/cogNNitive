# format-editor Compliance

## Purpose

This document describes how the format-editor application implements the defiNNe and FORMAT specification requirements, and how it validates that models meet those requirements.

## defiNNe Compliance (defiNNe §11)

A document is defiNNe-compliant if ALL of the following hold:

| # | Check | Implementation |
|---|---|---|
| 1 | Filename matches level convention | `validateFormatContent` — check `fileName.endsWith('_F.md')` |
| 2 | `specification_version` in `V_MAJOR-MINOR-PATCH` form | `validateFormatContent` — regex test `VERSION_RE` |
| 3 | `specification_url` present and resolvable | Frontmatter validation — `spec_url` must be a non-empty string |
| 4 | `level` present | Frontmatter validation — `fm.level` must be defined |
| 5 | If level > 0: `parent_spec` object with `name` and `url` | Validated via `validateModel` and `validateFormatContent` — checks `fm.parent_spec` exists with both subfields |
| 6 | If level ≤ 2: body has required sections | Checked via body parsing — sections for Philosophy, Objectives, Specification, Template, Examples |
| 7 | If level = 3: body does NOT contain specification sections | Implicit — models use `_F` section syntax only |
| 8 | Body begins with `> [!NOTE]` | `validateFormatContent` — check `body-note` |
| 9 | Normative language uses RFC 2119 | Not validated programmatically (advisory) |

## FORMAT Compliance

The format-editor validates FORMAT compliance through two functions in `packages/format-core/src/validator.ts`:

### `validateFormatContent` (full content validator)

Runs checks against a raw document's frontmatter, body syntax, and conventions:

**Frontmatter checks:**
- **fm-level**: Model must declare `level: 3`
- **fm-parent**: Model must declare `parent_spec` with `name` and `url`
- **fm-version**: `model_version` must be present
- **fm-version-format**: Version must match `V_x-y-z` format
- **fm-title**: Title must be present
- **fm-spec-version**: `spec_version` must be declared
- **fm-spec-version-match**: (optional) Checks against expected spec version

**Body syntax checks:**
- **body-note**: Document must start with `> [!NOTE]`
- **body-index**: Taxonomy index block must be present (`# _F index`)
- **body-concept-sections**: Valid `_F` section markers
- **body-element-markers**: Elements use `* _F Concept: Name` syntax
- **body-numbered-list-markers**: Warns on numbered `_F` markers (silently ignored by parser)
- **body-invalid-bullet-chars**: Only `*` and `-` are valid bullet characters

**Convention checks:**
- **conv-file-naming**: File must end with `_F.md`
- **conv-type-field**: Distributed `_F.md` files should include `type` field
- **conv-wikilinks**: All `[[wikilinks]]` should reference existing concepts

### `validateModel` (model-level validator)

Validates a `ParsedModel` against its template:

- Checks that all concept sections correspond to template-defined concepts
- Validates field values against template field schemas (e.g. `select` type options)
- Validates matrix declarations against template matrix declarations
- Validates marker usage against template marker definitions

## Resolver Protocol

The parent chain resolver (`packages/format-core/src/resolver.ts`) implements the spec resolver protocol defined in defiNNe (§3):

1. **Entry point**: `resolveParentChain(parentUrl, parentName, basePath, options)`
2. **Cache-first**: Looks for cached spec files in `{basePath}/specs/{name}_F.md`
3. **Download-on-miss**: Downloads from `parent_spec.url` if not cached
4. **Recursive**: Reads downloaded spec's `parent_spec` and repeats until level 0
5. **Max depth**: Configurable via `options.maxDepth` (default: 10)

The resolver constructs a `SpecCache` with:
- `specs`: `Map<string, SpecDocument>` — all resolved specs keyed by name
- `chain`: `string[]` — ordered list of resolved spec names from leaf to root

## Parser Normalization

The parser (`packages/format-core/src/parser.ts`) includes backward-compatibility normalization:

```typescript
// Normalize legacy parent → parent_spec (defiNNe V_0-1-0 era)
if ((parsed as any).parent && !(parsed as any).parent_spec) {
  (parsed as any).parent_spec = (parsed as any).parent;
  delete (parsed as any).parent;
}
```

This ensures that archived specs (V_0-1-0 and earlier) using the legacy `parent:` field still parse correctly when loaded by the format-editor.

## Serialization

The `serializeModel` function in `packages/format-core/src/parser.ts` writes the `parent_spec:` key in YAML output. When models are serialized and re-parsed, the `parent_spec` field is preserved through the round trip.

## Caching

Resolved specs are cached in `{basePath}/specs/` using the spec name as filename:
- Template specs: `{name}_FORMAT.md`
- FORMAT specs: `{name}_FORMAT.md`
- defiNNe specs: `{name}_FORMAT.md`

On subsequent loads, the resolver checks the cache first and only downloads if the file is missing.

## Version Handling

- The format-editor tracks `spec_version` in the frontmatter of every document.
- The optional `expectedSpecVersion` parameter in `validateFormatContent` enables version-specific validation.
- When a model's `parent_spec` version changes, the resolver detects the mismatch (new URL vs cached file) and downloads the new parent.
- Spec versions are immutable — once published, a spec file is never modified in-place.
