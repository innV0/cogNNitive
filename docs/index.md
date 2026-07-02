---
title: cogNNitive — iNNv0 FORMAT Ecosystem Hub
description: cogNNitive is the central hub for the iNNv0 FORMAT ecosystem. Open, edit, and validate FORMAT models with the unified format-editor.
html_url: https://innv0.github.io/cogNNitive/
generator: https://skills.innv0.com/innv0-web-design-guide
---

# cogNNitive — iNNv0 Ecosystem Hub

Open, edit, and validate FORMAT models. cogNNitive is the central hub for the iNNv0 ecosystem.

## What is cogNNitive?

A monorepo that ties together the iNNv0 specification ecosystem:
- **format-editor** — unified Vue 3 workspace editor. Open any folder, parse FILE and FOLDER mode models into a single tree.
- **@innv0/format-core** — shared TypeScript parser, resolver, validator
- **Spec Chain** — defiNNe &rarr; FORMAT &rarr; Templates &rarr; Models

The **launcher** app (legacy two-app routing) is being consolidated into format-editor.

## How format-editor works

1. **Open workspace** — pick a folder via the File System Access API
2. **Single parse pass** — recursive parser walks every directory, building one unified tree
3. **Edit & validate** — sidebar tree + metamodel-driven forms + FORMAT compliance validation

## Ecosystem Architecture

- **Level 0: defiNNe** — Meta-specification, RFC 2119, versioning
- **Level 1: FORMAT** — Central spec with FILE and FOLDER modes
- **Level 2: Templates** — business, procedures, kb
- **Level 3: Models** — Concrete data instances

## Monorepo structure

```
cogNNitive/
├── apps/
│   ├── format-editor/  ← Vue 3 unified workspace editor
│   └── launcher/       ← Legacy — being consolidated
├── packages/
│   └── format-core/    ← TS parser, resolver, validator
├── specs/              ← Specification files
├── models/             ← Example models
└── docs/               ← This website
```

[About the project](https://innv0.github.io/cogNNitive/about)
[Documentation](https://innv0.github.io/cogNNitive/documentation)
