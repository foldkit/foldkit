import { Context } from 'effect'
import { h } from 'snabbdom'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { type VNode, dedupeSharedVNodes, memoizedVNodes } from '../vdom.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from './boundary.js'
import { createKeyedLazy, createLazy } from './lazy.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'

const noOpDispatchSync: DispatchSync = () => {}

const noOpDispatchService = Dispatch.of({
  dispatchAsync: () =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Promise.resolve() as unknown as ReturnType<
      typeof Dispatch.Service.dispatchAsync
    >,
  dispatchSync: noOpDispatchSync,
})

const noOpContext = Context.make(Dispatch, noOpDispatchService).pipe(
  Context.add(MountTracker, {
    started: () => {},
    ended: () => {},
  }),
)

const pushNoOpRuntime = (): void => {
  setRuntime(noOpDispatchSync, noOpContext)
}

const asVNode = (child: VNode | string | undefined): VNode => {
  if (child === undefined || typeof child === 'string') {
    throw new Error('expected a VNode')
  }
  return child
}

describe('memoized views dedupe shared consts', () => {
  let registry: BoundaryRegistry

  beforeEach(() => {
    registry = createBoundaryRegistry()
    setRuntime(noOpDispatchSync, noOpContext, registry)
    beginRender(registry)
  })

  afterEach(() => {
    clearRuntime()
  })

  it('clones a const reused at two positions inside one memoized view', () => {
    const icon = h('span', {}, ['icon'])
    const view = () => h('div', {}, [icon, icon])
    const lazy = createLazy()

    const result = lazy(view, [])

    expect(asVNode(result!.children?.[0])).toBe(icon)
    expect(asVNode(result!.children?.[1])).not.toBe(icon)
  })

  it('clones a const shared across two memoized slots in one render', () => {
    const icon = h('span', {}, ['icon'])
    const rowView = (label: string) =>
      h('div', {}, [icon, h('span', {}, [label])])
    const lazyRows = createKeyedLazy()

    const rowA = lazyRows('a', rowView, ['a'])
    const rowB = lazyRows('b', rowView, ['b'])
    const tree = dedupeSharedVNodes(
      h('ul', {}, [rowA!, rowB!]),
      registry.dedupeSeen,
    )

    const iconA = asVNode(asVNode(tree.children?.[0]).children?.[0])
    const iconB = asVNode(asVNode(tree.children?.[1]).children?.[0])
    expect(iconA).toBe(icon)
    expect(iconB).not.toBe(icon)
  })

  it('clones a const that moves to a different memoized slot across renders', () => {
    const icon = h('span', {}, ['icon'])
    // A prior render patched the icon, recording its live DOM node on .elm.
    icon.elm = document.createElement('span')
    const rowView = (isShown: boolean) => h('div', {}, isShown ? [icon] : [])
    const lazyRows = createKeyedLazy()

    const rowB = lazyRows('b', rowView, [true])

    const iconInB = asVNode(rowB!.children?.[0])
    expect(iconInB).not.toBe(icon)
    expect(iconInB.elm).toBeUndefined()
  })

  it('keeps a memoized result identical on a cache hit so the short-circuit survives', () => {
    const view = (label: string) => h('div', {}, [h('span', {}, [label])])
    const lazy = createLazy()

    const first = lazy(view, ['x'])
    beginRender(registry)
    const second = lazy(view, ['x'])

    expect(second).toBe(first)
    const tree = dedupeSharedVNodes(
      h('div', {}, [second!]),
      registry.dedupeSeen,
    )
    expect(asVNode(tree.children?.[0])).toBe(first)
  })

  it('clones a const shared between a memoized view and a plain sibling', () => {
    const icon = h('span', {}, ['icon'])
    const memoizedView = () => h('div', {}, [icon])
    const lazy = createLazy()

    const memoized = lazy(memoizedView, [])
    const tree = dedupeSharedVNodes(
      h('section', {}, [memoized!, h('div', {}, [icon])]),
      registry.dedupeSeen,
    )

    expect(asVNode(asVNode(tree.children?.[0]).children?.[0])).toBe(icon)
    expect(asVNode(asVNode(tree.children?.[1]).children?.[0])).not.toBe(icon)
  })

  it('clones a plain-sibling const even when the memoized view is a cache hit', () => {
    const icon = h('span', {}, ['icon'])
    const memoizedView = () => h('div', {}, [icon])
    const lazy = createLazy()

    lazy(memoizedView, [])
    // A prior render patched the icon, recording its live DOM node on .elm.
    icon.elm = document.createElement('span')

    beginRender(registry)
    const memoized = lazy(memoizedView, [])
    const tree = dedupeSharedVNodes(
      h('section', {}, [memoized!, h('div', {}, [icon])]),
      registry.dedupeSeen,
    )

    const plainIcon = asVNode(asVNode(tree.children?.[1]).children?.[0])
    expect(plainIcon).not.toBe(icon)
    expect(plainIcon.elm).toBeUndefined()
  })
})

describe('createLazy', () => {
  beforeEach(() => {
    pushNoOpRuntime()
  })
  afterEach(() => {
    clearRuntime()
  })

  it('calls the view function on first render', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return h('div', {}, [label])
    }

    const lazy = createLazy()
    lazy(viewFn, ['hello'])

    expect(callCount).toBe(1)
  })

  it('returns cached VNode when function and args are the same reference', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return h('div', {}, [label])
    }

    const lazy = createLazy()
    const firstVNode = lazy(viewFn, ['hello'])
    const secondVNode = lazy(viewFn, ['hello'])

    expect(callCount).toBe(1)
    expect(secondVNode).toBe(firstVNode)
  })

  it('records its result so dedupeSharedVNodes preserves the cached identity', () => {
    const viewFn = (label: string) => h('div', {}, [label])

    const lazy = createLazy()
    const vnode = lazy(viewFn, ['hello'])

    expect(vnode).not.toBeNull()
    expect(memoizedVNodes.has(vnode!)).toBe(true)

    vnode!.elm = document.createElement('div')
    const tree = h('section', {}, [vnode!])
    const result = dedupeSharedVNodes(tree)

    expect(result.children?.[0]).toBe(vnode)
  })

  it('recomputes when args change by reference', () => {
    let callCount = 0
    const viewFn = (count: number) => {
      callCount++
      return h('div', {}, [`count: ${count}`])
    }

    const lazy = createLazy()
    const firstVNode = lazy(viewFn, [1])
    const secondVNode = lazy(viewFn, [2])

    expect(callCount).toBe(2)
    expect(secondVNode).not.toBe(firstVNode)
  })

  it('recomputes when function reference changes', () => {
    let callCount = 0
    const makeViewFn = () => (label: string) => {
      callCount++
      return h('div', {}, [label])
    }

    const lazy = createLazy()
    lazy(makeViewFn(), ['hello'])
    lazy(makeViewFn(), ['hello'])

    expect(callCount).toBe(2)
  })

  it('returns cached VNode when multiple args are the same reference', () => {
    let callCount = 0
    const viewFn = (label: string, count: number) => {
      callCount++
      return h('div', {}, [`${label}: ${count}`])
    }

    const lazy = createLazy()
    lazy(viewFn, ['hello', 42])
    lazy(viewFn, ['hello', 42])

    expect(callCount).toBe(1)
  })

  it('recomputes when any arg in the array changes', () => {
    let callCount = 0
    const viewFn = (label: string, count: number) => {
      callCount++
      return h('div', {}, [`${label}: ${count}`])
    }

    const lazy = createLazy()
    lazy(viewFn, ['hello', 1])
    lazy(viewFn, ['hello', 2])

    expect(callCount).toBe(2)
  })

  it('uses referential equality for object args', () => {
    let callCount = 0
    const viewFn = (model: Readonly<{ value: number }>) => {
      callCount++
      return h('div', {}, [`${model.value}`])
    }

    const model = { value: 1 }
    const lazy = createLazy()
    lazy(viewFn, [model])
    lazy(viewFn, [model])

    expect(callCount).toBe(1)
  })

  it('recomputes when object arg is a new reference with same value', () => {
    let callCount = 0
    const viewFn = (model: Readonly<{ value: number }>) => {
      callCount++
      return h('div', {}, [`${model.value}`])
    }

    const lazy = createLazy()
    lazy(viewFn, [{ value: 1 }])
    lazy(viewFn, [{ value: 1 }])

    expect(callCount).toBe(2)
  })

  it('independent lazy instances do not share cache', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return h('div', {}, [label])
    }

    const lazyA = createLazy()
    const lazyB = createLazy()
    lazyA(viewFn, ['hello'])
    lazyB(viewFn, ['hello'])

    expect(callCount).toBe(2)
  })

  it('handles null VNode from view function', () => {
    let callCount = 0
    const viewFn = () => {
      callCount++
      return null
    }

    const lazy = createLazy()
    const firstResult = lazy(viewFn, [])
    const secondResult = lazy(viewFn, [])

    expect(callCount).toBe(1)
    expect(firstResult).toBeNull()
    expect(secondResult).toBeNull()
  })

  it('recomputes when dispatch changes between renders', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return h('div', {}, [label])
    }

    const otherDispatchSync: DispatchSync = () => {}
    const otherContext = Context.make(Dispatch, noOpDispatchService).pipe(
      Context.add(MountTracker, {
        started: () => {},
        ended: () => {},
      }),
    )

    const lazy = createLazy()
    lazy(viewFn, ['hello'])
    clearRuntime()
    setRuntime(otherDispatchSync, otherContext)
    lazy(viewFn, ['hello'])

    expect(callCount).toBe(2)
  })
})

describe('createKeyedLazy', () => {
  beforeEach(() => {
    pushNoOpRuntime()
  })
  afterEach(() => {
    clearRuntime()
  })

  it('calls the view function on first render for each key', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return h('div', {}, [label])
    }

    const lazy = createKeyedLazy()
    lazy('a', viewFn, ['hello'])
    lazy('b', viewFn, ['world'])

    expect(callCount).toBe(2)
  })

  it('caches independently per key', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return h('div', {}, [label])
    }

    const lazy = createKeyedLazy()
    lazy('a', viewFn, ['hello'])
    lazy('b', viewFn, ['world'])
    lazy('a', viewFn, ['hello'])
    lazy('b', viewFn, ['world'])

    expect(callCount).toBe(2)
  })

  it('recomputes only the key whose args changed', () => {
    const calls: Array<string> = []
    const viewFn = (label: string) => {
      calls.push(label)
      return h('div', {}, [label])
    }

    const lazy = createKeyedLazy()
    lazy('a', viewFn, ['hello'])
    lazy('b', viewFn, ['world'])
    lazy('a', viewFn, ['hello'])
    lazy('b', viewFn, ['changed'])

    expect(calls).toStrictEqual(['hello', 'world', 'changed'])
  })

  it('returns cached VNode reference on cache hit', () => {
    const viewFn = (label: string) => h('div', {}, [label])

    const lazy = createKeyedLazy()
    const first = lazy('a', viewFn, ['hello'])
    const second = lazy('a', viewFn, ['hello'])

    expect(second).toBe(first)
  })

  it('returns different VNode references on cache miss', () => {
    const viewFn = (active: boolean) => h('div', {}, [String(active)])

    const lazy = createKeyedLazy()
    const first = lazy('a', viewFn, [false])
    const second = lazy('a', viewFn, [true])

    expect(second).not.toBe(first)
  })

  it('recomputes when dispatch changes between renders', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return h('div', {}, [label])
    }

    const otherDispatchSync: DispatchSync = () => {}
    const otherContext = Context.make(Dispatch, noOpDispatchService).pipe(
      Context.add(MountTracker, {
        started: () => {},
        ended: () => {},
      }),
    )

    const lazy = createKeyedLazy()
    lazy('a', viewFn, ['hello'])
    clearRuntime()
    setRuntime(otherDispatchSync, otherContext)
    lazy('a', viewFn, ['hello'])

    expect(callCount).toBe(2)
  })
})
