# Spec Consolidation — Documento de Trabajo

> Fecha: 2026-07-01 (v3 — parent como objeto name+url, modelos lightweight, specs/ caching, rich templates)
> Propósito: Unificar especificaciones del ecosistema iNNv0 bajo una arquitectura coherente.
> Estado: Borrador de análisis y propuesta.

---

## Índice

1. [Arquitectura del Ecosistema](#1-arquitectura-del-ecosistema)
2. [Decisiones Arquitectónicas](#2-decisiones-arquitectónicas)
3. [Estructura de Repositorios](#3-estructura-de-repositorios)
4. [Plan de Acción](#4-plan-de-acción)
5. [Estrategia de Integración de Apps](#5-estrategia-de-integración-de-apps)

---

## 1. Arquitectura del Ecosistema

### 1.1. Jerarquía de niveles

El ecosistema se organiza en **4 niveles**, donde cada nivel añade restricciones sobre el anterior:

```
NIVEL 0:  defiNNe — Meta-especificación: estructura, versionado, RFC 2119
NIVEL 1:  FORMAT — Especificación concreta: concepts, elements, fields, markers, relationships
           Modos: FILE (documento único) y FOLDER (nodo como carpeta)
NIVEL 2:  Templates — business, procedures, kb (knowledge base), anydeo (futuro)...
NIVEL 3:  Modelos — Ghostbusters, Onboarding, KnowledgeBase, VideoAd...
```

### 1.2. Principios

1. **defiNNe es la base común**: toda especificación del ecosistema se define en términos de defiNNe.
2. **Cada nivel añade restricciones, nunca las relaja**: lo que defiNNe dice MUST, FORMAT y sus templates lo heredan.
3. **FORMAT es la única especificación de nivel 1**: los antiguos FORMAT e iNNfo se unifican como **modos** (FILE y FOLDER) de una misma especificación.
4. **La nomenclatura del archivo solo codifica el nivel más bajo** (numéricamente más alto). Los niveles superiores se declaran en el frontmatter vía `parent`.
5. **Cada nivel declara su `parent` con versión explícita**: la cadena completa es resoluble desde cualquier archivo.

### 1.3. Cadena de dependencias (versiones)

Cada archivo conoce su lugar en la jerarquía mediante `level` y `parent` en el frontmatter. La cadena se resuelve ascendiendo:

```
Ghostbusters_V_0-3-0_business_FORMAT.md  (level 3)
  └── parent: "business_V_1-0-0" → business_V_1-0-0_FORMAT.md  (level 2)
        └── parent: "FORMAT_V_0-2-0" → FORMAT_V_0-2-0_FORMAT.md   (level 1)
              └── parent: "defiNNe_V_0-2-0" → defiNNe_V_0-2-0_FORMAT.md  (level 0)
```

**Para la especificación completa** (frontmatter canónico, modos FILE/FOLDER, body sections, tipos de relación), consultar:
- [`specs/FORMAT_V_0-1-3_FORMAT.md`](../specs/FORMAT_V_0-1-3_FORMAT.md) — especificación actual
- [`specs/CHANGELOG.md`](../specs/CHANGELOG.md) — cambios entre versiones

---

## 2. Decisiones Arquitectónicas

### 2.1. Unificación FILE + FOLDER en una sola especificación

En lugar de tener FORMAT e iNNfo como dos especificaciones hermanas, se unifican bajo FORMAT con dos modos de representación. Esto elimina la duplicación de conceptos y permite que una misma aplicación procese ambos modos con el mismo código.

**Rationale**: ambos modos modelan los mismos concepts, elements, fields, markers. Lo que cambia es la representación física (FILE = un solo archivo, FOLDER = carpeta con `_FORMAT.md` por nodo). Unificar evita tener dos parsers, dos validadores, dos modelos de datos.

### 2.2. Meta-sistema de tipos de relación

FORMAT define un sistema polimórfico de relaciones donde cada tipo tiene una representación distinta según el modo:

| Tipo | FILE | FOLDER |
|------|------|--------|
| hierarchy | Index block (wikilinks) | Subdirectorios |
| evaluable_matrix | Markdown tabla source→target | No aplica |
| graph_edge | Frontmatter `graph_edges` array | Frontmatter `graph_edges` |
| sequence | Concept type steps/sequence | Concept type steps/sequence |

Ver la spec en [`specs/FORMAT_V_0-1-3_FORMAT.md`](../specs/FORMAT_V_0-1-3_FORMAT.md) para definiciones completas.

### 2.3. Decisiones adicionales

| Decisión | Valor |
|---|---|
| `parent` | Objeto con `name` + `url`. `name` es el filename sin `_FORMAT.md`. `url` es un tag de git inmutable |
| Modelos (level 3) | **Lightweight** — NO llevan template inline. Solo `parent` + datos |
| Templates (level 2) | **Rich** — Philosophy, Objectives, Specification, Template, Examples en el body |
| FORMAT (level 1) | **Rich** — Philosophy, Objectives, Specification, Template, Examples |
| defiNNe (level 0) | **Rich** — Philosophy, Objectives, Specification, Template, Examples |
| Spec resolver | La app descarga la cadena de parents al cargar un modelo y lo cachea en `specs/` |
| Cache | `specs/<parent.name>_FORMAT.md` por cada nivel. En cargas sucesivas, usa el cache |
| Skills | NO son especificaciones. Referencian specs por URL, nunca duplican contenido |

### 2.4. Persistencia de URLs

Cada versión de cada especificación DEBE tener una URL que nunca cambie:

```
specification_url: "https://raw.githubusercontent.com/innV0/defiNNe/v0.2.0/defiNNe_V_0-2-0_FORMAT.md"
```

Estrategia primaria: **tag releases en GitHub** (gits tags inmutables). Opción de respaldo: repositorio único `innV0/specs/` como mirror inmutable.

---

## 3. Estructura de Repositorios

### 3.1. Principios

1. **Cada especificación tiene su propio repositorio**.
2. **Mínima información**: solo la especificación, templates, samples, y código de validación/generación.
3. **Skills referencian specs por URL** — no duplican.
4. **El website referencia specs por URL** — no las alberga.

### 3.2. Mapa de repositorios

```
innV0/
├── defiNNe/         ← REPO NUEVO: meta-especificación
├── FORMAT/          ← REPO EXISTENTE: editor, parser, templates
├── iNNfo/           ← REPO EXISTENTE: migrar a docs de modo FOLDER (YA NO es spec separada)
├── innV0_skills/    ← REPO EXISTENTE: agent skills, apuntan a specs por URL
├── innV0.com/       ← REPO EXISTENTE: website sin specs embebidas (redirects)
├── VidGeNN/         ← REPO EXISTENTE: fase 2 — migrar a template FORMAT
├── cogNNitive/      ← REPO ACTUAL: este documento, SDD changes, formato V_0-1-3
└── specs/           ← REPO OPCIONAL: mirror inmutable de todas las specs
```

### 3.3. defiNNe sale de innV0.com

El `public/defiNNe/` actual en innV0.com debe reemplazarse por un redirect al raw del repo defiNNe.

---

## 4. Plan de Acción

### Fase 0: Consolidación de specs en cogNNitive (COMPLETADA)

1. ✅ Finalizar documento `spec_consolidation.md` con decisiones.
2. ✅ Publicar `FORMAT_V_0-1-3_FORMAT.md` actualizada con workspace index, esquema unificado.
3. ✅ Template `kb_V_0-1-1_FORMAT.md` como ejemplo de modo FOLDER.
4. 🔄 SDD consolidate-format-drivers: PR 1 (Core Abstraction), PR 2 (App Wiring), PR 3 (Data Completeness).

### Fase 1: Repositorios (PENDIENTE)

5. Crear repo `innV0/defiNNe` con `defiNNe_V_0-2-0_FORMAT.md`.
6. Actualizar spec FORMAT a `V_0-2-0` con modos, relaciones, RFC 2119.
7. Actualizar templates existentes con `level: 2`, `parent: "FORMAT_V_0-2-0"`.
8. Tag `v0.2.0` en git.
9. Actualizar README de iNNfo indicando migración a FORMAT modo FOLDER.

### Fase 2: Skills (PENDIENTE)

10. Auditar `innv0-format` skill: eliminar contenido duplicado de specs.
11. Actualizar skills manager para nueva estructura.

### Fase 3: App y librería compartida (EN CURSO)

12. ✅ Crear `@innv0/format-core` con parser unificado, modelo de datos, validador, IO drivers.
13. 🔄 Integrar en FORMAT app (Vue) — PR 2.3 del SDD.
14. Migrar iNNfo app (React) para que consuma `@innv0/format-core`.
15. Despreciar la spec separada de iNNfo.

### Fase 4: Website

16. Quitar `public/defiNNe/` de innV0.com, reemplazar con redirect.
17. Documentar modo FOLDER oficialmente en FORMAT docs.

### Fase 5: VidGeNN / Anydeo

18. Analizar migración de VUS a template FORMAT.

---

## 5. Estrategia de Integración de Apps

### 5.1. Situación actual

- **FORMAT app**: Vue 3 + Pinia → editor FILE mode funcional.
- **iNNfo app**: React + Radix → knowledge base FOLDER mode funcional.
- Stack común: Vite + Tailwind + TypeScript.

### 5.2. Estrategia: librería central compartida

No se fusionan las UIs. En su lugar se crea una **librería TypeScript pura** que ambas apps consumen:

```
📦 @innv0/format-core/
  ├── parser.ts               ← Parser unificado FILE+FOLDER
  ├── types.ts                 ← Modelo de datos común
  ├── identity.ts              ← IdentityRegistry para IDs cualificados
  ├── metamodel.ts             ← Resolución de metamodelo efectivo
  ├── driver.ts                ← ModelDriver interface + createDriver factory
  ├── driver-file.ts           ← FileDriver implementación
  ├── driver-folder.ts         ← FolderDriver implementación
  ├── recursiveParser.ts       ← Parser recursivo con soporte driver/handle
  ├── validator.ts             ← Validador contra template + contenido FORMAT
  └── index.ts                 ← Public API

📦 FORMAT app (Vue) — consume @innv0/format-core (modo FILE)
📦 iNNfo app (React) — consume @innv0/format-core (modo FOLDER)
```

### 5.3. Roadmap de la librería

1. ✅ Parser: extraer a `@innv0/format-core`.
2. ✅ Modelo: tipar concepts, elements, fields, markers, relationships.
3. ✅ File/Folder driver: IO abstraction para ambos modos.
4. ✅ Validador: validar modelo contra template + contenido FORMAT.
5. ✅ Integrar en FORMAT app: sustituir parser inline por `@innv0/format-core` (SDD PR 1-2).
6. Pendiente: Integrar en iNNfo app para modo FOLDER.

---

## Apéndice: Diff de versionado

| Documento | Versión actual | Versión propuesta | `level` |
|-----------|---------------|-------------------|---------|
| `defiNNe.md` | `0.1.1` | `V_0-2-0` | `0` |
| `_format.md` (FORMAT) | `V_0-1-0` | `V_0-2-0` | `1` |
| `iNNfo.defiNNe.md` | `1.1.0` | *(desaparece como spec)* | — |
| `business_V_0-1-1_FORMAT.md` | `V_0-1-1` | `V_1-0-0` | `2` |
| `procedures_V_0-1-1_FORMAT.md` | `V_0-1-1` | `V_1-0-0` | `2` |
| Modelos (`Ghostbusters_V_...`) | `V_x-y-z` | Sin cambios | `3` |

---

*Este documento es un artefacto de trabajo vivo. Para la especificación completa, ver [`specs/FORMAT_V_0-1-3_FORMAT.md`](../specs/FORMAT_V_0-1-3_FORMAT.md).*
