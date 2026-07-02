---
title: About — cogNNitive
description: Learn about cogNNitive, the central hub for the iNNv0 FORMAT ecosystem — format-editor, format-core, and the spec chain.
html_url: https://innv0.github.io/cogNNitive/about
generator: https://skills.innv0.com/innv0-web-design-guide
---

# About cogNNitive

The monorepo that ties the iNNv0 FORMAT ecosystem together.

## Architecture

npm workspaces monorepo with apps/, packages/, specs/, models/, and docs/.

## Apps

**format-editor** (`@innv0/format-editor`) — unified Vue 3 workspace editor:
- File System Access API to open workspace folders
- Single recursive parse pass over every directory
- FILE and FOLDER mode models in one mixed tree
- Sidebar tree navigator + metamodel-driven NodeForm
- IndexedDB handle persistence for fast reopen

**cogNNitive Launcher** (`@innv0/launcher`) — legacy. The original drag-and-drop app that detected FILE vs FOLDER mode and routed to separate editors. Being consolidated into format-editor.

## Package

**@innv0/format-core** — framework-agnostic TypeScript library with:
- Unified parser for FILE and FOLDER modes
- Model types (concepts, elements, fields, markers, relationships)
- Validator against template schemas
- IO drivers for both FILE and FOLDER modes
- Parent-spec-chain resolver

## Specifications

- **Level 0: defiNNe** — Meta-specification
- **Level 1: FORMAT** — Central spec with FILE and FOLDER modes
- **Level 2: Templates** — business, procedures, kb
- **Level 3: Models** — Concrete data instances

## Open Knowledge Format compatibility

FORMAT is **100% compatible** with [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (Open Knowledge Format) by Google Cloud Platform. Every FORMAT document is a valid OKF knowledge bundle:

- **Shared substrate**: Both use Markdown + YAML frontmatter. No proprietary tooling.
- **Conformance**: OKF's three conformance rules (parseable frontmatter, non-empty `type`, reserved filenames) are fully met by FORMAT's structure.
- **Tolerant extensions**: OKF explicitly tolerates unknown frontmatter keys and unknown `type` values — FORMAT's richer metadata (`specification_version`, `level`, `parent`, `concepts`, `markers`, `matrices`) is fully compatible.
- **FOLDER mode = Bundle**: FORMAT FOLDER mode produces exactly the directory tree OKF defines as a knowledge bundle. Each `_FORMAT.md` is an OKF concept document.

[Home](https://innv0.github.io/cogNNitive/)
