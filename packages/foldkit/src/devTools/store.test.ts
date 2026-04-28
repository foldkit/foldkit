import {
  Array,
  Effect,
  HashSet,
  Match,
  Option,
  Schema,
  SubscriptionRef,
  pipe,
} from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { m } from '../message/index.js'
import {
  type Bridge,
  type DevToolsStore,
  computeDiff,
  createDevToolsStore,
} from './store.js'

const hasPath = (paths: HashSet.HashSet<string>, path: string) =>
  HashSet.has(paths, path)

describe('computeDiff', () => {
  it('returns empty diff for identical references', () => {
    const model = { count: 0 }
    const { changedPaths, affectedPaths } = computeDiff(model, model)

    expect(HashSet.size(changedPaths)).toBe(0)
    expect(HashSet.size(affectedPaths)).toBe(0)
  })

  it('returns empty diff for structurally identical objects', () => {
    const { changedPaths } = computeDiff({ count: 5 }, { count: 5 })

    expect(HashSet.size(changedPaths)).toBe(0)
  })

  it('detects changed primitive fields', () => {
    const { changedPaths, affectedPaths } = computeDiff(
      { count: 0 },
      { count: 1 },
    )

    expect(hasPath(changedPaths, 'root.count')).toBe(true)
    expect(hasPath(affectedPaths, 'root')).toBe(true)
  })

  it('detects nested field changes', () => {
    const { changedPaths, affectedPaths } = computeDiff(
      { user: { name: 'Alice', age: 30 } },
      { user: { name: 'Bob', age: 30 } },
    )

    expect(hasPath(changedPaths, 'root.user.name')).toBe(true)
    expect(hasPath(changedPaths, 'root.user.age')).toBe(false)
    expect(hasPath(affectedPaths, 'root.user')).toBe(true)
    expect(hasPath(affectedPaths, 'root')).toBe(true)
  })

  it('detects array element changes', () => {
    const { changedPaths } = computeDiff(
      { items: [1, 2, 3] },
      { items: [1, 99, 3] },
    )

    expect(hasPath(changedPaths, 'root.items.1')).toBe(true)
    expect(hasPath(changedPaths, 'root.items.0')).toBe(false)
    expect(hasPath(changedPaths, 'root.items.2')).toBe(false)
  })

  it('detects added fields', () => {
    const { changedPaths } = computeDiff({ a: 1 }, { a: 1, b: 2 })

    expect(hasPath(changedPaths, 'root.b')).toBe(true)
    expect(hasPath(changedPaths, 'root.a')).toBe(false)
  })

  it('handles Option transitions', () => {
    const { changedPaths, affectedPaths } = computeDiff(
      { value: Option.none() },
      { value: Option.some(42) },
    )

    expect(hasPath(changedPaths, 'root.value.value')).toBe(true)
    expect(hasPath(affectedPaths, 'root.value')).toBe(true)
  })
})

const initialModel = { count: 0 }

const CounterModel = Schema.Struct({ count: Schema.Number })

const ClickedIncrement = m('ClickedIncrement')
const ClickedDecrement = m('ClickedDecrement')

const CounterMessage = Schema.Union(ClickedIncrement, ClickedDecrement)

const counterReplay = (model: unknown, message: unknown): unknown => {
  const { count } = Schema.decodeUnknownSync(CounterModel)(model)

  return pipe(
    message,
    Schema.decodeUnknownSync(CounterMessage),
    Match.value,
    Match.tagsExhaustive({
      ClickedIncrement: () => ({ count: count + 1 }),
      ClickedDecrement: () => ({ count: count - 1 }),
    }),
  )
}

const makeBridge = (
  overrides?: Partial<Bridge>,
): Readonly<{ bridge: Bridge; rendered: Array<unknown> }> => {
  const rendered: Array<unknown> = []

  const bridge: Bridge = {
    replay: counterReplay,
    render: (model: unknown) =>
      Effect.sync(() => {
        rendered.push(model)
      }),
    getCurrentModel: Effect.succeed(initialModel),
    ...overrides,
  }

  return { bridge, rendered }
}

const clickedIncrement = ClickedIncrement()
const clickedDecrement = ClickedDecrement()

const run = <A>(effect: Effect.Effect<A>): A => Effect.runSync(effect)

const getState = (store: DevToolsStore) =>
  run(SubscriptionRef.get(store.stateRef))

const makeStore = (overrides?: Partial<Bridge>, maxEntries?: number) => {
  const { bridge, rendered } = makeBridge(overrides)
  const store = run(createDevToolsStore(bridge, maxEntries))
  run(store.recordInit(initialModel))
  return { bridge, store, rendered }
}

const recordIncrements = (store: DevToolsStore, count: number) =>
  pipe(
    Array.range(1, count),
    Effect.forEach(index =>
      store.recordMessage(
        clickedIncrement,
        { count: index - 1 },
        { count: index },
        [],
        true,
      ),
    ),
    run,
  )

describe('DevToolsStore', () => {
  describe('recordInit', () => {
    it('stores the initial model as the first keyframe', () => {
      const { store } = makeStore()

      const state = getState(store)
      expect(state.entries.length).toBe(0)
      expect(run(store.getModelAtIndex(0))).toEqual(initialModel)
    })
  })

  describe('recordMessage', () => {
    it('records messages and replays to compute models', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          { count: 0 },
          { count: 1 },
          [],
          true,
        ),
      )
      run(
        store.recordMessage(
          clickedIncrement,
          { count: 1 },
          { count: 2 },
          [],
          true,
        ),
      )
      run(
        store.recordMessage(
          clickedDecrement,
          { count: 2 },
          { count: 1 },
          [],
          true,
        ),
      )

      const state = getState(store)
      expect(state.entries.length).toBe(3)
      expect(run(store.getModelAtIndex(0))).toEqual({ count: 1 })
      expect(run(store.getModelAtIndex(1))).toEqual({ count: 2 })
      expect(run(store.getModelAtIndex(2))).toEqual({ count: 1 })
    })

    it('records command tags', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          ['FetchData', 'LockScroll', 'FocusButton'],
          true,
        ),
      )

      const state = getState(store)
      expect(state.entries[0]?.commandNames).toEqual([
        'FetchData',
        'LockScroll',
        'FocusButton',
      ])
    })

    it('stores message tags', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          true,
        ),
      )
      run(
        store.recordMessage(
          clickedDecrement,
          { count: 1 },
          { count: 0 },
          [],
          true,
        ),
      )

      const state = getState(store)
      expect(state.entries[0]?.tag).toBe('ClickedIncrement')
      expect(state.entries[1]?.tag).toBe('ClickedDecrement')
    })
  })

  describe('keyframes', () => {
    it('creates keyframes at interval boundaries for fast replay', () => {
      const { bridge, store } = makeStore()
      const replaySpy = vi.spyOn(bridge, 'replay')

      recordIncrements(store, 35)
      replaySpy.mockClear()

      const model = run(store.getModelAtIndex(33))
      expect(model).toEqual({ count: 34 })
      expect(replaySpy).toHaveBeenCalledTimes(3)
    })

    it('replays from init keyframe for early indices', () => {
      const { bridge, store } = makeStore()
      const replaySpy = vi.spyOn(bridge, 'replay')

      recordIncrements(store, 35)
      replaySpy.mockClear()

      const model = run(store.getModelAtIndex(5))
      expect(model).toEqual({ count: 6 })
      expect(replaySpy).toHaveBeenCalledTimes(6)
    })
  })

  describe('eviction', () => {
    it('evicts oldest segment when exceeding max entries', () => {
      const { store } = makeStore(undefined, 50)

      recordIncrements(store, 55)

      const state = getState(store)
      expect(state.startIndex).toBe(31)
      expect(state.entries.length).toBe(24)

      const model = run(store.getModelAtIndex(40))
      expect(model).toEqual({ count: 41 })
    })

    it('auto-resumes when paused index is evicted', () => {
      const { store } = makeStore(undefined, 50)

      recordIncrements(store, 10)
      run(store.jumpTo(5))
      expect(getState(store).isPaused).toBe(true)

      recordIncrements(store, 45)

      expect(getState(store).isPaused).toBe(false)
    })
  })

  describe('time travel', () => {
    it('renders the initial model when jumping to init', () => {
      const { store, rendered } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          true,
        ),
      )
      run(
        store.recordMessage(
          clickedIncrement,
          { count: 1 },
          { count: 2 },
          [],
          true,
        ),
      )

      run(store.jumpTo(-1))

      const state = getState(store)
      expect(state.isPaused).toBe(true)
      expect(state.pausedAtIndex).toBe(-1)
      expect(rendered[rendered.length - 1]).toEqual(initialModel)
    })

    it('preserves init pause through eviction', () => {
      const { store } = makeStore(undefined, 50)

      run(store.jumpTo(-1))
      expect(getState(store).isPaused).toBe(true)

      recordIncrements(store, 55)

      const state = getState(store)
      expect(state.isPaused).toBe(true)
      expect(state.pausedAtIndex).toBe(-1)
    })

    it('renders the historical model when jumping', () => {
      const { store, rendered } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          true,
        ),
      )
      run(
        store.recordMessage(
          clickedIncrement,
          { count: 1 },
          { count: 2 },
          [],
          true,
        ),
      )
      run(
        store.recordMessage(
          clickedIncrement,
          { count: 2 },
          { count: 3 },
          [],
          true,
        ),
      )

      run(store.jumpTo(1))

      const state = getState(store)
      expect(state.isPaused).toBe(true)
      expect(state.pausedAtIndex).toBe(1)
      expect(rendered[rendered.length - 1]).toEqual({ count: 2 })
    })

    it('renders the live model when resuming', () => {
      const currentModel = { count: 10 }
      const { store, rendered } = makeStore({
        getCurrentModel: Effect.succeed(currentModel),
      })

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          true,
        ),
      )

      run(store.jumpTo(0))
      run(store.resume)

      expect(getState(store).isPaused).toBe(false)
      expect(rendered[rendered.length - 1]).toEqual(currentModel)
    })
  })

  describe('getMessageAtIndex', () => {
    it('returns the message at a valid index', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          true,
        ),
      )
      run(
        store.recordMessage(
          clickedDecrement,
          { count: 1 },
          { count: 0 },
          [],
          true,
        ),
      )

      const message = run(store.getMessageAtIndex(1))
      expect(message).toEqual(Option.some(clickedDecrement))
    })

    it('returns none for the init index', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          true,
        ),
      )

      const message = run(store.getMessageAtIndex(-1))
      expect(message).toEqual(Option.none())
    })

    it('returns none for an out-of-range index', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          true,
        ),
      )

      const message = run(store.getMessageAtIndex(99))
      expect(message).toEqual(Option.none())
    })

    it('applies startIndex offset after eviction', () => {
      const { store } = makeStore(undefined, 50)

      recordIncrements(store, 55)

      const state = getState(store)
      const lastIndex = state.startIndex + state.entries.length - 1

      const message = run(store.getMessageAtIndex(lastIndex))
      expect(message).toEqual(Option.some(clickedIncrement))
    })
  })

  describe('isModelChanged', () => {
    it('stores false when the model did not change', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          false,
        ),
      )

      const state = getState(store)
      expect(state.entries[0]?.isModelChanged).toBe(false)
    })

    it('stores false when reference changed but values are identical', () => {
      const { store } = makeStore()

      const before = { count: 5 }
      const after = { count: 5 }

      run(store.recordMessage(clickedIncrement, before, after, [], true))

      const state = getState(store)
      expect(state.entries[0]?.isModelChanged).toBe(false)
    })

    it('stores true when values actually differ', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          { count: 0 },
          { count: 1 },
          [],
          true,
        ),
      )

      const state = getState(store)
      expect(state.entries[0]?.isModelChanged).toBe(true)
    })
  })

  describe('clear', () => {
    it('resets all state', () => {
      const { store } = makeStore()

      run(
        store.recordMessage(
          clickedIncrement,
          initialModel,
          { count: 1 },
          [],
          true,
        ),
      )
      run(
        store.recordMessage(
          clickedIncrement,
          { count: 1 },
          { count: 2 },
          [],
          true,
        ),
      )
      run(store.jumpTo(0))

      run(store.clear)

      const state = getState(store)
      expect(state.entries.length).toBe(0)
      expect(state.startIndex).toBe(0)
      expect(state.isPaused).toBe(false)
    })
  })
})
