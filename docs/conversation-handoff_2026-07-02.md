# Handoff — Conversación 2026-07-02

> Fichero de handoff para continuar esta conversación en una sesión nueva.
> Guardado por el orquestador `gentle-orchestrator` en cogNNitive.

---

## Resumen

Conversación sobre la unificación de los modos FILE y FOLDER en FORMAT.
El usuario propuso y refinó una visión donde **no hay dos modos distintos**,
sino un único modelo que puede representarse físicamente de dos formas:
todo en un archivo (FILE clásico) o distribuido en archivos individuales
con un root `index.md` que actúa como índice.

---

## Decisiones clave

### 1. FILE y FOLDER convergen en un solo modelo

| Antes | Después |
|---|---|
| FILE mode y FOLDER mode como modos separados | Un solo modelo. Dos representaciones físicas. |
| La estructura de carpetas definía jerarquía | La jerarquía viene del `index.md` (root `_FORMAT.md`). |
| Conceptos como carpetas sin `_FORMAT.md` | No hay nodos "concept" estructurales. Solo existe lo que está en el índice. |

### 2. El root `_FORMAT.md` (o `index.md`) es el source of truth

Contiene:
- Frontmatter con metadatos del modelo (`parent`, `model_version`, etc.)
- `# _F index` con wikilinks `[[Name]]` para la taxonomía (nombres únicos en el workspace)
- Secciones de concepto `# _F ConceptName` con elementos `* _F Concept: Name`
- Cada elemento PUEDE tener un pointer `→ [file](./path/_FORMAT.md)` a su archivo individual
- Los YAML blocks con fields pueden estar inline (en el root) o en el archivo individual
- El orden de los elementos en el root define el orden semántico

### 3. Nombres únicos en todo el workspace (como Wikipedia)

- No puede haber dos elementos con el mismo nombre en el workspace
- Si hay colisión → la aplicación pide desambiguar
- graph_edges usan nombres directos: `target: "Queen"` (no rutas relativas)
- Esto elimina la necesidad de qualified IDs compuestos (`Artist/Queen`)

### 4. Templates opcionales

- Un modelo nivel 3 PUEDE incluir `concepts:` en su frontmatter para autodefinir su metamodelo
- Los templates (nivel 2) son solo para reuso, no obligatorios

### 5. Assets como fields, no como concepto separado

- Un field de tipo `file`/`image`/`video` referencia un path relativo
- El elemento se organiza en carpeta si tiene assets, o puede estar inline si no
- La UI muestra previsualización según el tipo (thumbnail para imágenes, link para PDFs, etc.)
- Coincide con el modelo de OKF: assets son markdown links desde el contenido

### 6. UI: mismos widgets para ambos modos

- `BlockSheet.vue` para edición individual de un elemento (fields, markers, descripción)
- Tabla por concepto (por implementar): elementos como filas, fields como columnas
- `WidgetField` → `FieldString`, `FieldSelect`, `FieldNumber`, etc. ya funcionan contra `modelStore`
- No necesitan saber el modo de almacenamiento — el store normaliza todo a `ModelNode`

### 7. OKF compliance

- Cambiar sufijo `_FORMAT.md` por `.md` NO es necesario — `_FORMAT.md` SÍ es un `.md` válido
- Adoptar `index.md` como root acercaría aún más a OKF
- Los requerimientos OKF (frontmatter con `type`, index.md opcional, links markdown) son compatibles
- Workspace compliant con ajustes mínimos

---

## Fixtures creados

### `tests/fixtures/catalog-single-file_FORMAT.md`

Modelo FILE clásico, todo en un archivo. Conceptos: Problems, Value propositions.
5 elementos con fields (severity, impact, owner).

### `tests/fixtures/catalog-distributed/`

MISMO modelo semántico, pero distribuido:
```
catalog-distributed/
├── _FORMAT.md                                   ← root con índice + elementos + pointers
├── problems/baja-adopcion/_FORMAT.md             ← type: Problems (profundidad 2)
├── expenses/costes-elevados._FORMAT.md           ← type: Problems (archivo suelto, fractal)
├── expenses/deeper/competencia._FORMAT.md        ← type: Problems (profundidad 3)
├── value-props/onboarding._FORMAT.md             ← type: Value propositions
└── value-props/infra/infra-optimizada._FORMAT.md ← type: Value propositions (profundidad 3)
```

**Ambos se parsean idénticamente** (verificado con script inline).
La profundidad de carpetas es irrelevante semánticamente.

---

## Preguntas abiertas para la siguiente sesión

1. **Tabla por concepto**: ¿cómo implementar la vista tabla que muestre todos los elementos de un concepto como filas y fields como columnas? Debería reutilizar `WidgetField` y el mismo mecanismo que las matrices del Folder-Format original.

2. **Convención de naming para el modelo distribuido**: ¿cómo resuelve el parser el archivo individual de un elemento? Por convención de nombre (`<name>/_FORMAT.md`, `<name>._FORMAT.md`) o por declaración explícita en el root (`→ [link](./path/_FORMAT.md)`).

3. **Nombres únicos**: ¿cómo implementar la detección de colisiones en el workspace? ¿Desambiguación automática (sufijo numérico) o preguntar al usuario?

4. **Mapeo field→asset**: ¿cómo convertir un field de tipo `file` que tiene valor `"photo.jpg"` en un asset navegable con previsualización? ¿El field type se declara en el concepto del template?

5. **Compatibilidad con modelos existentes**: ¿los modelos FOLDER actuales (folder-model, Music_History) se migran automáticamente o se mantienen con el parser legacy?

---

## Código relevante

| Archivo | Propósito |
|---|---|
| `packages/format-core/src/parser.ts` | Parseo de FILE mode (parseModel) |
| `packages/format-core/src/recursiveParser.ts` | Parseo recursivo con drivers |
| `packages/format-core/src/driver-folder.ts` | Driver FOLDER (listChildren, listAssets) |
| `packages/format-core/src/driver-file.ts` | Driver FILE (lectura de un archivo) |
| `packages/format-core/src/types.ts` | Tipos: ModelNode, ElementNode, etc. |
| `packages/format-core/src/identity.ts` | IdentityRegistry (colisiones, qualified IDs) |
| `packages/format-core/src/metamodel.ts` | Resolución de metamodelo efectivo |
| `apps/format-editor/src/components/editor/BlockSheet.vue` | Editor individual de elemento |
| `apps/format-editor/src/components/editor/TreeEditor.vue` | Editor árbol (selección → detalle) |
| `apps/format-editor/src/components/editor/BlockFeed.vue` | Feed de bloques por concepto |
| `apps/format-editor/src/shared/widgets/WidgetField.vue` | Widget genérico de field |
| `apps/format-editor/src/stores/modelStore.ts` | Store central de nodos |
| `tests/fixtures/catalog-single-file_FORMAT.md` | Fixture: single file |
| `tests/fixtures/catalog-distributed/_FORMAT.md` | Fixture: distributed root |

---

## Prompt para continuar

```
Continúa la conversación sobre la unificación de FILE y FOLDER mode en FORMAT.
Los puntos clave acordados hasta ahora:

1. FILE y FOLDER convergen en un solo modelo. La diferencia es solo física:
   todo en un archivo vs distribuido con root index.md (o _FORMAT.md).
2. El root contiene el índice (wikilinks [[Name]]), las secciones de concepto
   con elementos, y cada elemento puede tener un pointer a su archivo individual.
3. Los nombres de elemento son únicos en todo el workspace (como Wikipedia).
4. Templates son opcionales — un modelo puede definir concepts en frontmatter.
5. Assets son fields de tipo file/image/video que referencian paths relativos.
6. Los widgets de edición (WidgetField, BlockSheet) ya funcionan para ambos
   modos porque trabajan contra modelStore que es agnóstico.
7. OKF compliance es viable con ajustes mínimos.

Los fixtures están en:
- tests/fixtures/catalog-single-file_FORMAT.md (versión inline)
- tests/fixtures/catalog-distributed/ (versión distribuida)
Ambos representan el MISMO modelo semántico.

Temas pendientes para trabajar:
A. Implementar la vista tabla por concepto (elementos como filas, fields como
   columnas) reutilizando los widgets existentes.
B. Definir la convención de resolución de archivos individuales (por nombre
   vs declaración explícita).
C. Diseñar el mapeo field→asset para previsualización en tabla.
D. Revisar el parser actual (recursiveParser.ts) para que en lugar de escanear
   el FS, lea el root index.md y resuelva los elementos desde ahí.
```

---

## Memoria persistente (Engram)

Las siguientes observaciones están guardadas en Engram para recuperación
en futuras sesiones:

- `decision/file-y-folder-convergen-modelo-nico-distribuido-con-index-md`
- `architecture/assets-como-fields-dentro-del-modelo-okf-style`
- `architecture/ui-blocksheet-para-elemento-individual-tabla-para-concepto-completo`

Para recuperarlas: `mem_search(query: "FILE FOLDER convergen", project: "cognnitive")`
