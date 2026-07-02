# Sandbox — Regreso al Futuro ⚡

Workspace FORMAT V_0-1-4 para probar la aplicación cogNNitive.

## Contenido FORMAT

| Archivo | Tipo | Template |
|---|---|---|
| `HillValleyTimeTravel_V_1-0-0_business_FORMAT.md` | FILE — negocio | business_V_0-1-1 |
| `TimeTravelProtocol_V_1-0-0_procedures_FORMAT.md` | FILE — procedimiento | procedures_V_0-1-1 |
| `BackToTheFuture_V_1-0-0_kb/` | FOLDER — knowledge base | kb_V_0-1-1 |

## Cómo probar

```bash
.\run-dev.bat
# Chrome → http://localhost:5174 → "Open folder" → Sandbox/
```

## Conformidad V_0-1-4

- `index.md` sin frontmatter (§5.1.1)
- `_F` index con wikilinks (parser actual)
- Modelos con `specification_version: "V_0-1-4"`
- KB elements con `type` field (§5.1.2 OKF conformance)
