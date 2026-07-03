# Usage Guide

## Creating a FORMAT Model

A FORMAT model is a Markdown file with YAML frontmatter following the spec chain conventions.

```markdown
---
spec_version: "V_0-2-0"
level: 3
parent: "business_V_1-0-0"
model_version: "V_0-1-0"
title: "My Model"
mode: "FILE"
---

# My Model

_F Strategy

* _F Strategy: Core Objective
  * type: text
  * value: "Build the next generation of..."

_F Metrics

* _F Metrics: KPI
  * type: text
  * value: "Monthly active users"
```

## FILE vs FOLDER Mode

- **FILE mode**: everything in one `.md` file. Best for text-heavy models with matrix relationships.
- **FOLDER mode**: each element is a directory with `_F.md`. Best for models with physical assets (images, PDFs).

## Running the Launcher

```bash
# From the cogNNitive repo root
npm install
npm run dev -w @innv0/launcher
```

Open http://localhost:5173 in your browser.
