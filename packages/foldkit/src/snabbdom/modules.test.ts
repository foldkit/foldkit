import { describe, expect, it } from 'vitest'

import { attributesModule } from './attributes.js'
import { classModule } from './class.js'
import { datasetModule } from './dataset.js'
import { h } from './h.js'
import { init } from './init.js'
import { styleModule } from './style.js'
import type { VNode } from './vnode.js'

const patch = init([attributesModule, classModule, datasetModule, styleModule])

const elementOf = (node: VNode): HTMLElement => {
  if (!(node.elm instanceof HTMLElement)) {
    throw new Error('expected an element')
  }
  return node.elm
}

describe('attributesModule', () => {
  it('adds, updates, toggles, and removes attributes across patches', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', { attrs: { title: 'one', draggable: true, tabindex: 0 } }),
    )
    const element = elementOf(mounted)

    expect(element.getAttribute('title')).toBe('one')
    expect(element.getAttribute('draggable')).toBe('')
    expect(element.getAttribute('tabindex')).toBe('0')

    const patched = patch(
      mounted,
      h('div', { attrs: { title: 'two', draggable: false } }),
    )
    const patchedElement = elementOf(patched)

    expect(patchedElement.getAttribute('title')).toBe('two')
    expect(patchedElement.hasAttribute('draggable')).toBe(false)
    expect(patchedElement.hasAttribute('tabindex')).toBe(false)
  })
})

describe('classModule', () => {
  it('adds and removes classes across patches', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', { class: { active: true, hidden: false } }),
    )
    const element = elementOf(mounted)

    expect(element.classList.contains('active')).toBe(true)
    expect(element.classList.contains('hidden')).toBe(false)

    const patched = patch(mounted, h('div', { class: { hidden: true } }))
    const patchedElement = elementOf(patched)

    expect(patchedElement.classList.contains('active')).toBe(false)
    expect(patchedElement.classList.contains('hidden')).toBe(true)
  })
})

describe('datasetModule', () => {
  it('adds, updates, and removes dataset entries across patches', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', { dataset: { rowId: '7', kind: 'row' } }),
    )
    const element = elementOf(mounted)

    expect(element.dataset['rowId']).toBe('7')
    expect(element.dataset['kind']).toBe('row')

    const patched = patch(mounted, h('div', { dataset: { rowId: '8' } }))
    const patchedElement = elementOf(patched)

    expect(patchedElement.dataset['rowId']).toBe('8')
    expect(patchedElement.dataset['kind']).toBeUndefined()
  })
})

describe('styleModule', () => {
  it('adds, updates, and removes styles including custom properties', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', { style: { color: 'red', '--accent': 'blue' } }),
    )
    const element = elementOf(mounted)

    expect(element.style.color).toBe('red')
    expect(element.style.getPropertyValue('--accent')).toBe('blue')

    const patched = patch(mounted, h('div', { style: { color: 'green' } }))
    const patchedElement = elementOf(patched)

    expect(patchedElement.style.color).toBe('green')
    expect(patchedElement.style.getPropertyValue('--accent')).toBe('')
  })
})
