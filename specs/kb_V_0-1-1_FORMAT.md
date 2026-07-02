---
specification_version: "V_0-1-1"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/kb_V_0-1-1_FORMAT.md"
level: 2
parent:
  name: "FORMAT_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-1_FORMAT.md"
title: "Knowledge Base Template"
mode: "FOLDER"
last_updated: "2026-07-01"
concepts:
  - name: "Persona"
    icon: "user-round"
    type: "text"
    color: "blue"
    weight: 90
    fields:
      - name: "role"
        type: "string"
      - name: "expertise"
        type: "string"
  - name: "Topic"
    icon: "book-open"
    type: "text"
    color: "green"
    weight: 80
    fields:
      - name: "category"
        type: "string"
      - name: "status"
        type: "select"
        options: ["draft", "review", "published", "archived"]
  - name: "Reference"
    icon: "link"
    type: "text"
    color: "orange"
    weight: 70
    fields:
      - name: "url"
        type: "string"
      - name: "type"
        type: "select"
        options: ["article", "video", "book", "paper", "tool"]
markers:
  - name: "weight"
    icon: "plus"
    color: "blue"
  - name: "certainty"
    icon: "help-circle"
    color: "green"
relationship_declarations:
  hierarchy:
    enabled: true
    via: "subdirectories"
  evaluable_matrix:
    enabled: false
  graph_edge:
    enabled: true
  sequence:
    enabled: false
---

> [!NOTE]
> This is a **FORMAT document** — a plain-text Markdown file that carries its own schema in the YAML frontmatter.

# Knowledge Base Template

## A template for hierarchical knowledge bases with assets, using FORMAT FOLDER mode

## Philosophy

The Knowledge Base Template is designed for modeling rich knowledge bases where each entity is a folder containing structured metadata and related files. Unlike FILE mode (single document), FOLDER mode allows physical assets (images, PDFs, videos) to live alongside their metadata. The directory structure itself encodes the hierarchy.

## Objectives

- Provide a FOLDER mode template for knowledge bases with physical assets.
- Enable hierarchical organization via directory nesting.
- Support graph edges for cross-references between nodes.
- Keep element metadata in `_FORMAT.md` discovery files.

## Specification

### 1. Supported Mode

This template supports **FOLDER mode only**.

### 2. Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Persona** | `text` | A person or role with metadata fields (role, expertise) |
| **Topic** | `text` | A knowledge topic with status lifecycle |
| **Reference** | `text` | An external resource with URL and type |

### 3. Markers

| Marker | Purpose |
|---|---|
| `weight` | Importance score (1–10) |
| `certainty` | Confidence level (1–5) |

### 4. Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | Subdirectory nesting |
| Evaluable matrix | ❌ | Not applicable |
| Graph edge | ✅ | `graph_edges` array in frontmatter |
| Sequence | ❌ | Not applicable |

### 5. FOLDER Mode Structure

A knowledge base model following this template has the following directory layout:

```
📁 <Model>_V_x-y-z_kb/
  📄 _FORMAT.md          ← root: level 3, parent, model_version, mode: FOLDER
  📁 PersonaName/        ← element of concept Persona
    📄 _FORMAT.md        ← element frontmatter (type: Persona, fields)
    📄 photo.jpg         ← asset file
  📁 TopicName/          ← element of concept Topic
    📄 _FORMAT.md        ← element frontmatter (type: Topic, fields, graph_edges)
  📁 SubTopic/           ← child element (hierarchy via nesting)
    📄 _FORMAT.md
  📁 ReferenceName/
    📄 _FORMAT.md
  📁 assets/             ← plain folder (no _FORMAT.md, no node)
    📄 some-file.pdf
```

### 6. Graph Edges

Elements in FOLDER mode MAY reference each other via `graph_edges` in frontmatter:

```yaml
---
type: "Topic"
fields:
  category: "technology"
graph_edges:
  - target: "../PersonaName"
    label: "mentions"
    weight: 8
  - target: "../ReferenceName"
    label: "see-also"
---
```

- `target` is a relative path from the current element's `_FORMAT.md` to the target element's directory.
- `label` is a free-form semantic label for the relationship.
- `weight` is optional (1–10).

### 7. Asset Directories

A directory that does NOT contain `_FORMAT.md` is treated as a plain asset folder, not a model node. Asset folders are ignored by the parser.

## Template

### Level 3 Model Template (FOLDER)

To create a knowledge base model, create a directory with the canonical name and place a root `_FORMAT.md`:

```yaml
---
specification_version: "V_0-1-1"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "kb_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/kb_V_0-1-1_FORMAT.md"
model_version: "V_0-1-1"
title: "<KB Name>"
mode: "FOLDER"
---
```

Each element directory contains its own `_FORMAT.md` with element data:

```yaml
---
type: "Persona"
fields:
  role: "researcher"
  expertise: "AI"
markers:
  weight: 8
---
```

## Examples

### Creating a Sample

This template currently has no canonical sample model. To create one:

1. Create a FOLDER-mode model at `specs/kb_V_0-1-1/samples/` following the naming convention `<Name>_V_x-y-z_kb/`.
2. Reference historic models in `archive/2026-07-02/models/TeamKB_V_0-1-1_kb/` for reference structure.

Expected structure for a KB model:

```
📁 <Name>_V_x-y-z_kb/
  📄 _FORMAT.md                        ← root: type "Persona", fields: { purpose: "..." }
  📁 PersonaName/
    📄 _FORMAT.md                      → type: Persona, fields: { role: ... }
  📁 TopicName/
    📄 _FORMAT.md                      → type: Topic, fields: { category: ... }
    📁 Subtopic/
      📄 _FORMAT.md                    → child topic, type: Topic
  📁 ReferenceName/
    📄 _FORMAT.md                      → type: Reference, fields: { url: "..." }
  📁 assets/
    📄 file.pdf                        ← plain asset folder (no _FORMAT.md)
```
