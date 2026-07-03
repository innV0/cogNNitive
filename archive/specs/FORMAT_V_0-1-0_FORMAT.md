---
specification_version: "V_0-1-0"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.0/specs/FORMAT_V_0-1-0_FORMAT.md"
level: 1
parent:
  name: "defiNNe_V_0-1-0"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.0/specs/defiNNe_V_0-1-0_FORMAT.md"
title: "FORMAT Specification"
description: "Concrete specification for semantic modeling with concepts, elements, fields, markers, and relationships. Supports FILE mode (single document) and FOLDER mode (node-as-folder hierarchy)."
author: "innV0 Team"
status: "Draft"
modes: ["FILE", "FOLDER"]
relationship_types:
  - name: "hierarchy"
    description: "Parent-child structural relationship between elements"
    file_representation: "index block (wikilinks [[Parent]] → [[Child]])"
    folder_representation: "subdirectory nesting"
  - name: "evaluable_matrix"
    description: "N-to-M relationship evaluated on a scale between elements of two concepts"
    file_representation: "Markdown source→target table with scale parameters"
    folder_representation: "not applicable"
  - name: "graph_edge"
    description: "Graph edge with optional label, weight, and arbitrary properties"
    file_representation: "frontmatter graph_edges array"
    folder_representation: "frontmatter graph_edges array (identical)"
  - name: "sequence"
    description: "Ordered sequence of steps or milestone events"
    file_representation: "concept type 'steps' or 'sequence'"
    folder_representation: "concept type 'steps' or 'sequence' (identical)"
---

> [!NOTE]
> This is a **FORMAT document** — a plain-text Markdown file that carries its own schema in the YAML frontmatter.

# FORMAT Specification

## A concrete specification for semantic modeling with concepts, elements, fields, markers, and relationships across FILE and FOLDER modes

## Philosophy

FORMAT is designed around five principles:

1. **Mode-aware**: FORMAT recognizes two representation modes (FILE and FOLDER) that share the same conceptual model but differ in physical storage. Templates declare which mode(s) they support.
2. **Rich specs, lean models**: Specification documents (levels 0–2) are semantically rich. Models (level 3) carry only data and a parent pointer. The application resolves and caches the parent chain.
3. **Self-describing**: Every FORMAT document is valid Markdown with YAML frontmatter. No proprietary tooling required to read it.
4. **Relationship polymorphism**: Relationships between concepts and elements are expressed through a typed system — hierarchy, evaluable matrices, graph edges, and sequences — each with an appropriate representation for the active mode.
5. **Template-driven**: Every model conforms to a template that defines its valid concepts, markers, relationship types, and supported modes.

## Objectives

- Define a unified conceptual model (concepts, elements, fields, markers, relationships) that works across FILE and FOLDER modes.
- Provide a template system with rich semantic documentation (Philosophy, Objectives, full spec).
- Enable machine parsing, validation, and visual rendering of models via the parent chain resolver.
- Maintain full human readability and Git-diffability.
- Ensure that model files are lightweight and never duplicate specification content.

## Specification

### 1. Parent Chain

FORMAT is a level 1 specification. Its `parent` points to defiNNe:

```yaml
parent:
  name: "defiNNe_V_0-1-0"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.0/specs/defiNNe_V_0-1-0_FORMAT.md"
```

All templates (level 2) MUST declare `parent` pointing to FORMAT.
All models (level 3) MUST declare `parent` pointing to their template.

Resolution follows the spec resolver protocol defined in defiNNe (§3).

### 2. Representation Modes

FORMAT defines two modes; templates declare which they support:

```yaml
mode: "FILE"       # single document
mode: "FOLDER"     # directory tree
mode: ["FILE", "FOLDER"]  # both
```

#### 2.1. FILE Mode

The entire model is a single Markdown file. Body consists of:
- Document Notice
- Index block (taxonomy via wikilinks)
- Concept blocks (`# <!-- block: concepts -->`)
- Matrix blocks (`# <!-- block: matrices -->`)

#### 2.2. FOLDER Mode

Each element is a directory containing `_FORMAT.md`. Assets live alongside. Directories without `_FORMAT.md` are plain asset folders.

```
📁 <Model>_V_x-y-z_<Template>/
  📄 _FORMAT.md           ← root frontmatter (level:3, parent, model_version)
  📁 Element_A/           ← element of a concept
    📄 _FORMAT.md         ← element frontmatter
    📄 asset.png
  📁 Element_B/
    📄 _FORMAT.md
```

### 3. Template Inline Restriction

A level 3 model MUST NOT include `template:` with `concepts`, `markers`, or `matrices` in its frontmatter. These are defined by the template (level 2) and resolved via the parent chain.

The model frontmatter is limited to:

```yaml
specification_version: "V_0-1-0"
specification_url: "..."
level: 3
parent:
  name: "<template>_V_x-y-z"
  url: "<immutable-url>"
model_version: "V_x-y-z"
title: "..."
mode: "FILE | FOLDER"
```

### 4. Conceptual Model

#### 4.1. Template

A **template** (level 2) declares:
- `concepts`: allowed concept names, types, icons, colors, weights, field schemas
- `markers`: evaluative dimensions (weight, certainty, priority...)
- `matrices`: relationship declarations between concepts (source, target, params)
- `mode`: supported representation mode(s)
- Body: Philosophy, Objectives, Specification, Template, Examples

#### 4.2. Concept

| Field | Description |
|---|---|
| `name` | Unique identifier |
| `type` | `text`, `category`, `weight`, `list`, `steps`, `sequence` |
| `icon` | Lucide icon identifier |
| `color` | Theme color |
| `weight` | Display priority (higher = more prominent) |
| `fields` | Optional field schema for element properties |

#### 4.3. Element

An instance of a concept. In FILE mode: a bullet with `<!-- block: <concept> -->`. In FOLDER mode: a subdirectory with `_FORMAT.md`.

Elements MAY have:
- **Fields**: YAML key-value properties
- **Description**: Free-form Markdown
- **Markers**: Score evaluations

#### 4.4. Relationship Declarations

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

### 5. FILE Mode Body Syntax

#### 5.1. Document Notice (Required)

```markdown
> [!NOTE]
> This is a **FORMAT document**...
```

Must be the first content in the body.

#### 5.2. Index Block

The index block defines the taxonomy hierarchy via nested Markdown lists with WikiLink syntax:

```markdown
# <!-- block: concepts --> index
* [[Parent Concept]]
  * [[Child Concept]]
    * [[Grandchild Concept]]
* [[Another Root Concept]]
```

- WikiLinks use double-bracket `[[Name]]` syntax to reference concept names.
- Nesting level indicates parent-child relationships (depth = hierarchy level).
- The index block is identified by the concept name `index`.
- WikiLinks MUST reference concept names defined in the template; unresolvable references SHOULD be flagged by the application.

#### 5.3. Concept Block

Each concept in the model corresponds to a section in the document body. The content syntax depends on the concept's `type`:

| Type | Syntax | Description |
|---|---|---|
| `text` | Free-form Markdown paragraph(s) | Single block of content, no elements |
| `weight` | Bullet list with `<!-- block: -->` markers | Multi-instance, each with optional YAML fields |
| `list` | Bullet list with `<!-- block: -->` markers | Multi-instance, each with optional YAML fields |
| `category` | No content block needed | Taxonomy-only concept; children appear in index |
| `steps` | Numbered list with `<!-- block: -->` markers | Ordered sequence of instances |
| `sequence` | Numbered list with `<!-- block: -->` markers | Ordered sequence of events |

All multi-instance types (`weight`, `list`, `steps`, `sequence`) use the same element syntax:

```markdown
# <!-- block: concepts --> Stakeholders
* <!-- block: Stakeholders --> Element Name
  ```yaml
  field1: value1
  field2: value2
  ```
  Optional description text.
* <!-- block: Stakeholders --> Another Element
  Description without YAML fields.
```

- The element block marker `<!-- block: <ConceptName> -->` declares which concept the element belongs to.
- The YAML fenced code block immediately following the element bullet declares element-specific fields.
- The description text follows the YAML block (or the bullet line if no YAML block exists).
- A single-instance `text` concept has no element markers; its content is plain Markdown.

#### 5.4. Matrix Block

FORMAT supports three matrix types, distinguished by the section name in `<!-- block: matrices -->`:

**Relational Matrix**: Cross-tabulates elements of a source concept (rows) against elements of a target concept (columns). Cells contain a scale value from the matrix's `params`.

```markdown
# <!-- block: matrices --> problems-value propositions matrix
| Problems \ Value propositions | VP Name |
| :--- | :---: |
| Problem name | Max |
```

**Item-Markers Matrix**: Assigns marker scores to elements or concept blocks. The section name MUST be `item-markers matrix`. Row labels are either element names or concept block identifiers. Column labels are marker names defined in the template.

```markdown
# <!-- block: matrices --> item-markers matrix
| Item \ Marker | weight | certainty | priority |
| :--- | :---: | :---: | :---: |
| Element Name | 9 | 5 | - |
```

**Hierarchy Matrix**: Assigns child elements to parent elements using `X` markers. Used for N-to-M hierarchy relationships between two concepts defined in the template as `hierarchy_matrix_pairs`.

### 6. FOLDER Mode Body Structure

The root `_FORMAT.md` contains model-level frontmatter only. Element `_FORMAT.md` files contain:

```yaml
---
type: "<concept-name>"
fields:
  key1: value1
markers:
  weight: 7
---
```

### 7. Self-Description

This document (`FORMAT_V_0-1-0_FORMAT.md`) is itself a level 1 specification following defiNNe. It declares `parent: { name: "defiNNe_V_0-1-0", url: "..." }` and includes the required body sections.

## Template

### Level 2 Template Structure

```yaml
---
specification_version: "V_0-1-0"
specification_url: "<immutable-url>"
level: 2
parent:
  name: "FORMAT_V_0-1-0"
  url: "https://raw.githubusercontent.com/innV0/FORMAT/v0.1.0/FORMAT_V_0-1-0_FORMAT.md"
title: "<Template Name>"
mode: "FILE | FOLDER"
concepts: [...]
markers: [...]
matrices: [...]
relationship_declarations: {...}
---

> [!NOTE]
> This is a **FORMAT document**...

# <Template Name>

## One-sentence summary

## Philosophy

## Objectives

## Specification

## Template

## Examples
```

### Level 3 Model Structure (Lightweight)

```yaml
---
specification_version: "V_0-1-0"
specification_url: "https://raw.githubusercontent.com/innV0/FORMAT/v0.1.0/FORMAT_V_0-1-0_FORMAT.md"
level: 3
parent:
  name: "<template>_V_x-y-z"
  url: "<immutable-url>"
model_version: "V_x-y-z"
title: "..."
mode: "FILE"
---

> [!NOTE]
> ...
# <!-- block: concepts --> index
...
# <!-- block: concepts --> Concept
...
```

## Examples

### Parent Chain from a Model

From `Ghostbusters_V_0-1-0_business_FORMAT.md`:

```yaml
parent:
  name: "business_V_0-1-0"
  url: "https://raw.githubusercontent.com/innV0/FORMAT/v0.1.0/docs/templates/business/V_0-1-0/business_V_0-1-0_FORMAT.md"
```

The application resolves: business_V_0-1-0 → FORMAT_V_0-1-0 → defiNNe_V_0-1-0.
