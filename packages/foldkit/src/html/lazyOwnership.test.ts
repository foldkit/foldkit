import { Context, Option } from 'effect'
import { afterEach, expect, it, vi } from 'vitest'

import { type VNode, __patchVNode } from '../vdom.js'
import { beginRender, createBoundaryRegistry } from './boundary.js'
import { __htmlBuilder } from './index.js'
import { createLazy } from './public.js'
import { clearRuntime, setRuntime } from './runtimeSingleton.js'

const requiredVNode = (node: VNode | string | null | undefined): VNode => {
  if (node === undefined || node === null || typeof node === 'string') {
    throw new Error('Expected a VNode')
  }

  return node
}

const childElement = (tree: VNode, parentIndex: number) =>
  requiredVNode(requiredVNode(tree.children?.at(parentIndex)).children?.at(0))
    .elm

afterEach(() => {
  clearRuntime()
  document.body.replaceChildren()
})

it.each([
  { name: 'childless', createSource: () => html.span([]) },
  { name: 'text', createSource: () => html.span([], ['shared']) },
])(
  'preserves DOM ownership when a shared $name lazy root returns to an earlier parent',
  ({ createSource }) => {
    const registry = createBoundaryRegistry()
    setRuntime(() => {}, Context.empty(), registry)

    const firstSlot = createLazy()
    const secondSlot = createLazy()
    const shared = requiredVNode(createSource())
    const view = () => shared
    const tree = (isFirstVisible: boolean, isSecondVisible: boolean) =>
      html.main(
        [],
        [
          html.section(
            [html.Key('first')],
            isFirstVisible ? [requiredVNode(firstSlot(view, []))] : [],
          ),
          html.section(
            [html.Key('second')],
            isSecondVisible ? [requiredVNode(secondSlot(view, []))] : [],
          ),
        ],
      )
    const container = document.createElement('div')
    document.body.append(container)

    beginRender(registry)
    const both = __patchVNode(
      Option.none(),
      tree(true, true),
      container,
      registry.dedupeSeen,
    )
    const firstElement = childElement(both, 0)
    const secondElement = childElement(both, 1)
    expect(firstElement).not.toBe(secondElement)

    beginRender(registry)
    const onlySecond = __patchVNode(
      Option.some(both),
      tree(false, true),
      container,
      registry.dedupeSeen,
    )
    expect(document.querySelectorAll('span')).toHaveLength(1)
    expect(childElement(onlySecond, 1)).toBe(secondElement)

    beginRender(registry)
    const restored = __patchVNode(
      Option.some(onlySecond),
      tree(true, true),
      container,
      registry.dedupeSeen,
    )
    expect(document.querySelectorAll('span')).toHaveLength(2)
    expect(childElement(restored, 1)).toBe(secondElement)
    expect(childElement(restored, 0)).not.toBe(secondElement)

    beginRender(registry)
    const onlyFirst = __patchVNode(
      Option.some(restored),
      tree(true, false),
      container,
      registry.dedupeSeen,
    )
    expect(document.querySelectorAll('span')).toHaveLength(1)
    expect(childElement(onlyFirst, 0)).not.toBe(secondElement)
  },
)

it('preserves a nested cached root when another lazy slot starts sharing its source', () => {
  const registry = createBoundaryRegistry()
  setRuntime(() => {}, Context.empty(), registry)

  const innerSlot = createLazy()
  const outerSlot = createLazy()
  const secondSlot = createLazy()
  const shared = requiredVNode(html.span([]))
  const innerView = vi.fn(() => shared)
  const outerView = vi.fn(() =>
    html.article([], [requiredVNode(innerSlot(innerView, []))]),
  )
  const secondView = vi.fn(() => shared)
  const tree = (isSecondVisible: boolean) =>
    html.main(
      [],
      [
        html.section([], [requiredVNode(outerSlot(outerView, []))]),
        html.section(
          [],
          isSecondVisible ? [requiredVNode(secondSlot(secondView, []))] : [],
        ),
      ],
    )
  const container = document.createElement('div')
  document.body.append(container)

  beginRender(registry)
  const first = __patchVNode(
    Option.none(),
    tree(false),
    container,
    registry.dedupeSeen,
  )
  const nestedElement = shared.elm
  expect(nestedElement).toBe(document.querySelector('article span'))

  beginRender(registry)
  const both = __patchVNode(
    Option.some(first),
    tree(true),
    container,
    registry.dedupeSeen,
  )
  expect(document.querySelectorAll('span')).toHaveLength(2)
  expect(shared.elm).toBe(nestedElement)
  expect(childElement(both, 1)).not.toBe(nestedElement)
  expect(innerView).toHaveBeenCalledTimes(1)
  expect(outerView).toHaveBeenCalledTimes(1)
  expect(secondView).toHaveBeenCalledTimes(1)
})

const html = __htmlBuilder<never>()
