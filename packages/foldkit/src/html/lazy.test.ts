import { describe, it } from '@effect/vitest'
import { Context } from 'effect'
import { h } from 'snabbdom'
import { afterEach, beforeEach, expect } from 'vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
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
