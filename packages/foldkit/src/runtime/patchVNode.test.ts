import { Option } from 'effect'
import { h } from 'snabbdom'
import { describe, expect, it } from 'vitest'

import { type VNode } from '../vdom.js'
import { patchVNode } from './runtime.js'

const spanCountsIn = (root: Node | undefined): ReadonlyArray<number> => {
  if (!(root instanceof Element)) {
    return []
  }
  return Array.from(root.querySelectorAll('button')).map(
    button => button.querySelectorAll('span').length,
  )
}

describe('patchVNode', () => {
  // NOTE: guards the dedupeSharedVNodes wiring. The three buttons share ONE
  // `check` vnode object; without the dedupe pass inside patchVNode, snabbdom
  // mutates a single `.elm` across all three positions and a hide/show cycle
  // leaves stale spans behind. Removing the call fails the final assertion.
  it('does not accumulate DOM nodes when a vnode value is reused across positions', () => {
    const renderTree = (isShown: boolean): VNode => {
      const check = h('span', {}, ['✓'])
      return h('div', {}, [
        h('button', {}, isShown ? [check] : []),
        h('button', {}, isShown ? [check] : []),
        h('button', {}, isShown ? [check] : []),
      ])
    }

    const container = document.createElement('div')

    let mounted = patchVNode(Option.none(), renderTree(true), container)
    expect(spanCountsIn(mounted.elm)).toEqual([1, 1, 1])

    mounted = patchVNode(Option.some(mounted), renderTree(false), container)
    expect(spanCountsIn(mounted.elm)).toEqual([0, 0, 0])

    mounted = patchVNode(Option.some(mounted), renderTree(true), container)
    expect(spanCountsIn(mounted.elm)).toEqual([1, 1, 1])
  })
})
