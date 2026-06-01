import { h } from 'snabbdom'
import { describe, expect, it } from 'vitest'

import { type VNode, dedupeSharedVNodes, patch, toVNode } from './vdom.js'

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

  it('resets elm on the cloned occurrence so it gets its own DOM node', () => {
    const shared = h('span', {}, ['✓'])
    shared.elm = document.createElement('span')
    const tree = h('div', {}, [shared, shared])

    const result = dedupeSharedVNodes(tree)

    expect(asVNode(result.children?.[0]).elm).toBe(shared.elm)
    expect(asVNode(result.children?.[1]).elm).toBeUndefined()
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
