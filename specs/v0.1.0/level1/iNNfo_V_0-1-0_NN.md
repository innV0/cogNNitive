---
specification_version: "V_0-1-0"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.1.0/level1/iNNfo_V_0-1-0_NN.md"
level: 1
parent_spec:
  name: "defiNNe_V_0-1-0"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.1.0/level0/defiNNe_V_0-1-0_NN.md"
title: "iNNfo Specification"
description: "Concrete specification for semantic modeling with concepts, elements, fields, markers, and relationships."
author: "innV0 Team"
status: "Draft"
relationship_types:
  - name: "hierarchy"
    description: "Parent-child structural relationship between elements"
    representation: "index block with Markdown links"
  - name: "evaluable_matrix"
    description: "N-to-M relationship evaluated on a scale between elements of two concepts"
    representation: "Markdown source→target table with scale parameters"
  - name: "graph_edge"
    description: "Graph edge with optional label, weight, and arbitrary properties"
    representation: "frontmatter graph_edges array"
  - name: "sequence"
    description: "Ordered sequence of steps or milestone events"
    representation: "concept type 'steps' or 'sequence'"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file that carries its own schema in the YAML frontmatter.

## Versioning

iNNfo specifications follow an immutable versioning policy:

- **Published specs are frozen**. Once a specification version is released, its file is never modified. Corrections or improvements require a new spec version.
- **Migrating a model** to a new spec version means creating a new copy of the model adapted to the new version. The old version remains in the workspace as-is, referencing its original spec.
- **Parent chain resolution** always resolves to the version the model was authored against. A model targeting V_0-1-0 references this file (`iNNfo_V_0-1-0_NN.md`) in its parent chain.
- **This file** follows this rule: it is published as `iNNfo_V_0-1-0_NN.md` and will never be modified in-place. Any future change to the iNNfo specification will produce a new version file (e.g. `iNNfo_V_0-2-0_NN.md`), and this file remains as an immutable historical record.

# iNNfo Specification

## A concrete specification for semantic modeling with concepts, elements, fields, markers, and relationships

## Philosophy

iNNfo is designed around five principles:

1. **Rich specs, lean models**: Specification documents (levels 0–2) are semantically rich. Models (level 3) carry only data and a parent pointer. The application resolves and caches the parent chain.
2. **Self-describing**: Every iNNfo document is valid Markdown with YAML frontmatter. No proprietary tooling required to read it.
3. **Relationship polymorphism**: Relationships between concepts and elements are expressed through a typed system — hierarchy, evaluable matrices, graph edges, and sequences.
4. **Template-driven**: Every model conforms to a template that defines its valid concepts, markers, and relationship types.
5. **Unified structure**: The workspace is declared explicitly via `index.md` and all model data lives within single Markdown files.

## Objectives

- Define a unified conceptual model (concepts, elements, fields, markers, relationships).
- Provide a template system with rich semantic documentation (Philosophy, Objectives, full spec).
- Enable machine parsing, validation, and visual rendering of models via the parent chain resolver.
- Maintain full human readability and Git-diffability.
- Ensure that model files are lightweight and never duplicate specification content.

## Specification

### 1. Parent Chain

iNNfo is a level 1 specification. Its `parent_spec` points to defiNNe:

```yaml
parent_spec:
  name: "defiNNe_V_0-1-0"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.1.0/level0/defiNNe_V_0-1-0_NN.md"
```

All templates (level 2) MUST declare `parent_spec` pointing to iNNfo.
All models (level 3) MUST declare `parent_spec` pointing to their template.

Resolution follows the spec resolver protocol defined in defiNNe (§3).

### 2. Template Inline Restriction

A level 3 model MUST NOT include `template:` with `concepts`, `markers`, or `matrices` in its frontmatter. These are defined by the template (level 2) and resolved via the parent chain.

The model frontmatter is limited to:

```yaml
---
specification_version: "V_0-1-0"
specification_url: "<immutable-url>"
level: 3
parent_spec:
  name: "<template>_V_x-y-z"
  url: "<immutable-url>"
model_version: "V_x-y-z"
title: "..."
---
```

### 3. Conceptual Model

#### 3.1. Template

A **template** (level 2) declares:
- `concepts`: allowed concept names, types, icons, colors, weights, field schemas
- `markers`: evaluative dimensions (weight, certainty, priority...)
- `matrices`: relationship declarations between concepts (source, target, params)
- Body: Philosophy, Objectives, Specification, Template, Examples

#### 3.2. Concept

| Field | Description |
|---|---|
| `name` | Unique identifier |
| `type` | `text`, `category`, `weight`, `list`, `steps`, `sequence` |
| `icon` | Lucide icon identifier |
| `color` | Theme color |
| `weight` | Display priority (higher = more prominent) |
| `fields` | Optional field schema for element properties |

#### 3.3. Element

An instance of a concept. Expressed as a bullet with `_NN <concept>:`.

A concept section is introduced by an H1 heading with `_NN <ConceptName>` (visible) or `# <!-- _NN --> <ConceptName>` (hidden marker, visible heading text).

Elements MAY have:
- **Fields**: YAML key-value properties
- **Description**: Free-form Markdown
- **Markers**: Score evaluations

#### 3.4. Relationship Declarations

Templates declare which relationship types they use:

```yaml
relationship_declarations:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: true
```

### 4. Model Body Syntax

#### 4.1. Document Notice (Required)

```markdown
> [!NOTE]
> This is an **iNNfo document**...
```

Must be the first content in the body.

#### 4.2. Index Block

The index block defines the taxonomy hierarchy via nested Markdown lists. Each list item identifies a concept using one of:

- **Markdown link syntax**: `[Concept Name](./relative-path.md)` (preferred for workspace `index.md` — compatible with OKF)
- **WikiLink syntax**: `[[Concept Name]]` (legacy iNNfo, valid inside model index blocks)
- **`_NN index:` marker**: `_NN index: Concept Name` (consistent with `_NN` structural markers)

```markdown
# _NN index
* [Parent Concept](./parent.md)
  * [Child Concept](./child.md)
    * [Grandchild Concept](./grandchild.md)
* [Another Root Concept](./another.md)
```

WikiLink syntax example:

```markdown
# _NN index
* [[Parent Concept]]
  * [[Child Concept]]
    * [[Grandchild Concept]]
* [[Another Root Concept]]
```

The `_NN index:` syntax follows the same nesting rules:

```markdown
# _NN index
* _NN index: Parent Concept
  * _NN index: Child Concept
    * _NN index: Grandchild Concept
```

- Nesting level indicates parent-child relationships (depth = hierarchy level).
- The index block is identified by the concept name `index`.
- All syntaxes MUST reference concept names defined in the template; unresolvable references SHOULD be flagged by the application.
- The workspace root `index.md` MUST use Markdown link syntax for OKF compatibility (see §5.1.1).

**List characters**: Index block list items MUST use `*` (asterisk) or `-` (hyphen) as the bullet character. The parser recognizes both forms. Numbered lists (`1.`, `2.`, etc.) are NOT supported for index blocks. The regex pattern for valid list items is `/^\s*[*\-]\s+/`.

#### 4.3. Concept Block

Each concept in the model corresponds to a section in the document body. The content syntax depends on the concept's `type`:

| Type | Syntax | Description |
|---|---|---|
| `text` | Free-form Markdown paragraph(s) | Single block of content, no elements |
| `weight` | Bullet list with `_NN` markers | Multi-instance, each with optional YAML fields |
| `list` | Bullet list with `_NN` markers | Multi-instance, each with optional YAML fields |
| `category` | No content block needed | Taxonomy-only concept; children appear in index |
| `steps` | Bullet list with `_NN` markers | Ordered sequence of instances |
| `sequence` | Bullet list with `_NN` markers | Ordered sequence of events |

All multi-instance types (`weight`, `list`, `steps`, `sequence`) use the same bullet-list element syntax:

```markdown
# _NN Stakeholders
* _NN Stakeholders: Element Name
  ```yaml
  field1: value1
  field2: value2
  ```
  Optional description text.
* _NN Stakeholders: Another Element
  Description without YAML fields.
```

**Concept heading**: The `# _NN <ConceptName>` heading introduces a concept block. The `_NN` marker signals a iNNfo structural element, and the concept name MUST match a known concept from the template frontmatter. The hidden form uses `# <!-- _NN --> <ConceptName>`, where only the `_NN` marker is invisible and the heading text renders normally.

**Element markers**: The visible `_NN` marker (`_NN <ConceptName>:`) on a bullet declares which concept the element belongs to. The colon separates the concept name from the element name. For invisible markers, use the HTML comment alternative: `<!-- _NN <ConceptName>: -->` followed by the element name.

**List characters**: Element markers MUST use `*` (asterisk) or `-` (hyphen) as the bullet character. The parser regex for valid element markers is `/^\s*[*\-]\s+_NN\s+([\w\s-]+?):\s+(.*)$/`. Numbered lists (`1. _NN Concept: Name`, `2. _NN Concept: Name`, etc.) are NOT supported — they are silently ignored by the parser and produce no elements. The order of elements is determined exclusively by their position in the document.

- The YAML fenced code block immediately following the element bullet declares element-specific fields.
- The description text follows the YAML block (or the bullet line if no YAML block exists).
- A single-instance `text` concept has no element markers; its content is plain Markdown.

#### 4.4. Matrix Block

iNNfo supports three matrix types, distinguished by the section name in `_NN matrices:`:

**Relational Matrix**: Cross-tabulates elements of a source concept (rows) against elements of a target concept (columns). Cells contain a scale value from the matrix's `params`.

```markdown
# _NN matrices: problems-value propositions matrix
| Problems \ Value propositions | VP Name |
| :--- | :---: |
| Problem name | Max |
```

**Item-Markers Matrix**: Assigns marker scores to elements or concept blocks. The section name MUST be `item-markers matrix`. Row labels are either element names or concept block identifiers. Column labels are marker names defined in the template.

```markdown
# _NN matrices: item-markers matrix
| Item \ Marker | weight | certainty | priority |
| :--- | :---: | :---: | :---: |
| Element Name | 9 | 5 | - |
```

**Hierarchy Matrix**: Assigns child elements to parent elements using `X` markers. Used for N-to-M hierarchy relationships between two concepts defined in the template as `hierarchy_matrix_pairs`.

### 5. Workspace Structure

A iNNfo workspace is a directory containing one or more models. The entry point is an `index.md` file at the workspace root.

#### 5.1. index.md (Required)

Every workspace MUST have an `index.md` file at its root. The application reads `index.md` as the single entry point — no filesystem scanning is performed.

`index.md` uses `# _NN index` with standard Markdown links to list all workspace models:

```markdown
# _NN index

* [Business Model](./Business%20Model_V_1-0-0_business_FORMAT.md)
* [KB Model](./KB%20Model_V_1-0-0_kb_FORMAT.md)
```

The `# _NN index` heading is a iNNfo structural marker that signals the index block to the iNNfo parser. OKF consumers safely ignore it as a regular Markdown heading.

Each link target MUST be a `*_FORMAT.md` file relative to the workspace root. The parser resolves each link, loads the referenced model, and registers it in the workspace graph.

- If `index.md` is missing, the application SHALL return an error.
- If a link targets a non-existent file, the parser SHALL emit a warning and skip the entry.

##### 5.1.1. Relationship to Open Knowledge Format (OKF)

iNNfo's workspace convention is informed by the [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) v0.1. Both formats share a common foundation — Markdown files with YAML frontmatter — while serving different purposes:

| Aspect | OKF | iNNfo |
|---|---|---|
| Purpose | Minimal knowledge representation for agents | Structured semantic modeling with concepts, markers, matrices |
| `index.md` | Optional (MAY appear) | Required (SHALL error if missing) |
| `index.md` frontmatter | None (except optional `okf_version`) | None |
| Link syntax | Standard Markdown `[...](...)` | Standard Markdown `[...](...)` |
| `_NN` markers | Ignored as plain text | Structural syntax for index blocks and element declarations |
| `type` in frontmatter | Required for all non-reserved `.md` files | Required for all distributed `_FORMAT.md` files (§5.1.2) |
| File suffix | `.md` | `*_FORMAT.md` (canonical) or `.md` |

OKF consumers can navigate a iNNfo workspace without modification:
- `index.md` has no frontmatter — OKF reads it as a reserved index file.
- Links are standard Markdown — OKF follows them to discover concepts.
- `_NN` markers are standard Markdown text — OKF safely ignores them.
- Distributed `_FORMAT.md` files include `type` in frontmatter — OKF conformant.

iNNfo extends OKF with structured semantic modeling (parent chain, concepts, markers, matrices) that OKF does not define. These are additive — OKF consumers remain fully functional with a iNNfo workspace.

##### 5.1.2. OKF Type Requirement

To maintain OKF conformance, every distributed `_FORMAT.md` file (element nodes, concept instances) MUST include a `type` field in its YAML frontmatter. This aligns with existing element conventions defined by each template.

```yaml
---
type: "Topic"                           # REQUIRED — OKF conformance
fields:
  category: "technology"
  status: "published"
markers:
  weight: 8
---
```

See individual template specifications for valid `type` values per concept.

### 6. Self-Description

This document (`iNNfo_V_0-1-0_NN.md`) is itself a level 1 specification following defiNNe. It declares `parent_spec: { name: "defiNNe_V_0-1-0", url: "..." }` and includes the required body sections.

## Template

### 7.1. Level 2 Template Structure

```yaml
---
specification_version: "V_0-1-0"
specification_url: "<immutable-url>"
level: 2
parent_spec:
  name: "iNNfo_V_0-1-0"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.1.0/level1/iNNfo_V_0-1-0_NN.md"
title: "<Template Name>"
concepts: [...]
markers: [...]
matrices: [...]
relationship_declarations: {...}
---

> [!NOTE]
> This is an **iNNfo document**...

# <Template Name>

## One-sentence summary

## Philosophy

## Objectives

## Specification

## Template

## Examples
```

### 7.2. Level 3 Model Structure (Lightweight)

```yaml
---
specification_version: "V_0-1-0"
specification_url: "<immutable-url>"
level: 3
parent_spec:
  name: "<template>_V_x-y-z"
  url: "<immutable-url>"
model_version: "V_x-y-z"
title: "..."
---

> [!NOTE]
> ...
# _NN index
...
# _NN Concept
...
```

## Examples

### Canonical Samples

Every template defined in this repo has a canonical sample:

| Template | Sample | Path |
|---|---|---|
| **Business** | `Ghostbusters_V_0-1-2_business_FORMAT.md` | `specs/v0.1.0/level2/business/samples/` |
| **Procedures** | `CodeReviewProcess_V_1-0-0_procedures_NN.md` | `specs/v0.1.0/level2/procedures/samples/` |
| **Catalog** | `Music_History_V_1-0-0_catalog` (FOLDER) | `specs/v0.1.0/level2/catalog/samples/` |

### Parent Chain from Ghostbusters

From `specs/v0.1.0/level2/business/samples/Ghostbusters_V_0-1-2_business_FORMAT.md`:

```yaml
parent_spec:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.1.0/level2/business/business_V_0-1-1_NN.md"
```

The application resolves: Ghostbusters → business_V_0-1-1 → iNNfo_V_0-1-0 → defiNNe_V_0-1-0.
