import { Context, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { beginRender, createBoundaryRegistry } from './html/boundary.js'
import { __htmlBuilder } from './html/index.js'
import { clearRuntime, setRuntime } from './html/runtimeSingleton.js'
import { h } from './snabbdom/index.js'
import { type VNode, __patchVNode } from './vdom.js'

const spanCountsIn = (root: Node | undefined): ReadonlyArray<number> => {
  if (!(root instanceof Element)) {
    return []
  }
  return Array.from(root.querySelectorAll('button')).map(
    button => button.querySelectorAll('span').length,
  )
}

describe('__patchVNode', () => {
  // NOTE: guards the dedupeSharedVNodes wiring. The three buttons share ONE
  // `check` vnode object; without the dedupe pass inside __patchVNode, snabbdom
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

    let mounted = __patchVNode(Option.none(), renderTree(true), container)
    expect(spanCountsIn(mounted.elm)).toEqual([1, 1, 1])

    mounted = __patchVNode(Option.some(mounted), renderTree(false), container)
    expect(spanCountsIn(mounted.elm)).toEqual([0, 0, 0])

    mounted = __patchVNode(Option.some(mounted), renderTree(true), container)
    expect(spanCountsIn(mounted.elm)).toEqual([1, 1, 1])
  })
})

describe('controlled select on a fresh render', () => {
  const builder = __htmlBuilder<never>()

  const buildView = <A>(build: () => A): A => {
    const registry = createBoundaryRegistry()
    setRuntime(() => {}, Context.empty(), registry)
    beginRender(registry)
    try {
      return build()
    } finally {
      clearRuntime()
    }
  }

  // The props module sets `value` while the element is being created, before
  // its <option> children exist, so the setter has nothing to match and the
  // browser's own default stands. The server marks the matching option instead,
  // so the served page was right and the fresh render was not. Both now settle
  // on the Model's value at the same point.
  it('selects the option the Model names without waiting for a patch', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    try {
      const view = buildView(() =>
        builder.select(
          [builder.Value('us')],
          [
            builder.option([builder.Value('')], ['Choose']),
            builder.option([builder.Value('us')], ['United States']),
          ],
        ),
      )
      const mounted = __patchVNode(Option.none(), view, container)

      expect(mounted.elm).toBeInstanceOf(HTMLSelectElement)
      if (mounted.elm instanceof HTMLSelectElement) {
        expect(mounted.elm.value).toBe('us')
      }
    } finally {
      container.remove()
    }
  })

  // The counterpart of the serializer's ownership rule. Both sides must land on
  // the option the select's value names, not on the one that declared itself
  // selected, or the served page and the fresh render disagree.
  it('gives the select value ownership over a descendant Selected', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    try {
      const view = buildView(() =>
        builder.select(
          [builder.Value('a')],
          [
            builder.option([builder.Value('a')], ['A']),
            builder.option([builder.Value('b'), builder.Selected(true)], ['B']),
          ],
        ),
      )
      const mounted = __patchVNode(Option.none(), view, container)

      expect(mounted.elm).toBeInstanceOf(HTMLSelectElement)
      if (mounted.elm instanceof HTMLSelectElement) {
        expect(mounted.elm.value).toBe('a')
        expect(mounted.elm.selectedIndex).toBe(0)
      }
    } finally {
      container.remove()
    }
  })
})
