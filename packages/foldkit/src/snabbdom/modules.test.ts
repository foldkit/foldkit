import { describe, expect, it, vi } from 'vitest'

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

  it('uses the standard namespaces for qualified foreign attributes only', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('svg', {
        ns: 'http://www.w3.org/2000/svg',
        attrs: {
          'xlink:href': '#target',
          'xml:lang': 'en',
          'xmlns:xlink': 'http://www.w3.org/1999/xlink',
          'other:value': 'plain',
        },
      }),
    )
    const element = mounted.elm
    if (!(element instanceof SVGElement)) {
      throw new Error('expected an SVG element')
    }

    expect(element.getAttributeNode('xlink:href')?.namespaceURI).toBe(
      'http://www.w3.org/1999/xlink',
    )
    expect(element.getAttributeNode('xml:lang')?.namespaceURI).toBe(
      'http://www.w3.org/XML/1998/namespace',
    )
    expect(element.getAttributeNode('xmlns:xlink')?.namespaceURI).toBe(
      'http://www.w3.org/2000/xmlns/',
    )
    expect(element.getAttributeNode('other:value')?.namespaceURI).toBeNull()

    const patched = patch(
      mounted,
      h('svg', {
        ns: 'http://www.w3.org/2000/svg',
        attrs: { 'other:value': 'next' },
      }),
    )
    const patchedElement = patched.elm
    if (!(patchedElement instanceof SVGElement)) {
      throw new Error('expected an SVG element')
    }
    expect(
      patchedElement.hasAttributeNS('http://www.w3.org/1999/xlink', 'href'),
    ).toBe(false)
    expect(
      patchedElement.hasAttributeNS(
        'http://www.w3.org/XML/1998/namespace',
        'lang',
      ),
    ).toBe(false)
    expect(patchedElement.getAttribute('other:value')).toBe('next')
  })

  it('keeps colon-named HTML attributes unnamespaced', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', { attrs: { 'xlink:href': '#html' } }),
    )
    const element = elementOf(mounted)

    expect(element.getAttribute('xlink:href')).toBe('#html')
    expect(element.getAttributeNode('xlink:href')?.namespaceURI).toBeNull()
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

  it('preserves raw and typed class ownership across patches', () => {
    const container = document.createElement('div')
    const typedClass = { typed: true }
    const mounted = patch(
      container,
      h('div', { attrs: { class: 'raw-a' }, class: typedClass }),
    )
    const element = elementOf(mounted)

    const changedRawClass = patch(
      mounted,
      h('div', { attrs: { CLASS: 'raw-b shared' }, class: typedClass }),
    )

    expect(elementOf(changedRawClass)).toBe(element)
    expect(element.classList.contains('raw-a')).toBe(false)
    expect(element.classList.contains('raw-b')).toBe(true)
    expect(element.classList.contains('shared')).toBe(true)
    expect(element.classList.contains('typed')).toBe(true)

    const disabledRawClass = patch(
      changedRawClass,
      h('div', { attrs: { class: false }, class: typedClass }),
    )
    const absentRawClass = patch(
      disabledRawClass,
      h('div', { class: typedClass }),
    )
    expect(elementOf(absentRawClass)).toBe(element)
    expect(element.className).toBe('typed')

    const sharedClass = patch(
      absentRawClass,
      h('div', {
        attrs: { class: 'raw-b shared' },
        class: { shared: true },
      }),
    )
    const rawClassOnly = patch(
      sharedClass,
      h('div', { attrs: { class: 'raw-b shared' }, class: {} }),
    )

    expect(elementOf(rawClassOnly)).toBe(element)
    expect(element.classList.contains('raw-b')).toBe(true)
    expect(element.classList.contains('shared')).toBe(true)
    expect(element.classList.contains('typed')).toBe(false)
  })

  it('does not touch typed classes when an unrelated raw attribute changes', () => {
    const container = document.createElement('div')
    const typedClass = { typed: true }
    const mounted = patch(
      container,
      h('div', { attrs: { 'data-step': 'one' }, class: typedClass }),
    )
    const element = elementOf(mounted)
    const contains = vi.spyOn(element.classList, 'contains')
    const add = vi.spyOn(element.classList, 'add')
    const remove = vi.spyOn(element.classList, 'remove')

    patch(
      mounted,
      h('div', { attrs: { 'data-step': 'two' }, class: typedClass }),
    )

    expect(contains).not.toHaveBeenCalled()
    expect(add).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('normalizes raw class aliases on foreign elements', () => {
    const namespace = 'http://www.w3.org/2000/svg'
    const container = document.createElement('div')
    const typedClass = { typed: true }
    const mounted = patch(
      container,
      h('svg', {
        ns: namespace,
        attrs: { CLASS: 'raw-a' },
        class: typedClass,
      }),
    )
    const element = mounted.elm
    if (!(element instanceof SVGElement)) {
      throw new Error('expected an SVG element')
    }

    const patched = patch(
      mounted,
      h('svg', {
        ns: namespace,
        attrs: { class: 'raw-b' },
        class: typedClass,
      }),
    )

    expect(patched.elm).toBe(element)
    expect(element.classList.contains('raw-a')).toBe(false)
    expect(element.classList.contains('raw-b')).toBe(true)
    expect(element.classList.contains('typed')).toBe(true)
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

  it('applies typed styles through individual CSSOM properties', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', { style: { color: '#ff0000', opacity: 'bogus' } }),
    )
    const element = elementOf(mounted)

    expect(element.style.color).toBe('#ff0000')
    expect(element.style.opacity).toBe('bogus')

    patch(mounted, h('div', { style: { color: '#ff0000', opacity: 'bogus' } }))
    expect(element.style.color).toBe('#ff0000')
    expect(element.style.opacity).toBe('bogus')
  })

  it('preserves inline properties that the view does not own', () => {
    const container = document.createElement('div')
    const mounted = patch(container, h('div', { style: { color: 'red' } }))
    const element = elementOf(mounted)
    element.style.position = 'fixed'

    const updated = patch(mounted, h('div', { style: { color: 'blue' } }))
    expect(elementOf(updated).style.color).toBe('blue')
    expect(elementOf(updated).style.position).toBe('fixed')

    const removed = patch(updated, h('div', { style: {} }))
    expect(elementOf(removed).style.color).toBe('')
    expect(elementOf(removed).style.position).toBe('fixed')
  })

  it('hands complete ownership to a raw style attribute', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', {
        style: {
          color: 'red',
          borderLeftColor: 'red',
          margin: '1px',
          '--accent': 'old',
        },
      }),
    )
    const element = elementOf(mounted)
    const rawStyle =
      'color: blue; border: 2px solid black; margin-left: 12px; --accent: next'
    const next = h('div', { attrs: { STYLE: rawStyle } })
    next.elm = element
    element.setAttribute('style', rawStyle)
    const getAttribute = vi.spyOn(element, 'getAttribute')
    const removeProperty = vi.spyOn(element.style, 'removeProperty')

    if (styleModule.update === undefined) {
      throw new Error('expected a style update hook')
    }
    styleModule.update(mounted, next)

    expect(elementOf(next)).toBe(element)
    expect(getAttribute).not.toHaveBeenCalled()
    expect(removeProperty).not.toHaveBeenCalled()
    getAttribute.mockRestore()
    removeProperty.mockRestore()
    expect(element.style.color).toBe('blue')
    expect(element.style.borderLeftWidth).toBe('2px')
    expect(element.style.borderLeftStyle).toBe('solid')
    expect(element.style.borderLeftColor).toBe('black')
    expect(element.style.marginLeft).toBe('12px')
    expect(element.style.getPropertyValue('--accent')).toBe('next')
  })

  it('ignores inherited style entries in every module path', () => {
    const container = document.createElement('div')
    const inherited: Record<string, string> = Object.create({
      color: 'red',
      cssText: 'position: fixed; inset: 0',
    })
    const mounted = patch(container, h('div', { style: inherited }))
    const element = elementOf(mounted)

    expect(element.hasAttribute('style')).toBe(false)
  })

  it('preserves styles owned by an autonomous custom element', () => {
    class XStyleOwner extends HTMLElement {
      connectedCallback(): void {
        this.style.backgroundColor = 'red'
      }
    }
    if (customElements.get('x-style-owner') === undefined) {
      customElements.define('x-style-owner', XStyleOwner)
    }
    const container = document.createElement('div')
    document.body.appendChild(container)
    const mounted = patch(
      container,
      h('x-style-owner', { style: { color: 'blue' } }),
    )
    const element = elementOf(mounted)

    expect(element.style.color).toBe('blue')
    expect(element.style.backgroundColor).toBe('red')

    patch(mounted, h('x-style-owner', { style: { color: 'green' } }))
    expect(element.style.color).toBe('green')
    expect(element.style.backgroundColor).toBe('red')
  })
})
