# Pruebas Progresivas — format-editor

Este directorio contiene modelos FORMAT de prueba para verificar que la aplicación
format-editor carga, parsea y muestra correctamente modelos en modo FILE y FOLDER.

## Estructura

```
tests/
├── README.md                        # ⬅ estás acá
├── fixtures/
│   ├── file-model_FORMAT.md         # Modelo FILE (mode: FILE, 5 elementos inline)
│   └── folder-model/                # Modelo FOLDER (árbol de directorios)
│       ├── _FORMAT.md               # Root con conceptos declarados (mode: FOLDER)
│       ├── Risk/                    # Concepto declarado (bare dir, sin _FORMAT.md)
│       │   ├── tech-debt/
│       │   │   └── _FORMAT.md       # type: Risk, fields: severity, probability...
│       │   └── timeline/
│       │       └── _FORMAT.md
│       ├── Feature/                 # Concepto declarado (bare dir)
│       │   ├── auth/
│       │   │   └── _FORMAT.md       # type: Feature, fields: status, priority...
│       │   └── dashboard/
│       │       └── _FORMAT.md
│       └── Meeting/                 # Subcarpeta con su propio _FORMAT.md
│           └── _FORMAT.md           # mode: FOLDER, 3 elementos inline
└── progressive-smoke.test.ts        # Tests automatizados (corren desde apps/format-editor)
```

> ⚠️ **Nota técnica**: El parser (`recursiveParse`) ignora archivos `_FORMAT.md`
> al nivel raíz del workspace (línea 408 de recursiveParser.ts). Por eso el
> modelo FILE se llama `file-model_FORMAT.md` y no `file-model/_FORMAT.md`.
> Los modelos FILE siempre deben llamarse `X_FORMAT.md`.

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

2. **Probar modelo FILE y FOLDER juntos**
   - En la Home, hacé clic en **"Open folder…"**
   - Navegá hasta `tests/fixtures/` y seleccioná la carpeta **completa**
   - ✅ En el árbol izquierdo aparecen AMBOS modelos:
     ```
     file-model (FILE)                ← archivo file-model_FORMAT.md
     ├── Baja adopción (element)
     ├── Costes elevados (element)
     ├── Competencia agresiva (element)
     ├── Onboarding exprés (element)
     └── Infraestructura optimizada (element)
     
     folder-model (FOLDER)            ← carpeta con _FORMAT.md
     ├── Risk (concept)
     │   ├── tech-debt (element)      ← type: Risk
     │   └── timeline (element)       ← type: Risk
     ├── Feature (concept)
     │   ├── auth (element)           ← type: Feature
     │   └── dashboard (element)      ← type: Feature
     └── Meeting (FOLDER)             ← subcarpeta con _FORMAT.md
         ├── Morning sync (element)
         ├── End-of-day check (element)
         └── Sprint 12 (element)
     ```

3. **O también por separado**
   - Para probar solo FILE: abrí cualquier carpeta que contenga `*_FORMAT.md`
   - Para probar solo FOLDER: abrí `tests/fixtures/folder-model/`

4. **Navegación y vistas**
   - ✅ Hacé clic en cualquier nodo del árbol → se selecciona y se abre en el editor
   - ✅ Cambiá entre vistas: **editor**, **graph**, **matrices**, **info**
   - ✅ En vista "info" se ven metadatos del modelo
   - ✅ En vista "graph" se ve el grafo de nodos
   - ✅ Seleccioná un elemento Risk → hacé clic en **Validate** → debe mostrar el reporte

### Modo 2: Prueba automatizada (vitest)

Los tests progresivos viven en `apps/format-editor/tests/progressive-smoke.test.ts`
y también cargan estos mismos fixtures desde la raíz:

```bash
cd apps/format-editor

# Todos los tests del proyecto
npm test

# Solo los progresivos (21 tests, Pasos 1-6)
npx vitest run tests/progressive-smoke.test.ts

# Con nombres detallados
npx vitest run tests/progressive-smoke.test.ts --reporter=verbose
```

---

## Árbol esperado por paso

### Paso 2 — Modelo FILE (`file-model_FORMAT.md`)

| Nodo | Tipo/Kind | StorageMode | Padre |
|---|---|---|---|
| file-model | root | FILE | null |
| Baja adopción | element | FILE | file-model |
| Costes elevados | element | FILE | file-model |
| Competencia agresiva | element | FILE | file-model |
| Onboarding exprés | element | FILE | file-model |
| Infraestructura optimizada | element | FILE | file-model |

### Paso 3 — Modelo FOLDER (`folder-model/`)

| Nodo | Tipo/Kind | StorageMode | Padre |
|---|---|---|---|
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

---

## Checklist de validación

Al final de las pruebas deberías poder marcar todo esto:

- [ ] **Paso 1**: La home carga sin errores
- [ ] **Paso 2a**: Abro `tests/fixtures/` y veo `file-model` (FILE) en el árbol
- [ ] **Paso 2b**: Los 5 elementos inline aparecen bajo file-model
- [ ] **Paso 2c**: Cada elemento muestra su badge "FILE"
- [ ] **Paso 3a**: `folder-model` aparece como root FOLDER
- [ ] **Paso 3b**: Risk y Feature aparecen como concept (badge "concept")
- [ ] **Paso 3c**: tech-debt y timeline son hijos de Risk (type: Risk)
- [ ] **Paso 3d**: auth y dashboard son hijos de Feature (type: Feature)
- [ ] **Paso 3e**: Meeting es un sub-FOLDER con Morning sync, End-of-day check, Sprint 12
- [ ] **Paso 4**: Navego entre vistas (editor/graph/matrices/info)
- [ ] **Paso 5**: Los tests automatizados pasan (21 tests)
