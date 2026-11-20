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
  it('does not move retained nodes when filtering to an ordered subsequence', () => {
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key => h('li', { key }, [key])),
      )
    const container = document.createElement('div')
    const mounted = patch(container, renderList(['a', 'b', 'c', 'd', 'e', 'f']))
    const nodesBefore = listItemsIn(mounted)
    const insertBefore = vi.spyOn(Node.prototype, 'insertBefore')

    const patched = patch(mounted, renderList(['a', 'c', 'd', 'f']))

    expect(listItemsIn(patched)).toEqual([
      nodesBefore[0],
      nodesBefore[2],
      nodesBefore[3],
      nodesBefore[5],
    ])
    const retainedNodeSet = new Set<Node>(nodesBefore)
    expect(
      insertBefore.mock.calls.filter(([node]) => retainedNodeSet.has(node)),
    ).toHaveLength(0)
  })

  it('moves the minimum number of retained nodes for a keyed permutation', () => {
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key => h('li', { key }, [key])),
      )
    const container = document.createElement('div')
    const mounted = patch(container, renderList(['a', 'b', 'c', 'd']))
    const insertBefore = vi.spyOn(Node.prototype, 'insertBefore')

    const patched = patch(mounted, renderList(['b', 'a', 'd', 'c']))

    expect(listItemsIn(patched).map(node => node.textContent)).toEqual([
      'b',
      'a',
      'd',
      'c',
    ])
    expect(
      insertBefore.mock.calls.filter(([node]) => node instanceof HTMLLIElement),
    ).toHaveLength(2)
  })
  it('reverses keyed siblings while preserving their DOM nodes', () => {
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key => h('li', { key }, [key])),
      )
    const mounted = patch(
      document.createElement('div'),
      renderList(['a', 'b', 'c', 'd']),
    )
    const previousNodes = listItemsIn(mounted)

    const patched = patch(mounted, renderList(['d', 'c', 'b', 'a']))

    expect(listItemsIn(patched)).toEqual(previousNodes.reverse())
  })
  it('skips null keyed-child holes while trimming cross-end matches', () => {
    const renderList = (keys: ReadonlyArray<string | null>): VNode =>
      h(
        'ul',
        {},
        keys.map(key => (key === null ? null : h('li', { key }, [key]))),
      )
    const mounted = patch(
      document.createElement('div'),
      renderList(['a', null, 'b', 'c']),
    )
    const [itemA, itemB, itemC] = listItemsIn(mounted)

    const patched = patch(mounted, renderList(['b', 'c', 'a']))

    expect(listItemsIn(patched)).toEqual([itemB, itemC, itemA])
  })
  it('does not move retained nodes when filtering keyed siblings', () => {
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key => h('li', { key }, [key])),
      )
    const mounted = patch(
      document.createElement('div'),
      renderList(['a', 'b', 'c', 'd', 'e', 'f']),
    )
    const previousNodes = listItemsIn(mounted)
    const retainedNodes = new Set<Node>(previousNodes)
    const insertBefore = vi.spyOn(Node.prototype, 'insertBefore')

    const patched = patch(mounted, renderList(['a', 'c', 'e']))

    expect(listItemsIn(patched).map(node => node.textContent)).toEqual([
      'a',
      'c',
      'e',
    ])
    expect(
      insertBefore.mock.calls.filter(([node]) => retainedNodes.has(node)),
    ).toHaveLength(0)
    expect(listItemsIn(patched)).toEqual([
      previousNodes[0],
      previousNodes[2],
      previousNodes[4],
    ])
  })
  it.each([
    ['remove from front', ['a', 'b', 'c', 'd'], ['b', 'c', 'd'], 0],
    ['remove from middle', ['a', 'b', 'c', 'd'], ['a', 'c', 'd'], 0],
    ['remove from end', ['a', 'b', 'c', 'd'], ['a', 'b', 'c'], 0],
    ['insert at front', ['a', 'b', 'c'], ['x', 'a', 'b', 'c'], 0],
    ['reverse', ['a', 'b', 'c', 'd'], ['d', 'c', 'b', 'a'], 3],
    ['swap', ['a', 'b', 'c'], ['b', 'a', 'c'], 1],
    ['rotate', ['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a'], 1],
    [
      'random permutation',
      ['a', 'b', 'c', 'd', 'e', 'f'],
      ['c', 'f', 'b', 'e', 'a', 'd'],
      4,
    ],
    [
      'mixed insertion, removal, and movement',
      ['a', 'b', 'c', 'd', 'e'],
      ['x', 'c', 'a', 'y', 'e'],
      1,
    ],
  ])('%s moves only the minimum retained nodes', (_, before, after, moves) => {
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key => h('li', { key }, [key])),
      )
    const container = document.createElement('div')
    const mounted = patch(container, renderList(before))
    const retainedNodes = new Map<string, HTMLLIElement>(
      listItemsIn(mounted).map(node => [node.textContent!, node]),
    )
    const insertBefore = vi.spyOn(Node.prototype, 'insertBefore')

    const patched = patch(mounted, renderList(after))

    const retainedNodeSet = new Set<Node>(retainedNodes.values())
    expect(listItemsIn(patched).map(node => node.textContent)).toEqual(after)
    expect(
      insertBefore.mock.calls.filter(([node]) => retainedNodeSet.has(node)),
    ).toHaveLength(moves)
    for (const node of listItemsIn(patched)) {
      const previous = retainedNodes.get(node.textContent!)
      if (previous !== undefined) {
        expect(node).toBe(previous)
      }
    }
  })

  it('keeps duplicate-key behavior on the legacy differ path', () => {
    const renderList = (labels: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        labels.map(label => h('li', { key: 'duplicate' }, [label])),
      )
    const mounted = patch(
      document.createElement('div'),
      renderList(['first', 'second']),
    )

    const patched = patch(
      mounted,
      renderList(['updated-first', 'updated-second']),
    )

    expect(elementOf(patched).textContent).toBe('updated-firstupdated-second')
  })

  it('preserves positional keyed and unkeyed mixed children', () => {
    const renderList = (labels: ReadonlyArray<string>): VNode =>
      h('ul', {}, [
        h('li', { key: 'keyed' }, [labels[0]!]),
        h('li', {}, [labels[1]!]),
      ])
    const mounted = patch(
      document.createElement('div'),
      renderList(['before-keyed', 'before-unkeyed']),
    )
    const [keyedBefore, unkeyedBefore] = listItemsIn(mounted)

    const patched = patch(mounted, renderList(['after-keyed', 'after-unkeyed']))
    const [keyedAfter, unkeyedAfter] = listItemsIn(patched)

    expect(keyedAfter).toBe(keyedBefore)
    expect(unkeyedAfter).toBe(unkeyedBefore)
  })

  it('preserves select default selection when adding keyed options', () => {
    const mounted = patch(
      document.createElement('div'),
      h('div', {}, [h('select', {}, [])]),
    )
    const select = elementOf(mounted).querySelector('select')!
    expect(select.selectedIndex).toBe(-1)

    const patched = patch(
      mounted,
      h('div', {}, [
        h('select', {}, [
          h('option', { key: 'first', props: { value: 'first' } }, ['First']),
          h('option', { key: 'second', props: { value: 'second' } }, [
            'Second',
          ]),
        ]),
      ]),
    )

    expect(elementOf(patched).querySelector('select')!.selectedIndex).toBe(0)
  })

  it('preserves selectedness when replacing a keyed select option', () => {
    const render = (replaceFirst: boolean): VNode =>
      h('div', {}, [
        h('select', {}, [
          h(
            'option',
            {
              key: replaceFirst ? 'replacement' : 'first',
              props: { value: replaceFirst ? 'replacement' : 'first' },
            },
            [replaceFirst ? 'Replacement' : 'First'],
          ),
          h('option', { key: 'second', props: { value: 'second' } }, [
            'Second',
          ]),
        ]),
      ])
    const mounted = patch(document.createElement('div'), render(false))

    const patched = patch(mounted, render(true))

    expect(elementOf(patched).querySelector('select')!.selectedIndex).toBe(0)
  })

  it('keeps the first retained option selected after reorder and removal', () => {
    const render = (keys: ReadonlyArray<string>): VNode =>
      h('div', {}, [
        h(
          'select',
          {},
          keys.map(key => h('option', { key }, [key])),
        ),
      ])
    const mounted = patch(
      document.createElement('div'),
      render(['a', 'b', 'c']),
    )

    const patched = patch(mounted, render(['c', 'b']))
    const select = elementOf(patched).querySelector('select')!

    expect(select.selectedIndex).toBe(0)
    expect(select.options[select.selectedIndex]!.textContent).toBe('c')
  })

  it('updates selected attributes after keyed option reordering', () => {
    const render = (
      keys: ReadonlyArray<string>,
      selectedKey: string | undefined,
    ): VNode =>
      h('div', {}, [
        h(
          'select',
          {},
          keys.map(key =>
            h('option', { key, attrs: { selected: key === selectedKey } }, [
              key,
            ]),
          ),
        ),
      ])
    const mounted = patch(
      document.createElement('div'),
      render(['a', 'b'], 'b'),
    )

    const patched = patch(mounted, render(['b', 'a'], undefined))
    const select = elementOf(patched).querySelector('select')!

    expect(select.options[0]!.hasAttribute('selected')).toBe(false)
    expect(select.options[1]!.hasAttribute('selected')).toBe(false)
  })

  it('preserves focus and selection on a retained keyed input after reordering', () => {
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key =>
          h('li', { key }, [h('input', { props: { value: key } })]),
        ),
      )
    const container = document.createElement('div')
    document.body.appendChild(container)
    const mounted = patch(container, renderList(['a', 'b', 'c']))
    const input = elementOf(mounted).querySelector('input')!
    input.value = 'typed'
    input.focus()
    input.setSelectionRange(2, 2)
    expect(input.selectionStart).toBe(2)

    const patched = patch(mounted, renderList(['c', 'a', 'b']))
    const retainedInput = listItemsIn(patched)[1]!.querySelector('input')!

    expect(retainedInput).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(2)
    expect(input.selectionEnd).toBe(2)
  })

  it('preserves lifecycle hooks while reusing and removing keyed children', () => {
    const inserted = vi.fn()
    const updated = vi.fn()
    const destroyed = vi.fn()
    const removed = vi.fn((_vnode: VNode, remove: () => void) => remove())
    const renderList = (labels: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        labels.map(label =>
          h(
            'li',
            {
              key: label,
              hook: {
                insert: inserted,
                update: updated,
                destroy: destroyed,
                ...(label === 'b' ? { remove: removed } : {}),
              },
            },
            [label],
          ),
        ),
      )
    const mounted = patch(document.createElement('div'), renderList(['a', 'b']))
    inserted.mockClear()

    const patched = patch(mounted, renderList(['a', 'c']))

    expect(elementOf(patched).textContent).toBe('ac')
    expect(inserted).toHaveBeenCalledTimes(1)
    expect(updated).toHaveBeenCalledTimes(1)
    expect(destroyed).toHaveBeenCalledTimes(1)
    expect(removed).toHaveBeenCalledTimes(1)
  })

  it('keeps update, removal, and insert hooks in legacy order', () => {
    const calls: Array<string> = []
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key =>
          h(
            'li',
            {
              key,
              hook: {
                insert: () => calls.push(`insert:${key}`),
                update: () => calls.push(`update:${key}`),
                destroy: () => calls.push(`destroy:${key}`),
                ...(key === 'a'
                  ? {
                      remove: (_node: VNode, remove: () => void) => {
                        calls.push('remove:a')
                        remove()
                      },
                    }
                  : {}),
              },
            },
            [key],
          ),
        ),
      )
    const mounted = patch(
      document.createElement('div'),
      renderList(['a', 'b', 'c']),
    )
    calls.length = 0

    patch(mounted, renderList(['c', 'b', 'd']))

    expect(calls).toEqual([
      'update:c',
      'update:b',
      'destroy:a',
      'remove:a',
      'insert:d',
    ])
  })
  it('keeps insert hooks in rendered child order', () => {
    const insertedKeys: Array<Key> = []
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key =>
          h(
            'li',
            { key, hook: { insert: node => insertedKeys.push(node.key!) } },
            [key],
          ),
        ),
      )
    const mounted = patch(
      document.createElement('div'),
      renderList(['existing']),
    )
    insertedKeys.length = 0

    patch(mounted, renderList(['first', 'existing', 'last']))

    expect(insertedKeys).toEqual(['first', 'last'])
  })
  it('defers removed-child hooks until retained updates finish', () => {
    const calls: Array<string> = []
    const renderList = (keys: ReadonlyArray<string>): VNode =>
      h(
        'ul',
        {},
        keys.map(key =>
          h(
            'li',
            {
              key,
              hook: {
                insert: () => calls.push(`insert:${key}`),
                update: () => calls.push(`update:${key}`),
                destroy: () => calls.push(`destroy:${key}`),
                ...(key === 'b'
                  ? {
                      remove: (_node: VNode, remove: () => void) => {
                        calls.push('remove:b')
                        remove()
                      },
                    }
                  : {}),
              },
            },
            [key],
          ),
        ),
      )
    const mounted = patch(
      document.createElement('div'),
      renderList(['a', 'b', 'c', 'd']),
    )
    calls.length = 0

    patch(mounted, renderList(['a', 'c', 'd', 'x']))

    expect(calls).toEqual([
      'update:a',
      'update:d',
      'update:c',
      'destroy:b',
      'remove:b',
      'insert:x',
    ])
  })
  it('orders nested and direct insert hooks by rendered sibling order', () => {
    const inserted: Array<string> = []
    const renderList = (withNewChildren: boolean): VNode =>
      h('ul', {}, [
        ...(withNewChildren
          ? [
              h(
                'li',
                { key: 'x', hook: { insert: () => inserted.push('x') } },
                ['x'],
              ),
            ]
          : []),
        h(
          'li',
          { key: 'a', hook: { insert: () => inserted.push('a') } },
          withNewChildren
            ? [
                h(
                  'span',
                  { key: 'y', hook: { insert: () => inserted.push('y') } },
                  ['y'],
                ),
              ]
            : ['a'],
        ),
        ...(withNewChildren
          ? [
              h(
                'li',
                { key: 'z', hook: { insert: () => inserted.push('z') } },
                ['z'],
              ),
            ]
          : []),
      ])
    const mounted = patch(document.createElement('div'), renderList(false))
    inserted.length = 0

    patch(mounted, renderList(true))

    expect(inserted).toEqual(['x', 'y', 'z'])
  })
  it('preserves pointer-order insert hooks when a keyed range rotates', () => {
    const inserted: Array<string> = []
    const renderList = (
      keys: ReadonlyArray<string>,
      withNewChildren: boolean,
    ): VNode =>
      h(
        'ul',
        {},
        keys.map(key =>
          h(
            'li',
            { key },
            withNewChildren
              ? [
                  h('span', { hook: { insert: () => inserted.push(key) } }, [
                    key,
                  ]),
                ]
              : [key],
          ),
        ),
      )
    const mounted = patch(
      document.createElement('div'),
      renderList(['a', 'b', 'c'], false),
    )
    inserted.length = 0

    patch(mounted, renderList(['b', 'c', 'a'], true))

    expect(inserted).toEqual(['a', 'b', 'c'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

describe('children moved out of their parent', () => {
  const keyedChild = (key: string): VNode =>
    h(key === 'panel' ? 'aside' : 'li', { key }, [key])

  const mountKeyedList = (keys: ReadonlyArray<string>): VNode =>
    patch(document.createElement('div'), h('ul', {}, keys.map(keyedChild)))

  const movePanelToPortalRoot = (mounted: VNode): HTMLElement => {
    const panel = elementOf(mounted).querySelector('aside')
    if (panel === null) {
      throw new Error('expected a panel')
    }
    const portalRoot = document.createElement('div')
    const portalSibling = document.createElement('span')
    portalSibling.textContent = 'portal sibling'
    portalRoot.append(panel, portalSibling)
    return portalRoot
  }

  const textsIn = (parent: Element): Array<string | null> =>
    Array.from(parent.children, child => child.textContent)

  it('inserts a new sibling before a portaled last child', () => {
    const mounted = mountKeyedList(['trigger', 'panel'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['trigger', 'badge', 'panel'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['trigger', 'badge'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })

  it('inserts a new sibling between a portaled child and the sibling after it', () => {
    const mounted = mountKeyedList(['panel', 'footer'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['badge', 'panel', 'footer'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['badge', 'footer'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })

  it('inserts new siblings before the sibling that follows a portaled first child', () => {
    const mounted = mountKeyedList(['panel', 'footer'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['badge', 'other', 'footer'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['badge', 'other', 'footer'])
    expect(textsIn(portalRoot)).toEqual(['portal sibling'])
  })

  it('leaves a portaled last child in the portal when it moves to the front', () => {
    const mounted = mountKeyedList(['first', 'second', 'panel'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['panel', 'first', 'second'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['first', 'second'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })

  it('replaces a portaled first child and its sibling with new children', () => {
    const mounted = mountKeyedList(['panel', 'footer'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['first', 'second'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['first', 'second'])
    expect(textsIn(portalRoot)).toEqual(['portal sibling'])
  })

  it('moves a sibling past a portaled last child', () => {
    const mounted = mountKeyedList(['first', 'second', 'panel'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['second', 'panel', 'first'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['second', 'first'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })

  it('moves the last sibling to the front of a portaled first child', () => {
    const mounted = mountKeyedList(['panel', 'first', 'second'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['second', 'panel', 'first'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['second', 'first'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })

  it('appends a new sibling while it removes a portaled last child', () => {
    const mounted = mountKeyedList(['first', 'second', 'panel'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['second', 'first', 'badge'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['second', 'first', 'badge'])
    expect(textsIn(portalRoot)).toEqual(['portal sibling'])
  })

  it('replaces a keyed sibling in front of a portaled first child', () => {
    const mounted = mountKeyedList(['panel', 'first', 'second', 'third'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, [
        h('p', { key: 'second' }, ['replaced']),
        keyedChild('panel'),
        keyedChild('first'),
      ]),
    )

    expect(textsIn(elementOf(patched))).toEqual(['replaced', 'first'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })

  it('moves a middle sibling to the front of a portaled first child', () => {
    const mounted = mountKeyedList(['panel', 'first', 'second', 'third'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['second', 'panel', 'first'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['second', 'first'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })

  it('leaves a portaled middle child in the portal when it moves to the front', () => {
    const mounted = mountKeyedList(['first', 'panel', 'second', 'third'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['panel', 'first', 'second'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['first', 'second'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })

  it('leaves a portaled child in the portal when its siblings reorder around it', () => {
    const mounted = mountKeyedList(['panel', 'first', 'second'])
    const portalRoot = movePanelToPortalRoot(mounted)

    const patched = patch(
      mounted,
      h('ul', {}, ['first', 'second', 'panel'].map(keyedChild)),
    )

    expect(textsIn(elementOf(patched))).toEqual(['first', 'second'])
    expect(textsIn(portalRoot)).toEqual(['panel', 'portal sibling'])
  })
})

describe('new children followed by a null child', () => {
  it('inserts them before the next child that has an element', () => {
    const container = document.createElement('div')
    const mounted = patch(
      container,
      h('ul', {}, [h('li', { key: 'z' }, ['z']), h('li', { key: 'p' }, ['p'])]),
    )

    const patched = patch(
      mounted,
      h('ul', {}, [
        h('li', { key: 'p' }, ['p']),
        h('li', { key: 'x' }, ['x']),
        null,
        h('li', { key: 'z' }, ['z']),
      ]),
    )

    expect(listItemsIn(patched).map(item => item.textContent)).toEqual([
      'p',
      'x',
      'z',
    ])
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

  const patchToKeys = (mounted: VNode, keys: ReadonlyArray<string>): VNode =>
    patch(
      mounted,
      h(
        'ul',
        {},
        keys.map(key => h('li', { key }, [key])),
      ),
    )

  it('warns once per patch when next siblings share a key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mounted = mountListWithKeys(['x', 'y', 'z'])

    patchToKeys(mounted, ['a', 'a', 'c'])

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('"a"')
    expect(warnSpy.mock.calls[0]?.[0]).toContain('<ul>')
  })

  it('warns again on a later patch', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mounted = mountListWithKeys(['x', 'y', 'z'])

    patchToKeys(patchToKeys(mounted, ['a', 'a', 'c']), ['b', 'b', 'c'])

    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(warnSpy.mock.calls[1]?.[0]).toContain('"b"')
  })

  it('does not warn when sibling keys are unique', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mounted = mountListWithKeys(['x', 'y', 'z'])

    patchToKeys(mounted, ['a', 'b', 'c'])
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('does not warn when the gate is off', () => {
    __overrideDuplicateKeyWarning(false)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mounted = mountListWithKeys(['x', 'y', 'z'])

    patchToKeys(mounted, ['a', 'a', 'c'])

    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe('postdestroy hook', () => {
  it('runs after the destroy hooks of the vnode and of every descendant', () => {
    const calls: Array<string> = []
    const moduleDestroy = (vnode: VNode): void => {
      calls.push(`module destroy ${vnode.sel}`)
    }
    const hooksFor = (name: string) => ({
      destroy: () => {
        calls.push(`destroy ${name}`)
      },
      postdestroy: () => {
        calls.push(`postdestroy ${name}`)
      },
    })
    const hookedPatch = init([{ destroy: moduleDestroy }])
    const container = document.createElement('div')
    const mounted = hookedPatch(
      container,
      h('div', [
        h('section', { hook: hooksFor('section') }, [
          h('span', { hook: hooksFor('span') }),
        ]),
      ]),
    )

    hookedPatch(mounted, h('div'))

    expect(calls).toStrictEqual([
      'destroy section',
      'module destroy section',
      'destroy span',
      'module destroy span',
      'postdestroy span',
      'postdestroy section',
    ])
  })
})
