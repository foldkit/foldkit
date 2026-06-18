import { h } from 'snabbdom'
import { describe, expect, it } from 'vitest'

import {
  type VNode,
  dedupeSharedVNodes,
  memoizedVNodes,
  patch,
  toVNode,
} from './vdom.js'

const asVNode = (child: VNode | string | undefined): VNode => {
  if (child === undefined || typeof child === 'string') {
    throw new Error('expected a VNode')
  }
  return child
}

describe('dedupeSharedVNodes', () => {
  it('returns the tree unchanged when no vnode object is reused', () => {
    const tree = h('div', {}, [h('span', {}, ['a']), h('span', {}, ['b'])])

    const result = dedupeSharedVNodes(tree)

    expect(result).toBe(tree)
    expect(result.children?.[0]).toBe(tree.children?.[0])
    expect(result.children?.[1]).toBe(tree.children?.[1])
  })

  it('clones a vnode object reused across sibling positions into distinct objects', () => {
    const shared = h('span', {}, ['✓'])
    const tree = h('div', {}, [shared, shared])

    const result = dedupeSharedVNodes(tree)

    expect(result.children?.[0]).toBe(shared)
    expect(result.children?.[1]).not.toBe(shared)
    expect(asVNode(result.children?.[1]).sel).toBe(shared.sel)
  })

  it('clears elm on every occurrence of a vnode reused across renders', () => {
    const shared = h('span', {}, ['✓'])
    shared.elm = document.createElement('span')
    const tree = h('div', {}, [shared, shared])

    const result = dedupeSharedVNodes(tree)

    expect(asVNode(result.children?.[0])).not.toBe(shared)
    expect(asVNode(result.children?.[0]).elm).toBeUndefined()
    expect(asVNode(result.children?.[1]).elm).toBeUndefined()
  })

  it('clones a single-occurrence vnode that carries a stale elm', () => {
    const reused = h('span', {}, ['✓'])
    reused.elm = document.createElement('span')
    const tree = h('div', {}, [reused])

    const result = dedupeSharedVNodes(tree)

    expect(asVNode(result.children?.[0])).not.toBe(reused)
    expect(asVNode(result.children?.[0]).elm).toBeUndefined()
  })

  it('preserves the identity of a memoized vnode that carries an elm', () => {
    const memoized = h('div', {}, [h('span', {}, ['cached'])])
    memoized.elm = document.createElement('div')
    memoizedVNodes.add(memoized)
    const tree = h('section', {}, [memoized])

    const result = dedupeSharedVNodes(tree)

    expect(asVNode(result.children?.[0])).toBe(memoized)
    expect(asVNode(result.children?.[0]).elm).toBe(memoized.elm)
  })

  it('keeps a re-wrapped memoized subtree opaque so its cached children survive', () => {
    const cachedChild = h('span', {}, ['heavy'])
    cachedChild.elm = document.createElement('span')
    const memoized = h('div', {}, [cachedChild])
    memoizedVNodes.add(memoized)

    // Simulate withBoundaryCleanup: a fresh wrapper sharing the cached children,
    // propagating membership so the cached subtree is not cloned.
    const wrapper: VNode = {
      ...memoized,
      data: { hook: { destroy: () => {} } },
    }
    memoizedVNodes.add(wrapper)
    const tree = h('section', {}, [wrapper])

    const result = dedupeSharedVNodes(tree)

    expect(asVNode(result.children?.[0]).children?.[0]).toBe(cachedChild)
  })

  it('keeps a memoized vnode opaque even when it carries no elm yet', () => {
    const memoized = h('div', {}, [h('span', {}, ['cached'])])
    memoizedVNodes.add(memoized)
    const tree = h('section', {}, [memoized])

    const result = dedupeSharedVNodes(tree)

    expect(asVNode(result.children?.[0])).toBe(memoized)
  })

  it('keeps an element on its row when a shared const moves to an earlier sibling', () => {
    const shared = h('span', { class: { dot: true } }, ['●'])
    const tree = (selectedRow: number): VNode =>
      h('ul', {}, [
        h('li', {}, selectedRow === 0 ? [shared, 'r0'] : ['r0']),
        h('li', {}, selectedRow === 1 ? [shared, 'r1'] : ['r1']),
        h('li', {}, selectedRow === 2 ? [shared, 'r2'] : ['r2']),
      ])

    const rowWithDot = (root: Node | undefined): number =>
      root instanceof Element
        ? Array.from(root.querySelectorAll('li')).findIndex(li =>
            li.querySelector('span'),
          )
        : -1

    const container = document.createElement('div')
    let mounted = patch(toVNode(container), dedupeSharedVNodes(tree(2)))
    expect(rowWithDot(mounted.elm)).toBe(2)

    mounted = patch(mounted, dedupeSharedVNodes(tree(0)))
    expect(rowWithDot(mounted.elm)).toBe(0)
  })

  it('clones the entire shared subtree, not just its root', () => {
    const sharedChild = h('i', {}, ['x'])
    const sharedParent = h('span', {}, [sharedChild])
    const tree = h('div', {}, [sharedParent, sharedParent])

    const result = dedupeSharedVNodes(tree)

    const first = asVNode(result.children?.[0])
    const second = asVNode(result.children?.[1])

    expect(first).toBe(sharedParent)
    expect(first.children?.[0]).toBe(sharedChild)
    expect(second).not.toBe(sharedParent)
    expect(second.children?.[0]).not.toBe(sharedChild)
    expect(sharedParent.children?.[0]).toBe(sharedChild)
  })

  it('renders and removes a reused vnode in every position without accumulation', () => {
    const renderTree = (isShown: boolean): VNode => {
      const check = h('span', {}, ['✓'])
      return h('div', {}, [
        h('button', {}, isShown ? [check] : []),
        h('button', {}, isShown ? [check] : []),
        h('button', {}, isShown ? [check] : []),
      ])
    }

    const spanCountsIn = (root: Node | undefined): ReadonlyArray<number> => {
      if (!(root instanceof Element)) {
        return []
      }
      return Array.from(root.querySelectorAll('button')).map(
        button => button.querySelectorAll('span').length,
      )
    }

    const container = document.createElement('div')

    let mounted = patch(
      toVNode(container),
      dedupeSharedVNodes(renderTree(true)),
    )
    expect(spanCountsIn(mounted.elm)).toEqual([1, 1, 1])

    mounted = patch(mounted, dedupeSharedVNodes(renderTree(false)))
    expect(spanCountsIn(mounted.elm)).toEqual([0, 0, 0])

    mounted = patch(mounted, dedupeSharedVNodes(renderTree(true)))
    expect(spanCountsIn(mounted.elm)).toEqual([1, 1, 1])
  })
})
