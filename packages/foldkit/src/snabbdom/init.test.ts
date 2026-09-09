import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { h } from './h.js'
import { __overrideDuplicateKeyWarning, init } from './init.js'
import {
  type Key,
  type VNode,
  VNodeDataMask,
  vnodeDataMaskKey,
} from './vnode.js'

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
  it('preserves reference-identical siblings around a changed middle', () => {
    const stableStart = h('li', { key: 'start' }, ['start'])
    const stableEnd = h('li', { key: 'end' }, ['end'])
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('ul', {}, [
        stableStart,
        h('li', { key: 'middle' }, ['before']),
        stableEnd,
      ]),
    )
    const [startBefore, middleBefore, endBefore] = listItemsIn(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, [
        stableStart,
        h('li', { key: 'middle' }, ['after']),
        stableEnd,
      ]),
    )
    const [startAfter, middleAfter, endAfter] = listItemsIn(patched)

    expect(startAfter).toBe(startBefore)
    expect(middleAfter).toBe(middleBefore)
    expect(endAfter).toBe(endBefore)
    expect(elementOf(patched).textContent).toBe('startafterend')
  })

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

  it('moves a sibling keyed with an object prototype property name', () => {
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key => h('li', { key }, [key])),
      )

    const container = document.createElement('div')
    const mounted = patch(
      container,
      renderList(['a', 'b', '__proto__', 'd', 'e', 'f']),
    )
    const [itemA, itemB, itemPrototype, itemD, itemE, itemF] =
      listItemsIn(mounted)

    const patched = patch(
      mounted,
      renderList(['__proto__', 'd', 'a', 'b', 'e', 'f']),
    )
    const [
      firstAfter,
      secondAfter,
      thirdAfter,
      fourthAfter,
      fifthAfter,
      sixthAfter,
    ] = listItemsIn(patched)

    expect(firstAfter).toBe(itemPrototype)
    expect(secondAfter).toBe(itemD)
    expect(thirdAfter).toBe(itemA)
    expect(fourthAfter).toBe(itemB)
    expect(fifthAfter).toBe(itemE)
    expect(sixthAfter).toBe(itemF)
  })

  it('distinguishes numeric keys from equivalent string keys', () => {
    const renderList = (
      entries: ReadonlyArray<Readonly<{ key: Key; label: string }>>,
    ): VNode =>
      h(
        'ul',
        {},
        entries.map(({ key, label }) => h('li', { key }, [label])),
      )

    const container = document.createElement('div')
    const mounted = patch(
      container,
      renderList([
        { key: 'a', label: 'a' },
        { key: 'b', label: 'b' },
        { key: 1, label: 'number' },
        { key: '1', label: 'string' },
        { key: 'e', label: 'e' },
        { key: 'f', label: 'f' },
      ]),
    )
    const [itemA, itemB, numericItem, stringItem, itemE, itemF] =
      listItemsIn(mounted)

    const patched = patch(
      mounted,
      renderList([
        { key: 1, label: 'number' },
        { key: '1', label: 'string' },
        { key: 'a', label: 'a' },
        { key: 'b', label: 'b' },
        { key: 'e', label: 'e' },
        { key: 'f', label: 'f' },
      ]),
    )
    const [
      firstAfter,
      secondAfter,
      thirdAfter,
      fourthAfter,
      fifthAfter,
      sixthAfter,
    ] = listItemsIn(patched)

    expect(firstAfter).toBe(numericItem)
    expect(secondAfter).toBe(stringItem)
    expect(thirdAfter).toBe(itemA)
    expect(fourthAfter).toBe(itemB)
    expect(fifthAfter).toBe(itemE)
    expect(sixthAfter).toBe(itemF)
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

describe('module data masks', () => {
  it('runs only modules whose data appears in the old or new vnode', () => {
    const attrsCreate = vi.fn()
    const attrsUpdate = vi.fn()
    const attrsDestroy = vi.fn()
    const classCreate = vi.fn()
    const classUpdate = vi.fn()
    const classDestroy = vi.fn()
    const unmaskedCreate = vi.fn()
    const unmaskedUpdate = vi.fn()
    const unmaskedDestroy = vi.fn()
    const maskedPatch = init([
      {
        dataMask: VNodeDataMask.Attrs,
        create: attrsCreate,
        update: attrsUpdate,
        destroy: attrsDestroy,
      },
      {
        dataMask: VNodeDataMask.Class,
        create: classCreate,
        update: classUpdate,
        destroy: classDestroy,
      },
      {
        create: unmaskedCreate,
        update: unmaskedUpdate,
        destroy: unmaskedDestroy,
      },
    ])
    const parent = document.createElement('div')
    const container = document.createElement('div')
    parent.appendChild(container)
    const mounted = maskedPatch(
      container,
      h(
        'section',
        {
          [vnodeDataMaskKey]: VNodeDataMask.Class,
          class: { active: true },
        },
        [],
      ),
    )
    attrsDestroy.mockClear()
    classDestroy.mockClear()
    unmaskedDestroy.mockClear()

    expect(attrsCreate).not.toHaveBeenCalled()
    expect(classCreate).toHaveBeenCalledTimes(1)
    expect(unmaskedCreate).toHaveBeenCalledTimes(1)

    const withoutModuleData = maskedPatch(
      mounted,
      h('section', { [vnodeDataMaskKey]: 0 }, []),
    )

    expect(attrsUpdate).not.toHaveBeenCalled()
    expect(classUpdate).toHaveBeenCalledTimes(1)
    expect(unmaskedUpdate).toHaveBeenCalledTimes(1)

    const withAttrs = maskedPatch(
      withoutModuleData,
      h(
        'section',
        {
          [vnodeDataMaskKey]: VNodeDataMask.Attrs,
          attrs: { title: 'active' },
        },
        [],
      ),
    )

    expect(attrsUpdate).toHaveBeenCalledTimes(1)
    expect(classUpdate).toHaveBeenCalledTimes(1)
    expect(unmaskedUpdate).toHaveBeenCalledTimes(2)

    maskedPatch(withAttrs, h('article', { [vnodeDataMaskKey]: 0 }, []))

    expect(attrsDestroy).toHaveBeenCalledTimes(1)
    expect(classDestroy).not.toHaveBeenCalled()
    expect(unmaskedDestroy).toHaveBeenCalledTimes(1)
  })

  it('keeps unmarked vnode data compatible with every module', () => {
    const attrsCreate = vi.fn()
    const attrsUpdate = vi.fn()
    const attrsDestroy = vi.fn()
    const classCreate = vi.fn()
    const classUpdate = vi.fn()
    const classDestroy = vi.fn()
    const maskedPatch = init([
      {
        dataMask: VNodeDataMask.Attrs,
        create: attrsCreate,
        update: attrsUpdate,
        destroy: attrsDestroy,
      },
      {
        dataMask: VNodeDataMask.Class,
        create: classCreate,
        update: classUpdate,
        destroy: classDestroy,
      },
    ])
    const parent = document.createElement('div')
    const container = document.createElement('div')
    parent.appendChild(container)

    const mounted = maskedPatch(container, h('section', {}, []))
    attrsDestroy.mockClear()
    classDestroy.mockClear()
    const updated = maskedPatch(mounted, h('section', {}, []))
    maskedPatch(updated, h('article', { [vnodeDataMaskKey]: 0 }, []))

    expect(attrsCreate).toHaveBeenCalledTimes(1)
    expect(classCreate).toHaveBeenCalledTimes(1)
    expect(attrsUpdate).toHaveBeenCalledTimes(1)
    expect(classUpdate).toHaveBeenCalledTimes(1)
    expect(attrsDestroy).toHaveBeenCalledTimes(1)
    expect(classDestroy).toHaveBeenCalledTimes(1)
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
