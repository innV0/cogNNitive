# Guía de Revisión de Calidad de Código — cogNNitive

> Qué mirar en este proyecto para garantizar **coherencia**, **buena estructura**,
> **aplicación de mejores prácticas** y, en general, **buena calidad de código**.
>
> Este documento sirve para dos cosas:
> 1. Como **prompt reutilizable** para lanzar una revisión (humana o con un agente).
> 2. Como **checklist accionable** con hallazgos concretos ya detectados en el repo.

---

## 1. Contexto del proyecto (stack real)

Monorepo con **npm workspaces** (`packages/*`, `apps/*`):

| Paquete | Rol | Stack |
|---|---|---|
| `apps/innfo-editor` | Editor visual (UI) | Vue 3 (SFC, `<script setup>`), Vite 6, TS 5, Pinia, Vue Router, Tailwind 3, d3/dagre/mermaid, radix-vue |
| `packages/innfo-core` | Librería de dominio: parser, modelo, drivers IO, validador | TS puro, compilado con `tsc`, sin dependencias de UI |
| `packages/innfo-mcp` | Servidor MCP sobre `innfo-core` (stdio) | TS + `@modelcontextprotocol/sdk`, build con `tsup` |
| `packages/format-core`, `packages/format-mcp` | ⚠️ **Legacy** — solo `dist/`, sin `src/` ni `package.json` de origen | Copias viejas anteriores al rename a `innfo-*` |

**Regla de oro de arquitectura**: `innfo-core` es el dominio y **no debe** conocer a Vue,
Pinia ni al navegador (salvo los drivers `-browser` explícitos). La UI depende del core,
nunca al revés.

---

## 2. Cómo usar este archivo como prompt

Pegá esto (o delegá a un agente de revisión) apuntando a un diff o al repo completo:

```
Revisá este código de cogNNitive usando docs/code-quality-review-guide.md.
Evaluá los cuatro ejes: coherencia, estructura, mejores prácticas y calidad general.
Para cada hallazgo indicá: archivo:línea, severidad (CRÍTICO/ALTO/MEDIO/BAJO),
el POR QUÉ técnico, y la corrección propuesta. No inventes problemas: si algo está
bien, decilo. Priorizá los hallazgos por impacto real, no por cantidad.
```

Severidades:
- **CRÍTICO**: rompe build/tests, bug de datos, vulnerabilidad, o viola el límite de capas.
- **ALTO**: deuda que va a doler pronto (SFC inmanejable, `any` en dominio, falta de tooling).
- **MEDIO**: incoherencia de convención, duplicación evitable, test faltante.
- **BAJO**: naming, formato, nit estético.

---

## 3. Ejes de revisión

### 3.1 Coherencia

Lo que hace que el código parezca escrito por **una sola cabeza**, no por diez.

- [ ] **Rutas de import unificadas.** Hoy conviven TRES formas de importar lo mismo:
      `@innv0/innfo-core`, `../model/types` (shims de re-export) y el alias `@/*`
      declarado en `tsconfig` pero casi sin uso. Decidí UNA convención por capa y aplicala:
  - Tipos/lógica de dominio → siempre desde `@innv0/innfo-core` (o el shim `@/model/*`),
    pero no ambos indistintamente.
  - Dentro del app → alias `@/` en vez de `../../..`.
- [ ] **Patrón de stores consistente.** Todos los stores usan Pinia Options API
      (`state/getters/actions`). Si aparece un store en Composition/Setup API, es una
      incoherencia: elegí un estilo y mantenelo.
- [ ] **Naming coherente**: `useXxx` para composables, `XxxStore`/`useXxxStore` para
      stores, `XxxWidget.vue` para widgets del registry, `FieldXxx.vue` para campos.
      Verificá que ningún archivo nuevo rompa la familia.
- [ ] **Idioma coherente**: código, identificadores y comentarios en inglés;
      documentación de proyecto (`AGENTS.md`, `openspec/`, esta guía) en español.
      No mezclar dentro de un mismo artefacto.
- [ ] **Un solo origen de verdad para el modelo.** `src/model/*.ts` deben seguir siendo
      shims finos de re-export; si empieza a aparecer lógica de dominio dentro del app,
      es una fuga de capa.

### 3.2 Estructura

- [ ] **Límite de capas app ↔ core.** `innfo-core` no debe importar nada de `apps/`,
      de Vue, de Pinia ni de `window`/DOM fuera de los drivers `-browser`. Buscá
      violaciones: `rg "from '.*apps/" packages/innfo-core/src`.
- [ ] **Tamaño de los SFC.** Componentes > ~300 líneas son señal de que hacen demasiado.
      Candidatos actuales a descomponer:
  - `components/layout/DirectoryPickerModal.vue` (~777)
  - `components/editor/GraphViewer.vue` (~669)
  - `components/editor/MatricesGrid.vue` (~561)
  - `components/editor/BlockSheet.vue` (~531)
      Extraé lógica a **composables** (`composables/`) y sub-componentes presentacionales.
- [ ] **Composables para lógica reutilizable/con estado**, no copiar-pegar `watch`/`ref`
      entre componentes. Ya hay un buen patrón en `composables/` (useFileSystem,
      useResizablePanel, etc.) — que las cosas nuevas lo respeten.
- [ ] **Container vs. presentational.** Los componentes que tocan stores/IO deberían
      orquestar; los que solo pintan deberían recibir props y emitir eventos. Un widget
      de campo no debería importar un store directamente.
- [ ] **Registry de widgets.** `shared/widgets/registry.ts` centraliza el mapeo tipo→widget.
      Todo widget nuevo se registra ahí; que no haya `if (type === ...)` sueltos en otro lado.
- [ ] **Sin código muerto.** Los packages `format-core`/`format-mcp` (solo `dist/`, sin
      fuentes, no importados por código vivo) deberían eliminarse o archivarse. Peso muerto
      que confunde a cualquiera que abra el repo.

### 3.3 Mejores prácticas

**TypeScript**
- [ ] `strict: true` ya está activo (bien). Protegé esa inversión: **minimizá `any`**.
      Hay ~57 usos de `any`/`as any` en ~11 archivos del app. Cada uno es un agujero en
      el sistema de tipos. Reemplazá por tipos concretos, genéricos o `unknown` + narrowing.
- [ ] Preferí `type`/`interface` explícitos sobre inferencia opaca en las fronteras
      públicas (exports de `innfo-core`, props de componentes, payloads de acciones).
- [ ] Nada de `@ts-ignore` sin comentario que justifique el porqué.

**Vue 3**
- [ ] `<script setup lang="ts">` en todos los SFC nuevos (consistencia).
- [ ] Props tipadas con `defineProps<T>()`, emits con `defineEmits<T>()`.
- [ ] No mutar props; no mutar estado de un store fuera de sus `actions`.
- [ ] `computed` para derivados, no recalcular en el template.
- [ ] Keys estables en `v-for` (no el índice cuando la lista se reordena — ojo con
      árboles y matrices que sí se reordenan aquí).
- [ ] Limpiar `watch`/listeners/observers en `onUnmounted` (d3, mermaid, ResizeObserver).

**Pinia**
- [ ] El estado se muta **solo** dentro de `actions`. Getters puros, sin efectos.
- [ ] Un store = una responsabilidad (model, metamodel, ui, history, workspace).
      Si un store empieza a tocar responsabilidades de otro, revisá el límite.

**Seguridad**
- [ ] Todo HTML/Markdown renderizado pasa por `dompurify`/`utils/sanitize.ts`.
      Buscá `v-html` sin sanitizar: `rg "v-html" apps/innfo-editor/src`. Cada `v-html`
      debe consumir contenido ya saneado.
- [ ] Nada de `eval`, `new Function`, ni interpolación de input de usuario en selectores/URLs.

**Accesibilidad / UX**
- [ ] Modales (radix-vue) con foco atrapado, `Esc` para cerrar y roles ARIA correctos.
- [ ] Elementos interactivos que no sean `<button>`/`<a>` con `role` y manejo de teclado.

### 3.4 Calidad general y tooling

Aquí está el **mayor déficit del repo hoy**:

- [ ] ⚠️ **No hay linter.** No existe ESLint/Biome en ningún workspace. Sin esto, las
      convenciones de arriba no se pueden **garantizar**, solo esperar. Recomendación:
      añadir **ESLint 9 (flat config) + `eslint-plugin-vue` + `typescript-eslint`**, o
      **Biome** si se prioriza velocidad. Un script `lint` en la raíz y en cada workspace.
- [ ] ⚠️ **No hay formateador.** Sin Prettier/Biome-format, el estilo depende de la
      disciplina de cada uno. Añadir formateador con config compartida en la raíz.
- [ ] ⚠️ **No hay CI.** No existe `.github/workflows/`. Todo (typecheck, tests, build)
      corre solo en local y por buena voluntad. Añadir un workflow que en cada PR corra:
      `vue-tsc --noEmit`, `vitest run`, build de packages, y (cuando exista) `lint`.
      Los e2e de Playwright, al menos en un job nightly o manual.
- [ ] **Typecheck real.** El build del app ya hace `vue-tsc --noEmit` (bien). Asegurá que
      los packages también typecheckean en CI, no solo compilan.
- [ ] **Tests.** Hay buena base: ~49 specs, golden tests (`tests/golden/`) y e2e Playwright.
      Verificá que el código nuevo llegue con tests y que los golden se actualicen
      **conscientemente**, no a ciegas (`--update` sin leer el diff es un anti-patrón).
      Ojo con CRLF en Windows en los golden (ya hubo fixes por `autocrlf`).
- [ ] **`console.*` fuera de producción.** Hay ~5 llamadas `console` en el app. Definí una
      política: logger centralizado o eliminarlas antes de mergear.
- [ ] **Dependencias sin fijar / duplicadas.** `@innv0/innfo-core` está referenciado como
      `"*"` en el app y `"^0.1.0"` en el mcp. Unificá el criterio de versionado interno.

---

## 4. Hallazgos concretos ya detectados (para arrancar con ventaja)

| # | Severidad | Hallazgo | Dónde |
|---|---|---|---|
| 1 | ALTO | Sin ESLint/Prettier/Biome en todo el monorepo | raíz + todos los workspaces |
| 2 | ALTO | Sin CI (`.github/workflows` inexistente) | raíz |
| 3 | MEDIO | Packages muertos `format-core`/`format-mcp` (solo `dist/`) | `packages/format-*` |
| 4 | MEDIO | Tres estilos de import para el dominio (`@innv0/...`, `../model/*`, alias `@/` sin uso) | `apps/innfo-editor/src` |
| 5 | MEDIO | ~57 usos de `any`/`as any` erosionan `strict: true` | ~11 archivos del app |
| 6 | MEDIO | SFCs > 500 líneas difíciles de mantener/testear | `DirectoryPickerModal`, `GraphViewer`, `MatricesGrid`, `BlockSheet` |
| 7 | BAJO | Versionado interno inconsistente (`"*"` vs `"^0.1.0"`) | `package.json` del app y del mcp |

**Lo que está BIEN y hay que preservar** (no romper al refactorizar):
- `tsconfig` con `strict: true`.
- `src/model/*` como shims finos de re-export (fachada correcta que preserva rutas).
- Stores Pinia consistentes y con JSDoc explicando decisiones de diseño.
- Separación de dominio (`innfo-core`) sin dependencias de UI.
- Infraestructura de test completa: unit + golden + e2e.

---

## 5. Checklist rápido antes de mergear

```
[ ] vue-tsc --noEmit pasa sin errores
[ ] vitest run verde (unit + golden)
[ ] No hay v-html sin sanitizar nuevos
[ ] No hay any nuevos en dominio (innfo-core) ni en fronteras públicas
[ ] Ningún SFC nuevo supera ~300 líneas sin justificación
[ ] Imports siguen la convención de su capa
[ ] No quedan console.* ni código comentado
[ ] Si toca el modelo, los golden se actualizaron leyendo el diff
```
