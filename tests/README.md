# Pruebas Progresivas — format-editor

Este directorio contiene modelos FORMAT de prueba para verificar que la aplicación
format-editor carga, parsea y muestra correctamente modelos en modo FILE y FOLDER.

## Estructura completa

```
tests/
├── README.md                        # ⬅ estás acá
└── fixtures/
    ├── workspace-index.md           # Índice del workspace de prueba
    ├── catalog_F.md            # Business FILE — AI Industry Catalog
    ├── file-model_F.md         # Business FILE — progressive smoke test
    ├── sample-model_F.md       # Business FILE — minimal shape validation
    ├── folder-model/                # KB FOLDER — progressive smoke test
    │   ├── _F.md
    │   ├── Risk/
    │   │   ├── tech-debt/_F.md
    │   │   └── timeline/_F.md
    │   ├── Feature/
    │   │   ├── auth/_F.md
    │   │   └── dashboard/_F.md
    │   └── Meeting/_F.md
    ├── music-business/
    │   └── music-business_F.md  # Business FILE — Vinyl Records Inc.
    ├── music-catalog/               # Catalog FOLDER
    │   ├── _F.md
    │   ├── Artist/
    │   │   ├── Radiohead/_F.md
    │   │   └── Nina Simone/_F.md
    │   ├── Album/
    │   │   ├── OK Computer/_F.md
    │   │   └── I Put a Spell on You/_F.md
    │   ├── Genre/
    │   │   ├── Alternative Rock/_F.md
    │   │   └── Jazz Blues/_F.md
    │   └── Instrument/
    │       ├── Electric Guitar/_F.md
    │       └── Piano/_F.md
    ├── music-production/
    │   └── music-production_F.md # Procedures FILE — Song Recording
    └── music-kb/                     # KB FOLDER
        ├── _F.md
        ├── Producer/_F.md
        ├── Music Theory/_F.md
        └── Mixing Guide/_F.md
```

## Propósito de cada modelo

| Modelo | Template | Modo | Propósito |
|--------|----------|------|-----------|
| `catalog_F.md` | business_V_0-1-1 | FILE | Catálogo AI Industry — conceptos Problems y Value propositions |
| `file-model_F.md` | business_V_0-1-1 | FILE | Smoke test FILE — 5 elementos inline con Business summary, Problems, Value propositions |
| `sample-model_F.md` | business_V_0-1-1 | FILE | Validación mínima de forma — 1 elemento Problem |
| `folder-model/` | kb_V_0-1-1 | FOLDER | Smoke test FOLDER — Topics anidados (Risk, Feature) y sub-modelo Meeting |
| `music-business/` | business_V_0-1-1 | FILE | Negocio discográfico completo — Problems, Value propositions, Channels, Stakeholders, matriz |
| `music-catalog/` | catalog_V_0-1-2 | FOLDER | Catálogo musical — Artists, Albums, Genres, Instruments con graph_edges |
| `music-production/` | procedures_V_0-1-1 | FILE | Workflow de grabación — Work steps, Artifacts, Tools, Roles, 3 matrices |
| `music-kb/` | kb_V_0-1-1 | FOLDER | Base de conocimiento — Personas, Topics, References con graph_edges |

> ⚠️ **Nota técnica**: El parser (`recursiveParse`) ignora archivos `_F.md`
> al nivel raíz del workspace (línea 408 de recursiveParser.ts). Por eso los
> modelos FILE se llaman `*_F.md` y no `*/_F.md`.
> Los modelos FOLDER se representan como carpetas con `_F.md` adentro.

---

## Instrucciones paso a paso

### Requisito previo

```bash
cd apps/format-editor
npm install
npm --prefix ../../packages/format-core run build
```

### Modo 1: Prueba en el navegador (manual)

1. **Iniciar la app**
   ```bash
   cd apps/format-editor
   npm run dev
   ```
   Abrí http://localhost:5173/app/ en Chrome o Edge.

2. **Probar modelos**
   - En la Home, hacé clic en **"Open folder…"**
   - Navegá hasta `tests/fixtures/` y seleccioná la carpeta **completa**
   - ✅ En el árbol izquierdo aparecen todos los modelos registrados en `workspace-index.md`

3. **Navegación y vistas**
   - ✅ Hacé clic en cualquier nodo del árbol → se selecciona y se abre en el editor
   - ✅ Cambiá entre vistas: **editor**, **graph**, **matrices**, **info**
   - ✅ En vista "info" se ven metadatos del modelo
   - ✅ En vista "graph" se ve el grafo de nodos

### Modo 2: Prueba automatizada (vitest)

Los tests progresivos viven en `apps/format-editor/tests/progressive-smoke.test.ts`:

```bash
cd apps/format-editor

# Todos los tests del proyecto
npm test

# Solo los progresivos
npx vitest run tests/progressive-smoke.test.ts

# Con nombres detallados
npx vitest run tests/progressive-smoke.test.ts --reporter=verbose
```

---

## Árbol esperado por paso

### Paso 2 — Modelo FILE (`file-model_F.md`)

| Nodo | Tipo/Kind | StorageMode | Padre |
|------|-----------|-------------|-------|
| file-model | root | FILE | null |
| Baja adopción | element | FILE | file-model |
| Costes elevados | element | FILE | file-model |
| Competencia agresiva | element | FILE | file-model |
| Onboarding exprés | element | FILE | file-model |
| Infraestructura optimizada | element | FILE | file-model |

### Paso 3 — Modelo FOLDER (`folder-model/`)

| Nodo | Tipo/Kind | StorageMode | Padre |
|------|-----------|-------------|-------|
| folder-model | root | FOLDER | null |
| Risk | concept | FOLDER | folder-model |
| tech-debt | element | FOLDER | Risk |
| timeline | element | FOLDER | Risk |
| Feature | concept | FOLDER | folder-model |
| auth | element | FOLDER | Feature |
| dashboard | element | FOLDER | Feature |
| Meeting | root | FOLDER | folder-model |
| Morning sync | element | FOLDER | Meeting |
| End-of-day check | element | FOLDER | Meeting |
| Sprint 12 | element | FOLDER | Meeting |

### Modelo — Music Business (`music-business/music-business_F.md`)

| Nodo | Tipo/Kind | StorageMode | Padre |
|------|-----------|-------------|-------|
| music-business | root | FILE | null |
| Business summary | text | FILE | music-business |
| Streaming revenue decline | element | FILE | Problems |
| Manufacturing costs | element | FILE | Problems |
| Discovery challenges | element | FILE | Problems |
| Audiophile quality | element | FILE | Value propositions |
| Curated catalog | element | FILE | Value propositions |
| Direct-to-fan | element | FILE | Value propositions |
| Record stores | element | FILE | Channels |
| Direct e-commerce | element | FILE | Channels |
| Artists | element | FILE | Stakeholders |
| Distributors | element | FILE | Stakeholders |
| Collectors | element | FILE | Stakeholders |
| problems-value propositions matrix | matrix | FILE | music-business |

### Modelo — Music Catalog (`music-catalog/`)

| Nodo | Tipo/Kind | StorageMode | Padre |
|------|-----------|-------------|-------|
| music-catalog | root | FOLDER | null |
| Artist | concept (type folder) | FOLDER | music-catalog |
| Radiohead | element (Artist) | FOLDER | Artist |
| Nina Simone | element (Artist) | FOLDER | Artist |
| Album | concept (type folder) | FOLDER | music-catalog |
| OK Computer | element (Album) | FOLDER | Album |
| I Put a Spell on You | element (Album) | FOLDER | Album |
| Genre | concept (type folder) | FOLDER | music-catalog |
| Alternative Rock | element (Genre) | FOLDER | Genre |
| Jazz Blues | element (Genre) | FOLDER | Genre |
| Instrument | concept (type folder) | FOLDER | music-catalog |
| Electric Guitar | element (Instrument) | FOLDER | Instrument |
| Piano | element (Instrument) | FOLDER | Instrument |

### Modelo — Music Production (`music-production/music-production_F.md`)

| Nodo | Tipo/Kind | StorageMode | Padre |
|------|-----------|-------------|-------|
| music-production | root | FILE | null |
| Procedure | text | FILE | music-production |
| Songwriting | element (Work) | FILE | Work |
| Pre-production | element (Work) | FILE | Work |
| Tracking | element (Work) | FILE | Work |
| Editing | element (Work) | FILE | Work |
| Mixing | element (Work) | FILE | Work |
| Mastering | element (Work) | FILE | Work |
| Demo recording | element (Artifact) | FILE | Artifact |
| Multitrack session | element (Artifact) | FILE | Artifact |
| Stereo mix | element (Artifact) | FILE | Artifact |
| Mastered track | element (Artifact) | FILE | Artifact |
| DAW | element (Tools) | FILE | Tools |
| Microphone | element (Tools) | FILE | Tools |
| Audio interface | element (Tools) | FILE | Tools |
| Monitoring headphones | element (Tools) | FILE | Tools |
| Producer | element (Roles) | FILE | Roles |
| Recording Engineer | element (Roles) | FILE | Roles |
| Mixing Engineer | element (Roles) | FILE | Roles |
| Mastering Engineer | element (Roles) | FILE | Roles |
| work-roles matrix | matrix | FILE | music-production |
| work-tools matrix | matrix | FILE | music-production |
| work-artifacts matrix | matrix | FILE | music-production |

### Modelo — Music KB (`music-kb/`)

| Nodo | Tipo/Kind | StorageMode | Padre |
|------|-----------|-------------|-------|
| music-kb | root | FOLDER | null |
| Producer | element (Persona) | FOLDER | music-kb |
| Music Theory | element (Topic) | FOLDER | music-kb |
| Mixing Guide | element (Reference) | FOLDER | music-kb |

---

## Checklist de validación

Al final de las pruebas deberías poder marcar todo esto:

- [ ] **Paso 1**: La home carga sin errores
- [ ] **Paso 2a**: Abro `tests/fixtures/` y veo `file-model` (FILE) en el árbol
- [ ] **Paso 2b**: Los 5 elementos inline aparecen bajo file-model
- [ ] **Paso 2c**: Cada elemento muestra su badge "FILE"
- [ ] **Paso 3a**: `folder-model` aparece como root FOLDER
- [ ] **Paso 3b**: Risk y Feature aparecen como concept (badge "concept")
- [ ] **Paso 3c**: tech-debt y timeline son hijos de Risk (type: Topic)
- [ ] **Paso 3d**: auth y dashboard son hijos de Feature (type: Topic)
- [ ] **Paso 3e**: Meeting es un sub-FOLDER con Morning sync, End-of-day check, Sprint 12
- [ ] **Paso 4**: Navego entre vistas (editor/graph/matrices/info)
- [ ] **Paso 5**: Los tests automatizados pasan
- [ ] **Music Business**: Aparece music-business (FILE) con 12 elementos y 1 matriz
- [ ] **Music Catalog**: Aparece music-catalog (FOLDER) con Artist/Album/Genre/Instrument como type folders
- [ ] **Music Catalog**: Radiohead tiene graph_edges hacia OK Computer y Alternative Rock
- [ ] **Music Catalog**: Nina Simone tiene graph_edges hacia I Put a Spell on You, Jazz Blues y Piano
- [ ] **Music Production**: Aparece music-production (FILE) con 6 Work steps, 4 Artifacts, 4 Tools, 4 Roles, 3 matrices
- [ ] **Music KB**: Aparece music-kb (FOLDER) con Producer (Persona), Music Theory (Topic), Mixing Guide (Reference)
- [ ] **Music KB**: Music Theory tiene graph_edge hacia Producer
