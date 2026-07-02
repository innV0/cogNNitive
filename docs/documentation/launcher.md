# cogNNitive Launcher *(legacy)*

> **Note:** The Launcher is being consolidated into [format-editor](format-editor). Its validation, history, and toast components are being ported over. The two-app routing model (FILE → file-format, FOLDER → folder-format) is obsolete — format-editor handles both modes in a single workspace tree. This app remains available during the transition.

The Launcher is a Vue 3 + Vite application that served as the entry point for the FORMAT ecosystem.

## How it works

1. **Open a folder** — click "Abrir carpeta" or drag a folder onto the drop zone
2. **Scan & validate** — the Launcher scans every markdown file using `@innv0/format-core`, identifies FORMAT-compliant folders (`_FORMAT.md`) and files (`.md` with FORMAT frontmatter)
3. **Explore** — the contents are displayed in a visual browser with validation reports
4. **Open** — click any item to open it in the appropriate editor (historically file-format or folder-format)

## Development

```bash
# From repo root
npm run dev -w @innv0/launcher
```
