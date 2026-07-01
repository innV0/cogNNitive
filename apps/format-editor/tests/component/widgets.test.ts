import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextWidget from '../../src/shared/widgets/TextWidget.vue'
import WeightWidget from '../../src/shared/widgets/WeightWidget.vue'
import CategoryWidget from '../../src/shared/widgets/CategoryWidget.vue'
import { resolveWidgetComponent } from '../../src/shared/widgets'

describe('TextWidget (fixture-exercised concept type "text")', () => {
  it('renders the current text value in a text input', () => {
    const wrapper = mount(TextWidget, { props: { modelValue: 'Hello world' } })
    const input = wrapper.get('input')
    expect((input.element as HTMLInputElement).value).toBe('Hello world')
  })

  it('emits update:modelValue when the user types', async () => {
    const wrapper = mount(TextWidget, { props: { modelValue: '' } })
    const input = wrapper.get('input')
    await input.setValue('New text')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['New text'])
  })
})

describe('WeightWidget (fixture-exercised concept type "weight")', () => {
  it('renders the current numeric value in a number input', () => {
    const wrapper = mount(WeightWidget, { props: { modelValue: 5 } })
    const input = wrapper.get('input')
    expect((input.element as HTMLInputElement).value).toBe('5')
  })

  it('emits update:modelValue as a number when the user types', async () => {
    const wrapper = mount(WeightWidget, { props: { modelValue: 0 } })
    const input = wrapper.get('input')
    await input.setValue('7')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([7])
  })
})

describe('CategoryWidget (fixture-exercised concept type "category")', () => {
  it('renders the current value among the provided options', () => {
    const wrapper = mount(CategoryWidget, {
      props: { modelValue: 'B', options: ['A', 'B', 'C'] },
    })
    const select = wrapper.get('select')
    expect((select.element as HTMLSelectElement).value).toBe('B')
  })

  it('emits update:modelValue when the user picks a different option', async () => {
    const wrapper = mount(CategoryWidget, {
      props: { modelValue: 'A', options: ['A', 'B', 'C'] },
    })
    const select = wrapper.get('select')
    await select.setValue('C')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['C'])
  })
})

describe('widget registry: resolveWidgetComponent (R15 "Ported widget renders known type")', () => {
  it('resolves "text" to TextWidget', () => {
    expect(resolveWidgetComponent('text')).toBe(TextWidget)
  })

  it('resolves "weight" to WeightWidget', () => {
    expect(resolveWidgetComponent('weight')).toBe(WeightWidget)
  })

  it('resolves "category" to CategoryWidget', () => {
    expect(resolveWidgetComponent('category')).toBe(CategoryWidget)
  })

  it('resolves an unported type to undefined, signalling the caller to use FallbackWidget', () => {
    expect(resolveWidgetComponent('steps')).toBeUndefined()
    expect(resolveWidgetComponent('sequence')).toBeUndefined()
    expect(resolveWidgetComponent('list')).toBeUndefined()
  })
})
