---
specification_version: "V_0-1-1"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/procedures_V_0-1-1_FORMAT.md"
level: 2
parent:
  name: "FORMAT_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-1_FORMAT.md"
title: "Procedures Template"
mode: "FILE"
last_updated: "2026-07-01"
concepts:
  - name: "Procedure"
    icon: "file-text"
    type: "text"
    color: "blue"
    weight: 100
  - name: "Work"
    icon: "list-ordered"
    type: "sequence"
    color: "blue"
    weight: 90
    fields:
      - name: "step_type"
        type: "select"
        options: ["task", "decision", "event"]
      - name: "next"
        type: "string"
      - name: "condition"
        type: "string"
      - name: "input"
        type: "reference"
        target_concepts: ["Artifact"]
      - name: "output"
        type: "reference"
        target_concepts: ["Artifact"]
      - name: "output_status"
        type: "string"
      - name: "tool"
        type: "reference"
        target_concepts: ["Tools"]
  - name: "Artifact"
    icon: "package"
    type: "list"
    color: "orange"
    weight: 80
  - name: "Tools"
    icon: "wrench"
    type: "list"
    color: "orange"
    weight: 70
  - name: "Roles"
    icon: "users"
    type: "list"
    color: "green"
    weight: 60
    fields:
      - name: "scope"
        type: "select"
        options: ["internal", "external"]
  - name: "Position"
    icon: "briefcase"
    type: "list"
    color: "green"
    weight: 50
  - name: "Person"
    icon: "user"
    type: "list"
    color: "green"
    weight: 40
markers:
  - name: "complexity"
    icon: "gauge"
    color: "green"
    weight: 50
relationship_declarations:
  hierarchy:
    enabled: false
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: true
matrices:
  - name: "work-roles matrix"
    source: "Work"
    target: "Roles"
    params: "Responsible;Accountable;Consulted;Informed"
  - name: "positions-roles matrix"
    source: "Position"
    target: "Roles"
    params: "Assumes"
  - name: "persons-positions matrix"
    source: "Person"
    target: "Position"
    params: "Occupies"
  - name: "work-tools matrix"
    source: "Work"
    target: "Tools"
    params: "Uses"
  - name: "work-artifacts matrix"
    source: "Work"
    target: "Artifact"
    params: "Creates;Modifies;Validates;Reviews"
  - name: "item-markers matrix"
    source: "elements"
    target: "markers"
---

> [!NOTE]
> This is a **FORMAT document** — a plain-text Markdown file that carries its own schema in the YAML frontmatter. The template definition is resolved via the parent chain and cached in the `specs/` directory.

# Procedures Template

## A template for modeling structured workflows with sequenced steps, roles, artifacts, tools, and RACI matrices

## Philosophy

The Procedures Template is designed for modeling repeatable workflows with clear accountability. It follows the belief that any procedure can be understood as a sequence of steps, each producing or consuming artifacts, assigned to roles via a RACI matrix, and supported by tools. The template emphasizes traceability — every work step declares its inputs, outputs, and the roles responsible for it.

## Objectives

- Provide a complete set of concepts for workflow modeling: sequenced steps (Work), produced artifacts (Artifact), supporting tools (Tools), and human resources (Roles, Position, Person).
- Enable RACI accountability mapping via evaluable matrices (Work ↔ Roles, Position ↔ Roles, Person ↔ Position).
- Support sequential step definitions with conditional branching, tool assignment, and artifact I/O.
- Serve as the default template for procedure and process modeling in the FORMAT ecosystem.

## Specification

### 1. Supported Mode

This template supports **FILE mode only**.

### 2. Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Procedure** | `text` | Free-form description of the overall procedure |
| **Work** | `sequence` | Ordered list of steps; each step has fields for type, next, condition, I/O, tool |
| **Artifact** | `list` | Documents, deliverables, or data produced or consumed by work steps |
| **Tools** | `list` | Software or hardware used to execute work steps |
| **Roles** | `list` | Functional roles with accountability scope (internal/external) |
| **Position** | `list` | Organizational positions that assume one or more roles |
| **Person** | `list` | Named individuals who occupy positions |

### 3. Markers

| Marker | Purpose |
|---|---|
| `complexity` | How complex the procedure step or element is to execute |

### 4. Matrices

| Matrix | Source → Target | Purpose |
|---|---|---|
| Work-Roles | Work → Roles | RACI assignment (Responsible, Accountable, Consulted, Informed) |
| Positions-Roles | Position → Roles | Which positions assume which roles |
| Persons-Positions | Person → Position | Who occupies which position |
| Work-Tools | Work → Tools | Which tools are used by each work step |
| Work-Artifacts | Work → Artifact | I/O relationships (Creates, Modifies, Validates, Reviews) |

### 5. Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ❌ | Not applicable |
| Evaluable matrix | ✅ | Source→target tables with RACI params |
| Graph edge | ❌ | Not applicable |
| Sequence | ✅ | Work concept type `sequence` with numbered steps |

## Template

### Level 3 Model Template (Lightweight)

To create a procedures model, create a level 3 FILE mode document with:

```yaml
---
specification_version: "V_0-1-1"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "procedures_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/procedures_V_0-1-1_FORMAT.md"
model_version: "V_x-y-z"
title: "<Procedure Name>"
mode: "FILE"
---

> [!NOTE]
> This is a **FORMAT document**...

# _F index
* [[Procedure]]
* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]
* [[Position]]
* [[Person]]

# _F Procedure
Description of the overall procedure.

# _F Work
1. _F Work: Step Name
  ```yaml
  step_type: "task"
  next: "Next Step Name"
  tool: "Tool Name"
  ```
  Step description.

# _F Artifact
* _F Artifact: Artifact Name
  Description of the artifact.

# _F matrices: work-roles matrix
| Work \ Roles | Role Name |
| :--- | :---: |
| Step Name | Responsible |
```

## Examples

### Canonical Sample

The official sample for this template is `specs/procedures_V_0-1-1/samples/CodeReviewProcess_V_1-0-0_procedures_FORMAT.md` (FILE mode). It exercises all concept types (text, sequence, list), YAML element fields, and the `work-roles` RACI matrix.

### Model Directory after First Load

When `specs/procedures_V_0-1-1/samples/CodeReviewProcess_V_1-0-0_procedures_FORMAT.md` is loaded for the first time:

```
📁 CodeReviewProcess_V_1-0-0_procedures/
  📄 CodeReviewProcess_V_1-0-0_procedures_FORMAT.md
  📁 specs/
    📄 procedures_V_0-1-1_FORMAT.md
    📄 FORMAT_V_0-1-2_FORMAT.md
    📄 defiNNe_V_0-1-0_FORMAT.md
```

### Parent Chain

```yaml
# From the CodeReviewProcess sample:
parent:
  name: "procedures_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/procedures_V_0-1-1_FORMAT.md"

# This template's parent:
parent:
  name: "FORMAT_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-1_FORMAT.md"

# FORMAT's parent:
parent:
  name: "defiNNe_V_0-1-0"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.0/specs/defiNNe_V_0-1-0_FORMAT.md"
```
