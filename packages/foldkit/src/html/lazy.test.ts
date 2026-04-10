import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import { h } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../runtime'
import { createKeyedLazy, createLazy } from './lazy'

const noOpDispatch = Dispatch.of({
  dispatchAsync: () => Effect.void,
  dispatchSync: () => {},
})

const runHtml = <A>(effect: Effect.Effect<A, never, Dispatch>): A =>
  Effect.runSync(Effect.provideService(effect, Dispatch, noOpDispatch))

describe('createLazy', () => {
  it('calls the view function on first render', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return Effect.succeed(h('div', {}, [label]))
    }

    const lazy = createLazy()
    runHtml(lazy(viewFn, ['hello']))

    expect(callCount).toBe(1)
  })

  it('returns cached VNode when function and args are the same reference', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return Effect.succeed(h('div', {}, [label]))
    }

    const lazy = createLazy()
    const firstVNode = runHtml(lazy(viewFn, ['hello']))
    const secondVNode = runHtml(lazy(viewFn, ['hello']))

    expect(callCount).toBe(1)
    expect(secondVNode).toBe(firstVNode)
  })

  it('recomputes when args change by reference', () => {
    let callCount = 0
    const viewFn = (count: number) => {
      callCount++
      return Effect.succeed(h('div', {}, [`count: ${count}`]))
    }

    const lazy = createLazy()
    const firstVNode = runHtml(lazy(viewFn, [1]))
    const secondVNode = runHtml(lazy(viewFn, [2]))

    expect(callCount).toBe(2)
    expect(secondVNode).not.toBe(firstVNode)
  })

  it('recomputes when function reference changes', () => {
    let callCount = 0
    const makeViewFn = () => (label: string) => {
      callCount++
      return Effect.succeed(h('div', {}, [label]))
    }

    const lazy = createLazy()
    runHtml(lazy(makeViewFn(), ['hello']))
    runHtml(lazy(makeViewFn(), ['hello']))

    expect(callCount).toBe(2)
  })

  it('returns cached VNode when multiple args are the same reference', () => {
    let callCount = 0
    const viewFn = (label: string, count: number) => {
      callCount++
      return Effect.succeed(h('div', {}, [`${label}: ${count}`]))
    }

    const lazy = createLazy()
    runHtml(lazy(viewFn, ['hello', 42]))
    runHtml(lazy(viewFn, ['hello', 42]))

    expect(callCount).toBe(1)
  })

  it('recomputes when any arg in the array changes', () => {
    let callCount = 0
    const viewFn = (label: string, count: number) => {
      callCount++
      return Effect.succeed(h('div', {}, [`${label}: ${count}`]))
    }

    const lazy = createLazy()
    runHtml(lazy(viewFn, ['hello', 1]))
    runHtml(lazy(viewFn, ['hello', 2]))

    expect(callCount).toBe(2)
  })

  it('uses referential equality for object args', () => {
    let callCount = 0
    const viewFn = (model: Readonly<{ value: number }>) => {
      callCount++
      return Effect.succeed(h('div', {}, [`${model.value}`]))
    }

    const model = { value: 1 }
    const lazy = createLazy()
    runHtml(lazy(viewFn, [model]))
    runHtml(lazy(viewFn, [model]))

    expect(callCount).toBe(1)
  })

  it('recomputes when object arg is a new reference with same value', () => {
    let callCount = 0
    const viewFn = (model: Readonly<{ value: number }>) => {
      callCount++
      return Effect.succeed(h('div', {}, [`${model.value}`]))
    }

    const lazy = createLazy()
    runHtml(lazy(viewFn, [{ value: 1 }]))
    runHtml(lazy(viewFn, [{ value: 1 }]))

    expect(callCount).toBe(2)
  })

  it('independent lazy instances do not share cache', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return Effect.succeed(h('div', {}, [label]))
    }

    const lazyA = createLazy()
    const lazyB = createLazy()
    runHtml(lazyA(viewFn, ['hello']))
    runHtml(lazyB(viewFn, ['hello']))

    expect(callCount).toBe(2)
  })

  it('handles null VNode from view function', () => {
    let callCount = 0
    const viewFn = () => {
      callCount++
      return Effect.succeed(null)
    }

    const lazy = createLazy()
    const firstResult = runHtml(lazy(viewFn, []))
    const secondResult = runHtml(lazy(viewFn, []))

    expect(callCount).toBe(1)
    expect(firstResult).toBeNull()
    expect(secondResult).toBeNull()
  })

  it('recomputes when dispatch context changes', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return Effect.succeed(h('div', {}, [label]))
    }

    const otherDispatch = Dispatch.of({
      dispatchAsync: () => Effect.void,
      dispatchSync: () => {},
    })

    const lazy = createLazy()
    runHtml(lazy(viewFn, ['hello']))
    Effect.runSync(
      Effect.provideService(lazy(viewFn, ['hello']), Dispatch, otherDispatch),
    )

    expect(callCount).toBe(2)
  })
})

describe('createKeyedLazy', () => {
  it('calls the view function on first render for each key', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return Effect.succeed(h('div', {}, [label]))
    }

    const lazy = createKeyedLazy()
    runHtml(lazy('a', viewFn, ['hello']))
    runHtml(lazy('b', viewFn, ['world']))

    expect(callCount).toBe(2)
  })

  it('caches independently per key', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return Effect.succeed(h('div', {}, [label]))
    }

    const lazy = createKeyedLazy()
    runHtml(lazy('a', viewFn, ['hello']))
    runHtml(lazy('b', viewFn, ['world']))
    runHtml(lazy('a', viewFn, ['hello']))
    runHtml(lazy('b', viewFn, ['world']))

    expect(callCount).toBe(2)
  })

  it('recomputes only the key whose args changed', () => {
    const calls: Array<string> = []
    const viewFn = (label: string) => {
      calls.push(label)
      return Effect.succeed(h('div', {}, [label]))
    }

    const lazy = createKeyedLazy()
    runHtml(lazy('a', viewFn, ['hello']))
    runHtml(lazy('b', viewFn, ['world']))
    runHtml(lazy('a', viewFn, ['hello']))
    runHtml(lazy('b', viewFn, ['changed']))

    expect(calls).toStrictEqual(['hello', 'world', 'changed'])
  })

  it('returns cached VNode reference on cache hit', () => {
    const viewFn = (label: string) => Effect.succeed(h('div', {}, [label]))

    const lazy = createKeyedLazy()
    const first = runHtml(lazy('a', viewFn, ['hello']))
    const second = runHtml(lazy('a', viewFn, ['hello']))

    expect(second).toBe(first)
  })

  it('returns different VNode references on cache miss', () => {
    const viewFn = (active: boolean) =>
      Effect.succeed(h('div', {}, [String(active)]))

    const lazy = createKeyedLazy()
    const first = runHtml(lazy('a', viewFn, [false]))
    const second = runHtml(lazy('a', viewFn, [true]))

    expect(second).not.toBe(first)
  })

  it('recomputes when dispatch context changes', () => {
    let callCount = 0
    const viewFn = (label: string) => {
      callCount++
      return Effect.succeed(h('div', {}, [label]))
    }

    const otherDispatch = Dispatch.of({
      dispatchAsync: () => Effect.void,
      dispatchSync: () => {},
    })

    const lazy = createKeyedLazy()
    runHtml(lazy('a', viewFn, ['hello']))
    Effect.runSync(
      Effect.provideService(
        lazy('a', viewFn, ['hello']),
        Dispatch,
        otherDispatch,
      ),
    )

    expect(callCount).toBe(2)
  })
})
