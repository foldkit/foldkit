import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { h } from './h.js'
import { __overrideDuplicateKeyWarning, init } from './init.js'
import type { VNode } from './vnode.js'

const patch = init([])

const withIdentity = (node: VNode, identity: string): VNode => {
  node.identity = identity
  return node
}

const elementOf = (node: VNode): Element => {
  if (!(node.elm instanceof Element)) {
    throw new Error('expected an element')
  }
  return node.elm
}

const inputIn = (node: VNode): HTMLInputElement => {
  const input = elementOf(node).querySelector('input')
  if (input === null) {
    throw new Error('expected an input')
  }
  return input
}

const listItemsIn = (node: VNode): Array<HTMLLIElement> =>
  Array.from(elementOf(node).querySelectorAll('li'))

describe('identity-aware patching', () => {
  it('patches an unkeyed sibling in place when identities match', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', {}, [withIdentity(h('input'), 'field')]),
    )
    const inputBefore = inputIn(mounted)
    inputBefore.value = 'typed'

    const patched = patch(
      mounted,
      h('div', {}, [withIdentity(h('input'), 'field')]),
    )
    const inputAfter = inputIn(patched)

    expect(inputAfter).toBe(inputBefore)
    expect(inputAfter.value).toBe('typed')
  })

  it('replaces an unkeyed sibling when identity differs at the same position', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('div', {}, [withIdentity(h('input'), 'first-arm')]),
    )
    const inputBefore = inputIn(mounted)
    inputBefore.value = 'typed'

    const patched = patch(
      mounted,
      h('div', {}, [withIdentity(h('input'), 'second-arm')]),
    )
    const inputAfter = inputIn(patched)

    expect(inputAfter).not.toBe(inputBefore)
    expect(inputAfter.value).toBe('')
  })

  it('patches in place when identity is absent on both sides', () => {
    const container = document.createElement('div')
    const mounted = patch(container, h('div', {}, [h('input')]))
    const inputBefore = inputIn(mounted)
    inputBefore.value = 'typed'

    const patched = patch(mounted, h('div', {}, [h('input')]))
    const inputAfter = inputIn(patched)

    expect(inputAfter).toBe(inputBefore)
    expect(inputAfter.value).toBe('typed')
  })

  it('replaces a keyed sibling when identity differs even though the key matches', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('ul', {}, [withIdentity(h('li', { key: 'x' }, ['one']), 'first-arm')]),
    )
    const [itemBefore] = listItemsIn(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, [withIdentity(h('li', { key: 'x' }, ['two']), 'second-arm')]),
    )
    const [itemAfter] = listItemsIn(patched)

    expect(itemAfter).not.toBe(itemBefore)
    expect(elementOf(patched).textContent).toBe('two')
  })

  it('moves keyed siblings on reorder when identities are equal', () => {
    const renderList = (labels: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        labels.map(label =>
          withIdentity(h('li', { key: label }, [label]), 'row'),
        ),
      )

    const container = document.createElement('div')
    const mounted = patch(container, renderList(['a', 'b', 'c']))
    const [itemA, itemB, itemC] = listItemsIn(mounted)

    const patched = patch(mounted, renderList(['c', 'a', 'b']))
    const [firstAfter, secondAfter, thirdAfter] = listItemsIn(patched)

    expect(firstAfter).toBe(itemC)
    expect(secondAfter).toBe(itemA)
    expect(thirdAfter).toBe(itemB)
  })

  it('moves unkeyed siblings on reorder when the adjacency probes match distinct identities diagonally', () => {
    const renderPair = (labels: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        labels.map(label =>
          withIdentity(h('li', {}, [label]), `${label}-view`),
        ),
      )

    const container = document.createElement('div')
    const mounted = patch(container, renderPair(['alpha', 'beta']))
    const [alphaBefore, betaBefore] = listItemsIn(mounted)

    const patched = patch(mounted, renderPair(['beta', 'alpha']))
    const [firstAfter, secondAfter] = listItemsIn(patched)

    expect(firstAfter).toBe(betaBefore)
    expect(secondAfter).toBe(alphaBefore)
    expect(elementOf(patched).textContent).toBe('betaalpha')
  })

  it('keeps positional patching correct when many siblings share one identity', () => {
    const renderRows = (labels: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        labels.map(label => withIdentity(h('li', {}, [label]), 'row')),
      )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const container = document.createElement('div')
    const mounted = patch(
      container,
      renderRows(['one', 'two', 'three', 'four']),
    )
    const rowsBefore = listItemsIn(mounted)

    const patched = patch(mounted, renderRows(['ONE', 'TWO', 'THREE', 'FOUR']))
    const rowsAfter = listItemsIn(patched)

    expect(rowsAfter).toHaveLength(4)
    rowsAfter.forEach((row, index) => {
      expect(row).toBe(rowsBefore[index])
    })
    expect(elementOf(patched).textContent).toBe('ONETWOTHREEFOUR')
    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('creates a new element in the keyed-lookup path when identity differs', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('ul', {}, [
        withIdentity(h('li', { key: 'a' }, ['a']), 'row'),
        withIdentity(h('li', { key: 'b' }, ['b']), 'row'),
        withIdentity(h('li', { key: 'c' }, ['c']), 'row'),
        withIdentity(h('li', { key: 'd' }, ['d']), 'row'),
      ]),
    )
    const [itemA, itemB, itemC, itemD] = listItemsIn(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, [
        withIdentity(h('li', { key: 'c' }, ['c']), 'other-arm'),
        withIdentity(h('li', { key: 'a' }, ['a']), 'row'),
        withIdentity(h('li', { key: 'b' }, ['b']), 'row'),
        withIdentity(h('li', { key: 'd' }, ['d']), 'row'),
      ]),
    )
    const [firstAfter, secondAfter, thirdAfter, fourthAfter] =
      listItemsIn(patched)

    expect(firstAfter).not.toBe(itemC)
    expect(secondAfter).toBe(itemA)
    expect(thirdAfter).toBe(itemB)
    expect(fourthAfter).toBe(itemD)
    expect(elementOf(patched).textContent).toBe('cabd')
  })

  it('creates a new element in the keyed-lookup path when data.is differs', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('ul', {}, [
        h('li', { key: 'a' }, ['a']),
        h('li', { key: 'b', is: 'fancy-item' }, ['b']),
        h('li', { key: 'c' }, ['c']),
        h('li', { key: 'd' }, ['d']),
      ]),
    )
    const [, itemB] = listItemsIn(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, [
        h('li', { key: 'b' }, ['b']),
        h('li', { key: 'a' }, ['a']),
        h('li', { key: 'c' }, ['c']),
        h('li', { key: 'd' }, ['d']),
      ]),
    )
    const [firstAfter] = listItemsIn(patched)

    expect(firstAfter).not.toBe(itemB)
    expect(elementOf(patched).textContent).toBe('bacd')
  })

  it('replaces the root when its identity changes', () => {
    const parent = document.createElement('div')
    const container = document.createElement('div')
    parent.appendChild(container)

    const mounted = patch(
      container,
      withIdentity(h('div', {}, ['first']), 'first-arm'),
    )
    const rootBefore = elementOf(mounted)

    const patched = patch(
      mounted,
      withIdentity(h('div', {}, ['second']), 'second-arm'),
    )
    const rootAfter = elementOf(patched)

    expect(rootAfter).not.toBe(rootBefore)
    expect(parent.contains(rootAfter)).toBe(true)
    expect(parent.contains(rootBefore)).toBe(false)
    expect(rootAfter.textContent).toBe('second')
  })
})

describe('duplicate sibling key warning', () => {
  beforeEach(() => {
    __overrideDuplicateKeyWarning(true)
  })

  afterEach(() => {
    __overrideDuplicateKeyWarning(undefined)
    vi.restoreAllMocks()
  })

  const mountListWithKeys = (keys: ReadonlyArray<string>): VNode => {
    const container = document.createElement('div')
    return patch(
      container,
      h(
        'ul',
        {},
        keys.map(key => h('li', { key }, [key])),
      ),
    )
  }

  const patchToFreshKeys = (mounted: VNode): VNode =>
    patch(
      mounted,
      h('ul', {}, [h('li', { key: 'x' }, ['x']), h('li', { key: 'y' }, ['y'])]),
    )

  it('warns once per patch when old siblings share a key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mounted = mountListWithKeys(['a', 'a', 'c'])

    patchToFreshKeys(mounted)

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('"a"')
    expect(warnSpy.mock.calls[0]?.[0]).toContain('<ul>')
  })

  it('warns again on a later patch', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    patchToFreshKeys(mountListWithKeys(['a', 'a', 'c']))
    patchToFreshKeys(mountListWithKeys(['b', 'b', 'c']))

    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(warnSpy.mock.calls[1]?.[0]).toContain('"b"')
  })

  it('does not warn when sibling keys are unique', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mounted = mountListWithKeys(['a', 'b', 'c'])

    patchToFreshKeys(mounted)

    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('does not warn when the gate is off', () => {
    __overrideDuplicateKeyWarning(false)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mounted = mountListWithKeys(['a', 'a', 'c'])

    patchToFreshKeys(mounted)

    expect(warnSpy).not.toHaveBeenCalled()
  })
})
