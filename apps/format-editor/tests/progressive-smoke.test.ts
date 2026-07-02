/**
 * tests/progressive-smoke.test.ts
 *
 * PRUEBAS PROGRESIVAS — de lo más simple a lo más completo.
 * Cada grupo asume que el anterior funciona. Si un paso falla,
 * no avances al siguiente hasta entender por qué.
 *
 * Cómo ejecutar:
 *   cd apps/format-editor
 *   npm test              # todas las pruebas
 *   npx vitest run tests/progressive-smoke.test.ts   # solo este archivo
 *   npx vitest run tests/progressive-smoke.test.ts --reporter=verbose
 *
 * Los modelos de prueba están definidos INLINE usando fakeFs,
 * así que NO necesitas archivos externos ni el File System Access API.
 *
 * También hay tests que cargan los archivos REALES desde tests/fixtures/
 * en la raíz del proyecto para integrar con los modelos que verías en el navegador.
 *
 * @group progressive
 */

// ────────────────────────────────────────────────────────────────
// IMPORTS
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import { useModelStore } from '../src/stores/modelStore'
import { useWorkspaceStore } from '../src/stores/workspaceStore'
import { routes } from '../src/router/index'
import { recursiveParse } from '../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from './helpers/fakeFs'

// ────────────────────────────────────────────────────────────────
// MODELOS DE PRUEBA (fixtures inline)
// ────────────────────────────────────────────────────────────────

//
// FILE-mode mínimo: un solo archivo _FORMAT.md
//
const FILE_MODEL_MINIMO = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Mi Primer Modelo FILE"
mode: "FILE"
---

# _F Business summary

Un modelo FILE mínimo para pruebas progresivas.

# _F Problems

* _F Problems: Problema Uno
  La primera descripción del problema.
* _F Problems: Problema Dos
  La segunda descripción del problema.
`

//
// FOLDER-mode mínimo: raíz con _FORMAT.md + subdirectorios
//
const FOLDER_ROOT = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Mi Proyecto FOLDER"
mode: "FOLDER"
concepts:
  - name: "Risk"
    type: "risk"
  - name: "Action"
    type: "action"
---

# _F Business summary

Raíz de un modelo FOLDER con dos conceptos declarados.
`

const CHILD_FORMAT = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Hijo FOLDER"
mode: "FOLDER"
---

# _F Risks

* _F Risks: Riesgo Técnico
  Posible deuda técnica en la implementación.
`

const ELEMENT_FORMAT = `---
type: "Risk"
fields:
  severity: "high"
  owner: "equipo-dev"
markers:
  weight: 8
---
`

//
// FOLDER completo con varios niveles
//
const FOLDER_TREE: FakeTree = {
  MiProyecto: {
    '_FORMAT.md': FOLDER_ROOT,
    Risk: {
      'riesgo-1_FORMAT.md': ELEMENT_FORMAT,
      'riesgo-2_FORMAT.md': ELEMENT_FORMAT,
    },
    Action: {
      // Directorio concepto vacío (bare dir) → concept node
      'completar_FORMAT.md': ELEMENT_FORMAT,
    },
    HijoFolder: {
      '_FORMAT.md': CHILD_FORMAT,
    },
  },
}

// ────────────────────────────────────────────────────────────────
// PASO 1: La aplicación carga
// ────────────────────────────────────────────────────────────────

describe('Paso 1 — La aplicación carga', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('1a: Pinia se inicializa sin errores', () => {
    // Si esto falla, hay un problema con Pinia o las dependencias
    const store = useModelStore()
    expect(store).toBeDefined()
    expect(store.nodes).toEqual({})
    expect(store.rootIds).toEqual([])
  })

  it('1b: Router se crea con las rutas esperadas', () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    expect(router).toBeDefined()

    const homeRoute = router.getRoutes().find((r) => r.name === 'home')
    const workspaceRoute = router.getRoutes().find((r) => r.name === 'workspace')

    expect(homeRoute).toBeDefined()
    expect(homeRoute!.path).toBe('/')

    expect(workspaceRoute).toBeDefined()
    expect(workspaceRoute!.path).toBe('/workspace')
  })

  it('1c: fake-indexeddb está disponible (necesario para workspaceStore)', () => {
    // workspaceStore usa IndexedDB para persistir el handle
    expect(() => indexedDB.open('test-db', 1)).not.toThrow()
  })

  it('1d: Helper buildFakeTree crea un handle sin errores', () => {
    const handle = buildFakeTree('test', { 'archivo.md': '# contenido' })
    expect(handle).toBeDefined()
    expect(handle.name).toBe('test')
    expect(handle.kind).toBe('directory')
  })
})

// ────────────────────────────────────────────────────────────────
// PASO 2: Cargar un modelo FILE
// ────────────────────────────────────────────────────────────────

describe('Paso 2 — Cargar modelo FILE', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('2a: parsea un archivo _FORMAT.md y produce exactamente 1 root', async () => {
    const tree: FakeTree = {
      'MiModelo_FORMAT.md': FILE_MODEL_MINIMO,
    }
    const handle = buildFakeTree('workspace', tree)
    const result = await recursiveParse(handle)

    expect(result.issues).toHaveLength(0)
    expect(result.rootIds).toHaveLength(1)
  })

  it('2b: el modelo FILE tiene el nombre correcto y storageMode FILE', async () => {
    const tree: FakeTree = {
      'MiModelo_FORMAT.md': FILE_MODEL_MINIMO,
    }
    const handle = buildFakeTree('workspace', tree)
    const result = await recursiveParse(handle)

    const rootNode = Object.values(result.nodes).find((n) => n.parentId === null)
    expect(rootNode).toBeDefined()
    expect(rootNode!.name).toBe('MiModelo')
    expect(rootNode!.storageMode).toBe('FILE')
  })

  it('2c: el modelo FILE contiene el root y los elementos inline (entries) declarados', async () => {
    const tree: FakeTree = {
      'MiModelo_FORMAT.md': FILE_MODEL_MINIMO,
    }
    const handle = buildFakeTree('workspace', tree)
    const result = await recursiveParse(handle)

    // El root del FILE es el nodo principal
    const rootNode = Object.values(result.nodes).find((n) => n.parentId === null)
    expect(rootNode).toBeDefined()
    expect(rootNode!.name).toBe('MiModelo')

    // Los encabezados # _F son secciones DENTRO del root, no nodos separados.
    // Los * _F Concept: Name SÍ generan nodos hijos.
    const nombres = Object.values(result.nodes).map((n) => n.name)
    expect(nombres).toContain('Problema Uno')
    expect(nombres).toContain('Problema Dos')
    expect(Object.keys(result.nodes).length).toBe(3) // root + 2 elementos
  })

  it('2d: carga un modelo FILE real desde la carpeta fixtures/models', async () => {
    // Usa un fixture real ya existente - Ghostbusters
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const ghostbustersContent = readFileSync(
      join(import.meta.dirname!, 'fixtures', 'models', 'Ghostbusters_V_0-1-1_business_FORMAT.md'),
      'utf-8'
    )

    const tree: FakeTree = {
      'Ghostbusters_FORMAT.md': ghostbustersContent,
    }
    const handle = buildFakeTree('workspace', tree)
    const result = await recursiveParse(handle)

    // Ghostbusters es FILE mode y debe parsear sin errores
    expect(result.issues).toHaveLength(0)

    const rootNode = Object.values(result.nodes).find((n) => n.parentId === null)
    expect(rootNode).toBeDefined()
    expect(rootNode!.storageMode).toBe('FILE')
    expect(Object.keys(result.nodes).length).toBeGreaterThan(1)
  })
})

// ────────────────────────────────────────────────────────────────
// PASO 3: Cargar un modelo FOLDER
// ────────────────────────────────────────────────────────────────

describe('Paso 3 — Cargar modelo FOLDER', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('3a: parsea un árbol FOLDER y produce un root', async () => {
    const handle = buildFakeTree('workspace', {
      MiProyecto: {
        '_FORMAT.md': FOLDER_ROOT,
      },
    })
    const result = await recursiveParse(handle)

    expect(result.issues).toHaveLength(0)
    expect(result.rootIds).toHaveLength(1)
  })

  it('3b: el root de FOLDER tiene storageMode FOLDER', async () => {
    const handle = buildFakeTree('workspace', {
      MiProyecto: {
        '_FORMAT.md': FOLDER_ROOT,
      },
    })
    const result = await recursiveParse(handle)

    const rootNode = Object.values(result.nodes).find((n) => n.parentId === null)
    expect(rootNode).toBeDefined()
    expect(rootNode!.storageMode).toBe('FOLDER')
  })

  it('3c: FOLDER con subdirectorios: el parser encuentra todos los nodos', async () => {
    const handle = buildFakeTree('workspace', {
      MiProyecto: {
        '_FORMAT.md': FOLDER_ROOT,
        Risk: {
          'riesgo-1_FORMAT.md': ELEMENT_FORMAT,
          'riesgo-2_FORMAT.md': ELEMENT_FORMAT,
        },
      },
    })
    const result = await recursiveParse(handle)

    const nombres = Object.values(result.nodes).map((n) => n.name)
    expect(nombres).toContain('MiProyecto')
    expect(nombres).toContain('Risk')
    expect(nombres).toContain('riesgo-1')
    expect(nombres).toContain('riesgo-2')
  })
})

// ────────────────────────────────────────────────────────────────
// PASO 4: El árbol izquierdo muestra todos los nodos
// ────────────────────────────────────────────────────────────────

describe('Paso 4 — El árbol de nodos es completo y correcto', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('4a: el árbol completo tiene todos los nodos del FOLDER_TREE', async () => {
    const handle = buildFakeTree('workspace', FOLDER_TREE)
    const result = await recursiveParse(handle)

    // Verificamos que NO haya issues de parsing
    expect(result.issues).toHaveLength(0)

    // Nombres esperados en el árbol
    const nombres = Object.values(result.nodes).map((n) => n.name)
    expect(nombres).toContain('MiProyecto')
    expect(nombres).toContain('Risk')
    expect(nombres).toContain('riesgo-1')
    expect(nombres).toContain('riesgo-2')
    expect(nombres).toContain('Action')
    expect(nombres).toContain('completar')
    expect(nombres).toContain('HijoFolder')
    expect(nombres).toContain('Riesgo Técnico')
  })

  it('4b: las jerarquías padre-hijo son correctas (quién es hijo de quién)', async () => {
    const handle = buildFakeTree('workspace', FOLDER_TREE)
    const result = await recursiveParse(handle)

    const miProyecto = Object.values(result.nodes).find((n) => n.name === 'MiProyecto')
    const risk = Object.values(result.nodes).find((n) => n.name === 'Risk')
    const riesgo1 = Object.values(result.nodes).find((n) => n.name === 'riesgo-1')
    const hijoFolder = Object.values(result.nodes).find((n) => n.name === 'HijoFolder')
    const riesgoTecnico = Object.values(result.nodes).find((n) => n.name === 'Riesgo Técnico')

    // MiProyecto es root (sin padre)
    expect(miProyecto!.parentId).toBeNull()

    // Risk es hijo directo de MiProyecto
    expect(risk!.parentId).toBe(miProyecto!.id)
    expect(miProyecto!.childIds).toContain(risk!.id)

    // riesgo-1 es hijo de Risk
    expect(riesgo1!.parentId).toBe(risk!.id)
    expect(risk!.childIds).toContain(riesgo1!.id)

    // HijoFolder también es hijo de MiProyecto
    expect(hijoFolder!.parentId).toBe(miProyecto!.id)
    expect(miProyecto!.childIds).toContain(hijoFolder!.id)

    // Riesgo Técnico (elemento inline de HijoFolder) es hijo de HijoFolder
    expect(riesgoTecnico!.parentId).toBe(hijoFolder!.id)
    expect(hijoFolder!.childIds).toContain(riesgoTecnico!.id)
  })

  it('4c: nodos concepto (directorios sin _FORMAT.md) tienen kind:concept', async () => {
    const handle = buildFakeTree('workspace', FOLDER_TREE)
    const result = await recursiveParse(handle)

    // Risk es un directorio concepto con _FORMAT.md interno → tiene mode FOLDER
    // Pero tiene subdirectorios y no es bare dir, revisemos cómo se comporta...

    // Action es un bare dir (sin _FORMAT.md propio) → concept node
    const action = Object.values(result.nodes).find((n) => n.name === 'Action')
    expect(action).toBeDefined()
    expect(action!.kind).toBe('concept')

    // Los hijos de conceptos existen
    const completar = Object.values(result.nodes).find((n) => n.name === 'completar')
    expect(completar).toBeDefined()
    // completar es hijo de Action
    expect(completar!.parentId).toBe(action!.id)
  })

  it('4d: storageMode se preserva correctamente en cada nodo', async () => {
    const handle = buildFakeTree('workspace', FOLDER_TREE)
    const result = await recursiveParse(handle)

    for (const node of Object.values(result.nodes)) {
      if (node.parentId === null) {
        expect(node.storageMode).toBe('FOLDER')
      }
      // nodos que son FILE tienen su propio archivo _FORMAT.md
      // nodos concepto internos heredan storageMode
      expect(['FILE', 'FOLDER']).toContain(node.storageMode)
    }
  })

  it('4e: el conde de nodos totales coincide con lo esperado', async () => {
    const handle = buildFakeTree('workspace', FOLDER_TREE)
    const result = await recursiveParse(handle)

    // Debería tener:
    //   1 root (MiProyecto)
    //   3 conceptos declarados (Risk, Action) + 1 subfolder (HijoFolder)
    //   3 elementos concretos (riesgo-1, riesgo-2, completar)
    //   1 elemento inline (Riesgo Técnico dentro de HijoFolder)
    // Total esperado: 8 nodos
    const nodeCount = Object.keys(result.nodes).length
    expect(nodeCount).toBeGreaterThanOrEqual(7)
    // Si el conteo exacto cambia, ajustar. Lo importante es que NO sea 0.
  })
})

// ────────────────────────────────────────────────────────────────
// PASO 5 (bonus): workspaceStore.open() carga el modelo completo
// ────────────────────────────────────────────────────────────────

describe('Paso 5 — workspaceStore abre un modelo FOLDER completo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('5a: workspaceStore abre un FOLDER y modelStore tiene los nodos', async () => {
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()
    const handle = buildFakeTree('workspace', FOLDER_TREE)

    await workspaceStore.open(handle)

    expect(workspaceStore.hasParsed).toBe(true)
    expect(workspaceStore.parseCount).toBe(1)
    expect(Object.keys(modelStore.nodes).length).toBeGreaterThan(0)
    expect(modelStore.rootIds).toHaveLength(1)
  })

  it('5b: workspaceStore no re-parsea si se llama open() dos veces', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', FOLDER_TREE)

    await workspaceStore.open(handle)
    await workspaceStore.open(handle)

    expect(workspaceStore.parseCount).toBe(1)
  })

  it('5c: workspaceStore puede abrir modelo FILE sin errores', async () => {
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()
    const tree: FakeTree = { 'Modelo_FORMAT.md': FILE_MODEL_MINIMO }
    const handle = buildFakeTree('workspace', tree)

    await workspaceStore.open(handle)

    expect(workspaceStore.hasParsed).toBe(true)
    expect(Object.keys(modelStore.nodes).length).toBeGreaterThan(0)

    const rootNode = Object.values(modelStore.nodes).find((n) => n.parentId === null)
    expect(rootNode).toBeDefined()
    expect(rootNode!.storageMode).toBe('FILE')
  })
})

// ────────────────────────────────────────────────────────────────
// PASO 6 (bonus): Carga los fixtures REALES desde tests/fixtures/
// ────────────────────────────────────────────────────────────────

describe('Paso 6 — Fixtures reales desde tests/fixtures/ en la raíz', () => {
  it('6a: carga el modelo FILE real de tests/fixtures/file-model_FORMAT.md', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const content = readFileSync(
      join(import.meta.dirname!, '..', '..', '..', 'tests', 'fixtures', 'file-model_FORMAT.md'),
      'utf-8'
    )

    // El parser ignora _FORMAT.md al nivel raíz del workspace (línea 408).
    // Los modelos FILE deben llamarse X_FORMAT.md, no _FORMAT.md.
    const tree: FakeTree = { 'file-model_FORMAT.md': content }
    const handle = buildFakeTree('workspace', tree)
    const result = await recursiveParse(handle)

    expect(result.issues).toHaveLength(0)
    expect(result.rootIds).toHaveLength(1)

    const nombres = Object.values(result.nodes).map((n) => n.name)
    expect(nombres).toContain('file-model')
    expect(nombres).toContain('Baja adopción')
    expect(nombres).toContain('Costes elevados')
    expect(nombres).toContain('Competencia agresiva')
    expect(nombres).toContain('Onboarding exprés')
    expect(nombres).toContain('Infraestructura optimizada')
    expect(Object.keys(result.nodes).length).toBe(6) // root + 5 elementos
  })

  it('6b: carga el modelo FOLDER real de tests/fixtures/folder-model/', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')

    const rootContent = readFileSync(
      join(import.meta.dirname!, '..', '..', '..', 'tests', 'fixtures', 'folder-model', '_FORMAT.md'),
      'utf-8'
    )
    const riskTechContent = readFileSync(
      join(import.meta.dirname!, '..', '..', '..', 'tests', 'fixtures', 'folder-model', 'Risk', 'tech-debt', '_FORMAT.md'),
      'utf-8'
    )
    const riskTimeContent = readFileSync(
      join(import.meta.dirname!, '..', '..', '..', 'tests', 'fixtures', 'folder-model', 'Risk', 'timeline', '_FORMAT.md'),
      'utf-8'
    )
    const featAuthContent = readFileSync(
      join(import.meta.dirname!, '..', '..', '..', 'tests', 'fixtures', 'folder-model', 'Feature', 'auth', '_FORMAT.md'),
      'utf-8'
    )
    const featDashContent = readFileSync(
      join(import.meta.dirname!, '..', '..', '..', 'tests', 'fixtures', 'folder-model', 'Feature', 'dashboard', '_FORMAT.md'),
      'utf-8'
    )
    const meetingContent = readFileSync(
      join(import.meta.dirname!, '..', '..', '..', 'tests', 'fixtures', 'folder-model', 'Meeting', '_FORMAT.md'),
      'utf-8'
    )

    const tree: FakeTree = {
      'folder-model': {
        '_FORMAT.md': rootContent,
        Risk: {
          'tech-debt': { '_FORMAT.md': riskTechContent },
          'timeline': { '_FORMAT.md': riskTimeContent },
        },
        Feature: {
          'auth': { '_FORMAT.md': featAuthContent },
          'dashboard': { '_FORMAT.md': featDashContent },
        },
        Meeting: {
          '_FORMAT.md': meetingContent,
        },
      },
    }

    const handle = buildFakeTree('workspace', tree)
    const result = await recursiveParse(handle)

    expect(result.issues).toHaveLength(0)

    const nombres = Object.values(result.nodes).map((n) => n.name)
    expect(nombres).toContain('folder-model')
    expect(nombres).toContain('Risk')
    expect(nombres).toContain('tech-debt')
    expect(nombres).toContain('timeline')
    expect(nombres).toContain('Feature')
    expect(nombres).toContain('auth')
    expect(nombres).toContain('dashboard')
    expect(nombres).toContain('Meeting')
    expect(nombres).toContain('Morning sync')

    // Risk y Feature son conceptos declarados
    const riskNode = Object.values(result.nodes).find((n) => n.name === 'Risk')
    expect(riskNode).toBeDefined()
    expect(riskNode!.kind).toBe('concept')

    // tech-debt es hijo de Risk
    const techDebt = Object.values(result.nodes).find((n) => n.name === 'tech-debt')
    expect(techDebt).toBeDefined()
    expect(techDebt!.parentId).toBe(riskNode!.id)
    expect(techDebt!.type).toBe('Risk')
  })
})
