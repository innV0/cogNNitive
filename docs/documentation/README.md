# cogNNitive Documentation

Welcome to the cogNNitive documentation. cogNNitive is the monorepo that powers the iNNv0 FORMAT ecosystem.

## Quick Start

```bash
# Install dependencies
npm install

# Build format-core first (required by the editor)
npm run build -w @innv0/format-core

# Start the format-editor dev server
npm run dev -w @innv0/format-editor

# Or start the legacy launcher (during transition)
npm run dev -w @innv0/launcher
```

## Sections

### [format-editor](format-editor)
The unified Vue 3 workspace editor. Opens any folder via the File System Access API, runs a single recursive parse pass, and renders FILE and FOLDER mode models in one mixed tree. Features a sidebar tree navigator and metamodel-driven NodeForm.

### [Launcher](launcher) *(legacy)*
The original drag-and-drop app that detected FILE vs FOLDER mode and routed to separate editors. Being consolidated into format-editor — its validation, history, and toast components are being ported over.

### [format-core](format-core)
`@innv0/format-core` is a framework-agnostic TypeScript library providing:
- Unified parser for FILE and FOLDER mode documents
- Model types: Concept, Element, Field, Marker, Matrix, Relationship
- Validator against template schemas
- IO drivers for both modes
- Parent-spec-chain resolver

### [Ecosystem](ecosystem)
The four-level specification chain:

| Level | Name | Description |
|-------|------|-------------|
| 0 | **defiNNe** | Meta-specification: structure, SemVer, RFC 2119 |
| 1 | **FORMAT** | Central spec with FILE and FOLDER modes |
| 2 | **Templates** | business, procedures, kb |
| 3 | **Models** | Concrete instances (Ghostbusters, TeamKB) |

### [Specifications](specifications)
Complete listing of all specs and models at every level, with links to source files.

### [Usage](usage)
How to create FORMAT models, templates, and work with the ecosystem.
