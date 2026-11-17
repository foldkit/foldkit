import { Option, Predicate } from 'effect'

import { type VNode, __patchVNode, memoizedVNodes } from '../vdom.js'
import {
  type SceneSimulation,
  type SceneStep,
  __runSteps as runSteps,
  __toInternal as toInternal,
} from './scene.js'

// NOTE: only the data that reaches the DOM's markup is kept. Hooks would start
// Mounts and OnUnmount dispatches, and listeners never fire here.
const MARKUP_DATA_KEYS = [
  'attrs',
  'props',
  'class',
  'style',
  'dataset',
  'key',
  'ns',
  'is',
] as const

type Child = VNode | string

const copyData = (data: VNode['data']): VNode['data'] => {
  if (data === undefined) {
    return undefined
  }
  const copy: Record<string, unknown> = {}
  for (const key of MARKUP_DATA_KEYS) {
    if (data[key] !== undefined) {
      copy[key] = data[key]
    }
  }
  return copy
}

/** Copies VNodes for patching without hooks. One copy per original object, so
 *  a reused original (a lazy cache hit, a shared const) is a reused copy, and
 *  a memoized original's copy is memoized too: the runtime's dedupe and
 *  snabbdom's same-vnode short-circuit then treat the copies exactly as they
 *  would treat the originals. */
const makeCopier = (cache: WeakMap<VNode, VNode> | undefined) => {
  const copy = (node: Child): Child => {
    if (Predicate.isString(node)) {
      return node
    }
    const cached = cache?.get(node)
    if (cached !== undefined) {
      return cached
    }
    const copied: VNode = {
      sel: node.sel,
      data: copyData(node.data),
      children: node.children?.map(copy),
      elm: undefined,
      text: node.text,
      key: node.key,
    }
    if (memoizedVNodes.has(node)) {
      memoizedVNodes.add(copied)
    }
    cache?.set(node, copied)
    return copied
  }
  return copy
}

const isVNode = (child: Child): child is VNode => !Predicate.isString(child)

const mountFresh = (node: VNode): Element => {
  const host = document.createElement('div')
  const container = document.createElement('div')
  host.appendChild(container)
  const copied = makeCopier(undefined)(node)
  if (!isVNode(copied)) {
    throw new Error('expectDomInSync needs an element root.')
  }
  __patchVNode(Option.none(), copied, container)
  return host
}

const firstDifference = (actual: string, expected: string): string => {
  let index = 0
  while (index < actual.length && actual[index] === expected[index]) {
    index++
  }
  const from = Math.max(0, index - 80)
  return [
    `  patched: …${actual.slice(from, index + 120)}…`,
    `  fresh:   …${expected.slice(from, index + 120)}…`,
  ].join('\n')
}

/** Runs `steps` while patching every render into a real DOM, the way the
 *  runtime does, and throws when the patched DOM differs from a fresh render
 *  of the same view. Catches patch bugs a VNode assertion cannot see, such as
 *  a lazy-cached VNode reused at a different position among unkeyed siblings.
 *  Compares markup only (attributes, classes, styles, text); hooks and
 *  listeners do not run. Needs a DOM environment such as happy-dom. */
export const expectDomInSync =
  <Model, Message, OutMessage = undefined>(
    ...steps: ReadonlyArray<NoInfer<SceneStep<Model, Message, OutMessage>>>
  ) =>
  (
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    if (typeof document === 'undefined') {
      throw new Error(
        'expectDomInSync needs a DOM. Run the test with a DOM environment, for example `// @vitest-environment happy-dom`.',
      )
    }
    const copy = makeCopier(new WeakMap())
    const host = document.createElement('div')
    const container = document.createElement('div')
    host.appendChild(container)
    let maybeCurrent = Option.none<VNode>()

    const patchIn = (html: VNode | undefined, label: string): void => {
      if (html === undefined) {
        return
      }
      const copied = copy(html)
      if (!isVNode(copied)) {
        return
      }
      const seen = new Set<object>()
      maybeCurrent = Option.some(
        Option.isNone(maybeCurrent)
          ? __patchVNode(Option.none(), copied, container, seen)
          : __patchVNode(maybeCurrent, copied, container, seen),
      )
      const actual = host.innerHTML
      const expected = mountFresh(html).innerHTML
      if (actual !== expected) {
        throw new Error(
          `The patched DOM no longer matches a fresh render after ${label}.\n\n` +
            `${firstDifference(actual, expected)}\n\n` +
            'A lazy-cached VNode reused at a different position among unkeyed ' +
            'siblings is the usual cause. Key the siblings (h.keyed) so snabbdom ' +
            'matches them by identity.',
        )
      }
    }

    patchIn(toInternal(simulation).html, 'the first render')
    let current = simulation
    steps.forEach((step, index) => {
      current = runSteps(current, [step])
      patchIn(toInternal(current).html, `step ${index + 1}`)
    })
    return current
  }
