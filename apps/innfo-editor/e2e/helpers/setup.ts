import { type Page, type BrowserContext } from '@playwright/test'

/**
 * Injects a mock `showDirectoryPicker` into the page BEFORE the app loads.
 * This lets the "Open Local Folder" flow work without a real native file picker.
 */
export async function injectMockFileSystem(page: Page, context: BrowserContext) {
  // Grant the File System Access API permission
  await context.grantPermissions(['file-system-read', 'file-system-write'])

  // Inject mock BEFORE navigation — addInitialScript runs on every page
  await context.addInitScript(() => {
    // ── Mock root workspace tree ──────────────────────────────────
    const MOCK_TREE: Record<string, any> = {
      'index.md': `# _F index\n\n* [[HillValleyTimeTravel_V_1-0-0_business_F.md]]\n* [[TimeTravelProtocol_V_1-0-0_procedures_F.md]]\n`,
      'HillValleyTimeTravel_V_1-0-0_business_F.md': `---
spec_version: "V_0-1-5"
spec_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.5/specs/FORMAT_V_0-1-5_F.md"
level: 3
parent_spec:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_1-0-0"
title: "Hill Valley Time Travel Corp"
taxonomy:
  roots:
    - concept: "Stakeholders"
      colorHex: "#7C3AED"
      children:
        - concept: "Founders"
          colorHex: "#0891B2"
taxonomyEdges:
  - parent: "Stakeholders"
    child: "Founders"
---

# _F index

* _F index: Business summary
* _F index: Market
  * _F index: Stakeholders
* _F index: Organization
  * _F index: Business idea

# _F Business summary

Hill Valley Time Travel Corp.

# _F Stakeholders

* _F Stakeholders: Dr. Emmett Brown
  \`\`\`yaml
  weight: 10
  colorHex: "#7C3AED"
  \`\`\`
  Founder and CEO.

* _F Stakeholders: Marty McFly
  \`\`\`yaml
  weight: 9
  colorHex: "#0891B2"
  \`\`\`
  Test pilot.

# _F Business idea

Revolutionize time travel.

# _F matrices: stakeholder-risk matrix

| Stakeholder \\\\ Risk | Paradox | Fuel |
| :--- | :---: | :---: |
| Dr. Emmett Brown | High | Max |
| Marty McFly | Medium | High |
`,
      'TimeTravelProtocol_V_1-0-0_procedures_F.md': `---
spec_version: "V_0-1-5"
spec_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.5/specs/FORMAT_V_0-1-5_F.md"
level: 3
parent_spec:
  name: "procedures_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/procedures_V_0-1-1_FORMAT.md"
model_version: "V_1-0-0"
title: "Time Travel Protocol"
---

# _F index

* [[Procedure]]
* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]

# _F Procedure

Standard time travel procedure.

# _F matrices: work-roles matrix

| Work \\\\ Role | Pilot | Navigator |
| :--- | :---: | :---: |
| Calibrate flux | — | Accountable |
| Accelerate to 88mph | Responsible | — |
`,
      // ── KB folder ──
      'kb': {
        '_F.md': `---
spec_version: "V_0-1-5"
spec_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.5/specs/FORMAT_V_0-1-5_F.md"
model_version: "V_1-0-0"
title: "Back to the Future KB"
type: "KB"
taxonomy:
  roots:
    - concept: "Technology"
      colorHex: "#2563EB"
      children:
        - concept: "Vehicles"
          colorHex: "#059669"
        - concept: "Devices"
          colorHex: "#D97706"
  community:
    label: "BTTF Universe"
    colorHex: "#4F46E5"
---
Knowledge Base for Back to the Future.
`,
        'Delorean': {
          '_F.md': `---
type: "Topic"
colorHex: "#059669"
fields:
  category: "technology"
  status: "published"
  year_introduced: 1981
  max_speed: 88
  color: "#C0C0C0"
  tags: ["time-machine", "dmc-12"]
  rating: 5
  website: "https://bttf.fandom.com"
  build_date: "1981-01-01"
markers:
  weight: 10
  priority: "!"
  certainty: 5
graph_edges:
  - target: "../DocBrown"
    label: "built-by"
    weight: 10
taxonomy:
  perspective: "Vehicles"
---
DeLorean DMC-12 time machine.

\`\`\`typescript
interface TimeMachine {
  maxSpeed: 88 // mph
  powerRequired: 1.21 // GW
}
\`\`\`

\`\`\`mermaid
graph LR
    A[Mr. Fusion] --> B[Flux Capacitor]
    B --> C[88 mph]
    C --> D[Time Travel!]
\`\`\`

| Feature | Value |
|---------|-------|
| Top Speed | 88 mph |
| Power | 1.21 GW |
| Doors | Gull-wing |
`,
        },
        'FluxCapacitor': {
          '_F.md': `---
type: "Topic"
colorHex: "#D97706"
fields:
  category: "technology"
  status: "published"
  year_invented: 1955
  power_output: 1.21
  power_unit: "gigawatts"
  tags: ["time-travel", "core-device"]
  rating: 5
  invention_date: "1955-11-05"
markers:
  weight: 10
  priority: "!"
graph_edges:
  - target: "../DocBrown"
    label: "invented-by"
    weight: 10
taxonomy:
  perspective: "Devices"
---
Flux Capacitor — makes time travel possible.
`,
        },
        'DocBrown': {
          '_F.md': `---
type: "Persona"
colorHex: "#0891B2"
fields:
  role: "inventor"
  expertise_level: "expert"
  birth_year: 1920
  is_active: true
  tags: ["scientist", "inventor"]
  rating: 5
  birth_date: "1920-01-01"
  inventions_count: 47
markers:
  weight: 10
  certainty: 5
graph_edges:
  - target: "../MartyMcFly"
    label: "mentor"
    weight: 10
taxonomy:
  perspective: "Founders"
---
Dr. Emmett Brown. Inventor of the flux capacitor.
`,
        },
        'MartyMcFly': {
          '_F.md': `---
type: "Persona"
colorHex: "#0891B2"
fields:
  role: "time traveler"
  expertise_level: "advanced"
  birth_year: 1968
  tags: ["protagonist", "time-traveler"]
  rating: 4
  birth_date: "1968-06-09"
  times_traveled: 5
markers:
  weight: 9
graph_edges:
  - target: "../DocBrown"
    label: "student-mentor"
    weight: 10
taxonomy:
  perspective: "Founders"
---
Marty McFly — time traveling teenager.
`,
        },
        'Hoverboard': {
          '_F.md': `---
type: "Topic"
colorHex: "#059669"
fields:
  category: "technology"
  status: "published"
  year_introduced: 2015
  max_speed: 35
  color: "#FF1493"
  tags: ["transport", "future-tech"]
  rating: 3
  release_date: "2015-10-21"
markers:
  weight: 7
graph_edges:
  - target: "../MartyMcFly"
    label: "used-by"
    weight: 7
taxonomy:
  perspective: "Devices"
---
Hoverboard — magnetic levitation skateboard.
`,
        },
      },
    }

    // ── Mock FileSystemDirectoryHandle ──
    class MockDirectoryHandle {
      kind = 'directory'
      name: string
      private tree: Record<string, any>

      constructor(name: string, tree: Record<string, any>) {
        this.name = name
        this.tree = tree
      }

      async *entries(): AsyncIterableIterator<[string, any]> {
        for (const [entryName, value] of Object.entries(this.tree)) {
          if (typeof value === 'string') {
            yield [entryName, new MockFileHandle(entryName, value)]
          } else {
            yield [entryName, new MockDirectoryHandle(entryName, value)]
          }
        }
      }

      async getFileHandle(name: string): Promise<any> {
        const value = this.tree[name]
        if (typeof value !== 'string') throw new Error(`File not found: ${name}`)
        return new MockFileHandle(name, value)
      }

      async getDirectoryHandle(name: string): Promise<any> {
        const value = this.tree[name]
        if (typeof value !== 'object') throw new Error(`Directory not found: ${name}`)
        return new MockDirectoryHandle(name, value)
      }
    }

    class MockFileHandle {
      kind = 'file'
      name: string
      private content: string

      constructor(name: string, content: string) {
        this.name = name
        this.content = content
      }

      async getFile() {
        return { text: () => this.content }
      }

      async createWritable() {
        const that = this
        return {
          async write(data: string) { that.content = data },
          async close() { /* noop */ },
        }
      }
    }

    // Override showDirectoryPicker globally
    const rootHandle = new MockDirectoryHandle('Sandbox', MOCK_TREE)
    Object.defineProperty(window, 'showDirectoryPicker', {
      writable: true,
      value: async () => rootHandle,
    })

    // Also override showOpenFilePicker for single-file load
    Object.defineProperty(window, 'showOpenFilePicker', {
      writable: true,
      value: async () => {
        const content = MOCK_TREE['HillValleyTimeTravel_V_1-0-0_business_F.md']
        return [new MockFileHandle('HillValleyTimeTravel_V_1-0-0_business_F.md', content)]
      },
    })

    // Mock clipboard for copy operations
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: async () => {},
        readText: async () => '',
      },
    })
  })
}

/**
 * Loads the home page and waits for it to be fully rendered.
 */
export async function loadHomePage(page: Page) {
  await page.goto('/app/')
  await page.waitForLoadState('networkidle')
}

/**
 * Opens a folder via the mocked showDirectoryPicker.
 * Clicks the "Open Local Folder" button and waits for workspace to load.
 */
export async function openMockFolder(page: Page) {
  // Click the "Open Local Folder" button
  await page.getByText('Open Local Folder').first().click()
  // Wait for workspace to load — tree should appear
  await page.waitForTimeout(1500)
  await page.waitForSelector('text=Back to the Future KB', { timeout: 10000 })
}

/**
 * Returns the full set of mock tree entries that were defined.
 */
export { MOCK_TREE }
