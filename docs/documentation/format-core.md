# @innv0/format-core

Shared TypeScript library used across the iNNv0 ecosystem.

## Features

- **Parser** — unified frontmatter, concept, and matrix parsing for both FILE and FOLDER modes
- **Model** — type definitions for Concept, Element, Field, Marker, Matrix, Relationship
- **Validator** — validates model instances against template schemas
- **IO Drivers** — `file-driver.ts` for single-document FILE mode, `folder-driver.ts` for node-based FOLDER mode (detects `_F.md` files)
- **Resolver** — resolves the parent chain from level 3 to level 0, downloading specs as needed and caching them locally

## API

```typescript
import { parseFrontmatter } from '@innv0/format-core';

// Parse YAML frontmatter from a FORMAT document
const fm = parseFrontmatter(content);
// Returns: { title, level, parent, mode, ... }
```

## Usage

```bash
# Build the library
npm run build -w @innv0/format-core

# Run tests
npm run test -w @innv0/format-core
```
