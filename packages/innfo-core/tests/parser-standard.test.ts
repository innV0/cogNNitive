import { describe, it, expect } from 'vitest'
import { parseModel, parseYaml } from '../src/parser'

describe('Standardised Parser (TDD)', () => {
  it('parses complex nested frontmatter with standard YAML features', () => {
    const yamlStr = `
spec_version: "V_0-2-0"
nested:
  nested_list:
    - name: "Item 1"
      value: true
    - name: "Item 2"
      value: false
inline_array: [10, 20, 30]
inline_object: { key: "value", num: 42 }
multi_line: |
  Line 1
  Line 2
`
    const parsed = parseYaml(yamlStr)
    expect(parsed.nested).toEqual({
      nested_list: [
        { name: 'Item 1', value: true },
        { name: 'Item 2', value: false },
      ],
    })
    expect(parsed.inline_array).toEqual([10, 20, 30])
    expect(parsed.inline_object).toEqual({ key: 'value', num: 42 })
    expect(parsed.multi_line).toBe('Line 1\nLine 2\n')
  })

  it('parses a model with complex section boundaries and list syntax', () => {
    const modelContent = `---
spec_version: "V_0-2-0"
level: 3
model_version: "V_1-0-0"
title: "Complex Model"
---

# _NN Stakeholders

* _NN Stakeholders: Customer
  \`\`\`yaml
  importance: "high"
  needs: ["speed", "accuracy"]
  \`\`\`
  Customer description goes here.
  It can span multiple lines.

* _NN Stakeholders: Partner
  \`\`\`yaml
  importance: "medium"
  \`\`\`
  Partner description.
`
    const model = parseModel(modelContent)
    const list = model.elements.get('Stakeholders')
    expect(list).toBeDefined()
    expect(list).toHaveLength(2)

    const customer = list![0]
    expect(customer.name).toBe('Customer')
    expect(customer.fields.importance).toBe('high')
    expect(customer.fields.needs).toEqual(['speed', 'accuracy'])
    expect(customer.description).toContain('Customer description goes here.')

    const partner = list![1]
    expect(partner.name).toBe('Partner')
    expect(partner.fields.importance).toBe('medium')
    expect(partner.description).toBe('Partner description.')
  })
})
