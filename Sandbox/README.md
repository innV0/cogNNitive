# Sandbox — Regreso al Futuro

Workspace iNNfo V_0-2-0 para probar la aplicación cogNNitive.

## Contenido

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `HillValleyTimeTravel_V_1-0-0_business_NN.md` | FILE | Modelo de negocio con stakeholders, problemas, matrices grandes (16×10) |
| `TimeTravelProtocol_V_1-0-0_procedures_NN.md` | FILE | Procedimiento operativo con pasos, roles, herramientas, matrices |
| `BackToTheFuture_V_1-0-0_kb/` | FOLDER | Knowledge Base con entidades con colorHex, taxonomía, graph_edges |
| `workspace-regreso-al-futuro/` | WORKSPACE | Carpeta completa para abrir con File System Access API |

## Cómo cargar

### Opción 1: Abrir carpeta local (recomendado)

```bash
npm --prefix apps/innfo-editor run dev
# → http://localhost:5173
# → "Open Local Folder" → seleccionar sandbox/
```

**Qué abre**: `sandbox/index.md` con wikilinks a los modelos FILE-mode y al KB folder. El workspace `workspace-regreso-al-futuro/` se abre por separado (Opción 3).

### Opción 2: Cargar modelo individual por URL

```bash
# Desde el root del repo:
python -m http.server 8000
# En la app: "Load from URL" →
#   http://localhost:8000/sandbox/HillValleyTimeTravel_V_1-0-0_business_NN.md
#   http://localhost:8000/sandbox/TimeTravelProtocol_V_1-0-0_procedures_NN.md
```

### Opción 3: Cargar workspace o KB folder

```bash
# "Open Local Folder" → sandbox/workspace-regreso-al-futuro/
# "Open Local Folder" → sandbox/BackToTheFuture_V_1-0-0_kb/
```

## Testing Guide — Feature por Feature

---

### 1. 🎨 Tree Navigation — Colored Pills (BlockPill)

**Qué probar**: Pills con color de fondo, texto con contraste YIQ, contadores
de instancias, popups de información, estados ghost.

**Datos de prueba**:
| Entidad | colorHex | Perspectiva | Props |
|---------|----------|-------------|-------|
| DeLorean | `#059669` | Vehicles | Verde esmeralda, texto blanco (YIQ pasa) |
| Flux Capacitor | `#D97706` | Devices | Ámbar, texto blanco |
| Hoverboard | `#059669` | Vehicles | Mismo color que DeLorean (misma perspectiva) |
| Doc Brown | `#0891B2` | Protagonists | Cyan, texto blanco |
| Marty McFly | `#0891B2` | Protagonists | Mismo color que Doc (misma perspectiva) |

**Cómo probar**:
1. Cargar `BackToTheFuture_V_1-0-0_kb/` como carpeta
2. En el tree panel (sidebar izquierdo): cada entidad muestra un pill
   con su `colorHex` de fondo y texto blanco/negro según YIQ
3. Hover sobre un pill → muestra popup con info de la entidad
4. Entidades sin contenido → ghost state (opacidad reducida, itálica "Empty")

---

### 2. 📋 Sheet Content — BlockSheet 4 Tabs

**Qué probar**: Los 4 tabs del BlockSheet (View / Visual / History / Compliance),
Markdown rendering, inline graph, relaciones, media, field viewer, compliance.

**Cómo probar** (en cualquier entidad del KB):
1. Click en una entidad del tree → se abre BlockSheet en el panel derecho
2. **Tab View**: contenido Markdown de la entidad renderizado
3. **Tab Visual**: inline GraphViewer (320px) mostrando conexiones
4. **Tab History**: (placeholder para futura implementación)
5. **Tab Compliance**: reporte de validación scoped al tipo de concepto

**Datos de prueba específicos**:
- DeLorean: tiene bloque de código TypeScript + diagrama Mermaid → probar CodeWidget y MermaidWidget
- Flux Capacitor: tiene diagrama Mermaid flowchart → probar MermaidWidget
- Marty McFly: tiene tabla de habilidades + timeline Mermaid
- Doc Brown: tiene tabla de citas famosas

---

### 3. 🧩 Widget Registry — 14 Widgets

**Qué probar**: Cada uno de los 14 widgets implementados se renderiza
correctamente según el tipo de field.

**Mapa field → Widget**:

| Widget | Field a probar | Dónde verlo |
|--------|---------------|-------------|
| **DateWidget** | `build_date: "1981-01-01"` | DeLorean fields |
| **UrlWidget** | `website: "https://bttf.fandom.com/..."` | Todas las entidades |
| **ColorWidget** | `color: "#C0C0C0"` | DeLorean / Hoverboard fields |
| **MultiSelectWidget** | `tags: ["time-machine", "dmc-12", ...]` | Todas las entidades |
| **TagsWidget** | `tags` (mismo campo, edit mode) | Cambiar a edit mode en FieldViewer |
| **RatingWidget** | `rating: 5` / `rating: 3` | DeLorean (5) / Hoverboard (3) |
| **ScaleWidget** | `hoverboard_skill: 9` / `times_traveled: 5` | Marty fields |
| **ToggleGroupWidget** | `fuel_type: "gasoline + mr_fusion"` | DeLorean fields |
| **CycleWidget** | `status: "published"` | DeLorean / FluxCapacitor fields |
| **CodeWidget** | Bloque \`\`\`typescript en body | DeLorean body |
| **MermaidWidget** | Bloque \`\`\`mermaid en body | DeLorean / FluxCapacitor / Marty body |
| **DiagramWidget** | Diagramas DSL | (crear concepto con diagrama simple) |
| **TimestampWidget** | `invention_date: "1955-11-05"` | FluxCapacitor / Hoverboard fields |
| **MarkdownWidget** | Cuerpo del contenido con **negritas**, > citas, tablas | Todas las entidades |
| **FallbackWidget** | Cualquier field sin registro específico | `inventions_count: 47` en Doc Brown |

**Cómo probar**:
1. Abrir cualquier entidad del KB en BlockSheet
2. En **Tab View**, los fields aparecen en FieldViewer con su widget correspondiente
3. Click "Edit" → los widgets cambian a edit mode (inputs, selects, etc.)
4. Modificar un valor → verificar que emite `update:modelValue`

---

### 4. 🔄 Matrix Virtual Scrolling

**Qué probar**: Scrolling virtual en matrices grandes (10k+ celdas).

**Datos de prueba**: `HillValleyTimeTravel_V_1-0-0_business_NN.md`
contiene una matriz **Stakeholder × Service** de 16 filas × 10 columnas
(160 celdas con 9 valores distintos: Accountable, Responsible, Consulted,
Informed, Min, Max, Neutral, Low, High).

**Cómo probar**:
1. Cargar el modelo business
2. Navegar a la sección de matrices (al final del documento)
3. La matriz "Stakeholder × Service Impact" se renderiza con scroll virtual
4. **Probar scroll vertical** → solo se renderizan las filas visibles
5. **Probar scroll horizontal** → solo se renderizan las columnas visibles
6. **Verificar scroll persistence** → scroll hacia abajo, cambiar de sección,
   volver → la posición se restaura
7. **Editar celda** → click en una celda, cambiar valor, verificar que persiste

---

### 5. 📁 File System Operations

**Qué probar**: Directory Picker, URL loading, auto-backup.

**Cómo probar**:
1. **Directory Picker**: Botón "Open Local Folder" → seleccionar
   `sandbox/workspace-regreso-al-futuro/` → se carga el workspace completo
2. **URL Loading**: Botón "Load from URL" → pegar URL de un modelo →
   se parsea y carga correctamente
3. **Auto-backup**: Con backup activado, editar y guardar → verificar que
   aparece un backup en `backups/` dentro de la carpeta del modelo

**Datos de prueba del workspace**:
- `workspace-regreso-al-futuro/personajes/` → 4 personajes
- `workspace-regreso-al-futuro/vehiculos/` → 2 vehículos con componentes
- `workspace-regreso-al-futuro/misiones/` → 3 misiones
- `workspace-regreso-al-futuro/linea-temporal/` → 4 líneas temporales + alternativas
- `workspace-regreso-al-futuro/artefactos/` → artefactos

---

### 6. 🏷️ Taxonomy Perspectives

**Qué probar**: Panel de perspectiva de taxonomía con Parents/Children/Siblings,
navegación por clicks.

**Datos de prueba** (en KB root `_NN.md` frontmatter):

```yaml
taxonomy:
  roots:
    - concept: "Technology"      # colorHex: "#2563EB"
      children:
        - concept: "Vehicles"    # colorHex: "#059669"
        - concept: "Devices"     # colorHex: "#D97706"
        - concept: "Energy"      # colorHex: "#DC2626"
    - concept: "People"
      children:
        - concept: "Protagonists" # colorHex: "#0891B2"
        - concept: "Antagonists"  # colorHex: "#BE123C"
  community:
    label: "Back to the Future Universe"
    colorHex: "#4F46E5"
```

**Asignaciones por entidad**:

| Entidad | Perspectiva |
|---------|-------------|
| DeLorean | Vehicles |
| FluxCapacitor | Devices |
| Hoverboard | Devices |
| DocBrown | Protagonists |
| MartyMcFly | Protagonists |

**Cómo probar**:
1. Abrir KB folder
2. Seleccionar "DeLorean" → Panel de Perspectiva muestra:
   - **Parents**: Technology
   - **Children**: (ninguno)
   - **Siblings**: Hoverboard (mismo nivel en Technology?)
3. Click en un pill de perspectiva → se navega a esa entidad
4. Vista vacía: Biff Tannen no está en ninguna perspectiva → mensaje vacío

---

### 7. 💾 Session Persistence

**Qué probar**: IndexedDB guarda/restaura sesión, tree state, sidebar widths.

**Cómo probar**:
1. Abrir un modelo, expandir algunos nodos del tree, ajustar anchos de sidebar
2. **Recargar la página** (F5)
3. Verificar que:
   - El último archivo abierto se restaura
   - Los nodos expandidos siguen expandidos
   - Los anchos de sidebar persisten

---

### 8. 🔖 Version Management

**Qué probar**: Panel de versiones con bumps major/minor/patch.

**Datos de prueba**: Todos los modelos tienen `model_version: "V_1-0-0"`.

**Cómo probar**:
1. Abrir cualquier modelo
2. En ModelInfoPanel (panel derecho, sección info), expandir **Version Management**
3. Ver el version actual: `V_1-0-0`
4. Click **Major** → preview muestra `V_2-0-0`
5. Click **Minor** → preview muestra `V_1-1-0`
6. Click **Patch** → preview muestra `V_1-0-1`
7. Guardar → el archivo se guarda con el nuevo version en frontmatter
8. Botones disabled cuando no hay cambios pendientes

---

### 9. 📊 Matrices (BlockMatrixSummary)

**Qué probar**: Resumen de participación en matrices con chips coloreados.

**Datos de prueba**: Ambos modelos tienen múltiples matrices:
- HillValleyTimeTravel: problems-value propositions (4×3) + stakeholder-service (16×10)
- TimeTravelProtocol: work-roles (10×4), positions-roles (3×4), persons-positions (3×2),
  work-tools (10×5), work-artifacts (6×4)

**Cómo probar**:
1. Abrir HillValleyTimeTravel
2. Navegar a una sección que participa en matrices (ej: Problems)
3. BlockMatrixSummary muestra chips con colores acento por concepto
4. Cada chip muestra el count de celdas no-vacías

---

### 10. 🔗 BlockRelationships

**Qué probar**: Chips de relaciones clickables entre entidades.

**Datos de prueba**: Las entidades del KB tienen `graph_edges`:
- DeLorean → DocBrown ("built-by"), FluxCapacitor ("core-component"), Marty ("driven-by")
- FluxCapacitor → DocBrown ("invented-by"), DeLorean ("installed-in")
- DocBrown → Marty ("mentor"), DeLorean ("created"), FluxCapacitor ("invented")
- Marty → DocBrown ("student-mentor"), DeLorean ("drives"), Hoverboard ("uses")
- Hoverboard → Marty ("used-by")

**Cómo probar**:
1. Abrir DeLorean en el KB
2. BlockSheet → View tab → sección Relationships
3. Ver chips: "DocBrown" (built-by), "FluxCapacitor" (core-component), "MartyMcFly" (driven-by)
4. Click en un chip → navega a esa entidad

---

### 11. 🖼️ NodeMedia

**Qué probar**: Galería de imágenes y descarga de archivos.

**Cómo probar**:
1. Abrir una entidad con media attachments (si se configuran)
2. Ver galería en grilla de 2-3 columnas
3. Click en imagen → lightbox overlay
4. Archivos no-imagen → lista de descarga con iconos por tipo

---

### Resumen Rápido

| # | Feature | Dónde probarlo | Dato clave |
|---|---------|---------------|------------|
| 1 | Colored pills | Tree sidebar | colorHex en entidades KB |
| 2 | BlockSheet 4 tabs | Click entidad KB | Tab View/Visual/History/Compliance |
| 3 | Widgets (14 tipos) | FieldViewer en entidad | fields con tipos variados |
| 4 | Virtual scrolling | Matriz stakeholder-service (16×10) | 160 celdas |
| 5 | File System | Open Local Folder | workspace-regreso-al-futuro/ |
| 6 | Taxonomy | Perspectiva en KB | taxonomy en KB root |
| 7 | Session | F5 reload | Persiste tree + sidebar |
| 8 | Version | ModelInfoPanel | Bump major/minor/patch |
| 9 | MatrixSummary | Sección con matrices | Chips con count |
| 10 | Relationships | Entidad con graph_edges | Navegación click |
| 11 | NodeMedia | Entidad con attachments | Lightbox + descarga |
