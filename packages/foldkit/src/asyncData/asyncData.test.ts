import { HashMap, Option, Result, Schema as S, pipe } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { ts } from '../schema/index.js'
import * as AsyncData from './asyncData.js'

type State = AsyncData.AsyncData<number, string>

const idle: State = AsyncData.Idle()
const loading: State = AsyncData.Loading()
const refreshing: State = AsyncData.Refreshing({ data: 1 })
const failure: State = AsyncData.Failure({ error: 'boom' })
const stale: State = AsyncData.Stale({ error: 'boom', data: 1 })
const success: State = AsyncData.Success({ data: 1 })

const allStates: ReadonlyArray<State> = [
  idle,
  loading,
  refreshing,
  failure,
  stale,
  success,
]

const getSome = <A>(option: Option.Option<A>): A =>
  Option.getOrThrowWith(option, () => new Error('expected Some'))

describe('constructors', () => {
  it('build tagged values for each state', () => {
    expect(AsyncData.Idle()).toEqual({ _tag: 'Idle' })
    expect(AsyncData.Loading()).toEqual({ _tag: 'Loading' })
    expect(AsyncData.Refreshing({ data: 1 })).toEqual({
      _tag: 'Refreshing',
      data: 1,
    })
    expect(AsyncData.Failure({ error: 'boom' })).toEqual({
      _tag: 'Failure',
      error: 'boom',
    })
    expect(AsyncData.Stale({ error: 'boom', data: 1 })).toEqual({
      _tag: 'Stale',
      error: 'boom',
      data: 1,
    })
    expect(AsyncData.Success({ data: 1 })).toEqual({
      _tag: 'Success',
      data: 1,
    })
  })

  it('succeed and fail are bare-value aliases', () => {
    expect(AsyncData.succeed(1)).toEqual(AsyncData.Success({ data: 1 }))
    expect(AsyncData.fail('boom')).toEqual(AsyncData.Failure({ error: 'boom' }))
  })
})

describe('Schema', () => {
  const Note = S.Struct({ id: S.String, body: S.String })
  const Notes = AsyncData.Schema(S.Array(Note), S.String)

  const note = { id: '1', body: 'hi' }

  const variants: ReadonlyArray<{
    encoded: unknown
    state: typeof Notes.schema.Type
  }> = [
    { encoded: { _tag: 'Idle' }, state: AsyncData.Idle() },
    { encoded: { _tag: 'Loading' }, state: AsyncData.Loading() },
    {
      encoded: { _tag: 'Refreshing', data: [note] },
      state: AsyncData.Refreshing({ data: [note] }),
    },
    {
      encoded: { _tag: 'Failure', error: 'boom' },
      state: AsyncData.Failure({ error: 'boom' }),
    },
    {
      encoded: { _tag: 'Stale', error: 'boom', data: [note] },
      state: AsyncData.Stale({ error: 'boom', data: [note] }),
    },
    {
      encoded: { _tag: 'Success', data: [note] },
      state: AsyncData.Success({ data: [note] }),
    },
  ]

  it('decodes each encoded variant to the constructed state', () => {
    for (const { encoded, state } of variants) {
      expect(getSome(S.decodeUnknownOption(Notes.schema)(encoded))).toEqual(
        state,
      )
    }
  })

  it('encodes each state back to its wire form', () => {
    for (const { encoded, state } of variants) {
      expect(S.encodeSync(Notes.schema)(state)).toEqual(encoded)
    }
  })

  it('rejects unknown tags', () => {
    const decoded = S.decodeUnknownOption(Notes.schema)({ _tag: 'Ok' })
    expect(Option.isNone(decoded)).toBe(true)
  })

  it('returns Schema-bound constructors that build the same values', () => {
    expect(Notes.Idle()).toEqual(AsyncData.Idle())
    expect(Notes.Loading()).toEqual(AsyncData.Loading())
    expect(Notes.Refreshing({ data: [] })).toEqual(
      AsyncData.Refreshing({ data: [] }),
    )
    expect(Notes.Failure({ error: 'boom' })).toEqual(
      AsyncData.Failure({ error: 'boom' }),
    )
    expect(Notes.Stale({ error: 'boom', data: [] })).toEqual(
      AsyncData.Stale({ error: 'boom', data: [] }),
    )
    expect(Notes.Success({ data: [] })).toEqual(AsyncData.Success({ data: [] }))
  })

  it('embeds in a HashMap codec', () => {
    const Cache = S.HashMap(S.String, Notes.schema)
    const encodedEntries: ReadonlyArray<readonly [string, unknown]> = [
      ['notes:1', { _tag: 'Success', data: [{ id: '1', body: 'hi' }] }],
    ]
    const encodedCache = HashMap.fromIterable(encodedEntries)

    const decoded = getSome(S.decodeUnknownOption(Cache)(encodedCache))
    const entry = getSome(HashMap.get(decoded, 'notes:1'))
    expect(getSome(AsyncData.getData(entry))).toEqual([{ id: '1', body: 'hi' }])

    const reencoded = S.encodeSync(Cache)(decoded)
    expect(HashMap.toEntries(reencoded)).toEqual(encodedEntries)
  })
})

describe('type drift', () => {
  it('keeps AsyncData<A, E> and the Schema union type mutually assignable', () => {
    const factory = AsyncData.Schema(S.Number, S.String)
    type FactoryType = typeof factory.schema.Type

    const RawUnion = S.Union([
      AsyncData.Idle,
      AsyncData.Loading,
      ts('Refreshing', { data: S.Number }),
      ts('Failure', { error: S.String }),
      ts('Stale', { error: S.String, data: S.Number }),
      ts('Success', { data: S.Number }),
    ])
    type RawUnionType = typeof RawUnion.Type

    const factoryToModule = (value: FactoryType): State => value
    const moduleToFactory = (value: State): FactoryType => value
    const rawToModule = (value: RawUnionType): State => value
    const moduleToRaw = (value: State): RawUnionType => value

    expect(moduleToFactory(factoryToModule(success))).toEqual(success)
    expect(moduleToRaw(rawToModule(stale))).toEqual(stale)
  })
})

describe('types', () => {
  const flag: AsyncData.AsyncData<boolean, string> = AsyncData.Success({
    data: true,
  })

  it('map rewrites the data type and preserves the error type', () => {
    const mapped = AsyncData.map(success, data => data > 0)
    expectTypeOf(mapped).toEqualTypeOf<AsyncData.AsyncData<boolean, string>>()
  })

  it('mapError rewrites the error type and preserves the data type', () => {
    const remapped = AsyncData.mapError(failure, error => error.length > 0)
    expectTypeOf(remapped).toEqualTypeOf<AsyncData.AsyncData<number, boolean>>()
  })

  it('mapBoth rewrites both channels', () => {
    const remapped = AsyncData.mapBoth(stale, {
      onData: data => data > 0,
      onError: error => error.length,
    })
    expectTypeOf(remapped).toEqualTypeOf<AsyncData.AsyncData<boolean, number>>()
  })

  it('flatMap widens the error channel to the union of both error types', () => {
    const toFlag = (data: number): AsyncData.AsyncData<boolean, number> =>
      data > 0 ? AsyncData.succeed(data > 1) : AsyncData.fail(404)
    const chained = AsyncData.flatMap(success, toFlag)
    expectTypeOf(chained).toEqualTypeOf<
      AsyncData.AsyncData<boolean, string | number>
    >()
  })

  it('zipWith combines to the result of f under the shared error type', () => {
    const zipped = AsyncData.zipWith(
      success,
      flag,
      (count, isOn) => isOn && count > 0,
    )
    expectTypeOf(zipped).toEqualTypeOf<AsyncData.AsyncData<boolean, string>>()
  })

  it('all over a tuple yields per-index data types', () => {
    const combined = AsyncData.all([success, flag])
    expectTypeOf(combined).toEqualTypeOf<
      AsyncData.AsyncData<[number, boolean], string>
    >()
  })

  it('all over a record yields the struct data type', () => {
    const combined = AsyncData.all({ count: success, isOn: flag })
    expectTypeOf(combined).toEqualTypeOf<
      AsyncData.AsyncData<{ count: number; isOn: boolean }, string>
    >()
  })

  it('all unifies mixed error types into their union', () => {
    const numberError: AsyncData.AsyncData<number, number> = AsyncData.fail(404)
    const combined = AsyncData.all([success, numberError])
    expectTypeOf(combined).toEqualTypeOf<
      AsyncData.AsyncData<[number, number], string | number>
    >()
  })

  it('isSuccess and isStale narrow to the state payload types', () => {
    const state: State = success
    if (AsyncData.isSuccess(state)) {
      expectTypeOf(state.data).toEqualTypeOf<number>()
    }
    if (AsyncData.isStale(state)) {
      expectTypeOf(state.error).toEqualTypeOf<string>()
      expectTypeOf(state.data).toEqualTypeOf<number>()
    }
  })

  it('isAsyncData narrows unknown to AsyncData<unknown, unknown>', () => {
    const input: unknown = success
    if (AsyncData.isAsyncData(input)) {
      expectTypeOf(input).toEqualTypeOf<AsyncData.AsyncData<unknown, unknown>>()
    }
  })

  it('getData and getError return Options of the data and error types', () => {
    expectTypeOf(AsyncData.getData(success)).toEqualTypeOf<
      Option.Option<number>
    >()
    expectTypeOf(AsyncData.getError(success)).toEqualTypeOf<
      Option.Option<string>
    >()
  })

  it('fromOptionOrIdle collapses an Option of AsyncData to the same AsyncData type', () => {
    const maybeNotes: Option.Option<State> = Option.some(success)
    expectTypeOf(AsyncData.fromOptionOrIdle(maybeNotes)).toEqualTypeOf<State>()
  })

  it('matchData and matchDataSplit return the union of handler return types', () => {
    const dataResult = AsyncData.matchData(success, {
      onEmpty: () => null,
      onFailure: error => error.length,
      onData: data => data > 0,
    })
    expectTypeOf(dataResult).toEqualTypeOf<null | number | boolean>()

    const splitResult = AsyncData.matchDataSplit(success, {
      onIdle: () => null,
      onLoading: () => undefined,
      onFailure: error => error.length,
      onData: data => data > 0,
    })
    expectTypeOf(splitResult).toEqualTypeOf<
      null | undefined | number | boolean
    >()
  })

  it('settle returns the same AsyncData type in both dual forms', () => {
    const result: Result.Result<number, string> = Result.succeed(2)
    expectTypeOf(AsyncData.settle(success, result)).toEqualTypeOf<State>()
    expectTypeOf(pipe(success, AsyncData.settle(result))).toEqualTypeOf<State>()
  })

  it('keeps AsyncDataEncoded and the Schema union Encoded type mutually assignable', () => {
    const factory = AsyncData.Schema(S.Number, S.String)
    type FactoryEncoded = typeof factory.schema.Encoded

    const RawUnion = S.Union([
      AsyncData.Idle,
      AsyncData.Loading,
      ts('Refreshing', { data: S.Number }),
      ts('Failure', { error: S.String }),
      ts('Stale', { error: S.String, data: S.Number }),
      ts('Success', { data: S.Number }),
    ])
    type RawEncoded = typeof RawUnion.Encoded
    type Wire = AsyncData.AsyncDataEncoded<number, string>

    const factoryToWire = (value: FactoryEncoded): Wire => value
    const wireToFactory = (value: Wire): FactoryEncoded => value
    const rawToWire = (value: RawEncoded): Wire => value
    const wireToRaw = (value: Wire): RawEncoded => value

    const wireStale: Wire = { _tag: 'Stale', error: 'boom', data: 1 }
    expect(wireToFactory(factoryToWire(wireStale))).toEqual(wireStale)
    expect(rawToWire(wireToRaw(wireStale))).toEqual(wireStale)
  })
})

describe('match', () => {
  it('dispatches each state to its tag-named handler with the unwrapped payload', () => {
    const describeState = AsyncData.match<number, string, string>({
      onIdle: () => 'idle',
      onLoading: () => 'loading',
      onRefreshing: data => `refreshing:${data}`,
      onFailure: error => `failure:${error}`,
      onStale: ({ error, data }) => `stale:${error}:${data}`,
      onSuccess: data => `success:${data}`,
    })

    expect(describeState(idle)).toBe('idle')
    expect(describeState(loading)).toBe('loading')
    expect(describeState(refreshing)).toBe('refreshing:1')
    expect(describeState(failure)).toBe('failure:boom')
    expect(describeState(stale)).toBe('stale:boom:1')
    expect(describeState(success)).toBe('success:1')
  })

  it('supports heterogeneous handler return types data-first', () => {
    const result = AsyncData.match(success, {
      onIdle: () => 'idle',
      onLoading: () => 'loading',
      onRefreshing: data => data,
      onFailure: error => error,
      onStale: ({ data }) => data,
      onSuccess: data => data,
    })
    expect(result).toBe(1)
  })
})

describe('matchData', () => {
  const describeState = (state: State) =>
    AsyncData.matchData(state, {
      onEmpty: () => 'empty',
      onFailure: error => `failure:${error}`,
      onData: data => `data:${data}`,
    })

  it('routes Success, Refreshing, and Stale to onData with the held data', () => {
    expect(describeState(success)).toBe('data:1')
    expect(describeState(refreshing)).toBe('data:1')
    expect(describeState(stale)).toBe('data:1')
  })

  it('routes Failure to onFailure with the error', () => {
    expect(describeState(failure)).toBe('failure:boom')
  })

  it('routes Idle and Loading to onEmpty', () => {
    expect(describeState(idle)).toBe('empty')
    expect(describeState(loading)).toBe('empty')
  })

  it('supports data-last usage in pipe', () => {
    expect(
      pipe(
        stale,
        AsyncData.matchData({
          onEmpty: () => 'empty',
          onFailure: error => `failure:${error}`,
          onData: data => `data:${data}`,
        }),
      ),
    ).toBe('data:1')
  })
})

describe('matchDataSplit', () => {
  const describeState = (state: State) =>
    AsyncData.matchDataSplit(state, {
      onIdle: () => 'idle',
      onLoading: () => 'loading',
      onFailure: error => `failure:${error}`,
      onData: data => `data:${data}`,
    })

  it('routes Success, Refreshing, and Stale to onData with the held data', () => {
    expect(describeState(success)).toBe('data:1')
    expect(describeState(refreshing)).toBe('data:1')
    expect(describeState(stale)).toBe('data:1')
  })

  it('routes Failure to onFailure with the error', () => {
    expect(describeState(failure)).toBe('failure:boom')
  })

  it('splits the cold states: Idle to onIdle and Loading to onLoading', () => {
    expect(describeState(idle)).toBe('idle')
    expect(describeState(loading)).toBe('loading')
  })

  it('supports data-last usage in pipe', () => {
    expect(
      pipe(
        stale,
        AsyncData.matchDataSplit({
          onIdle: () => 'idle',
          onLoading: () => 'loading',
          onFailure: error => `failure:${error}`,
          onData: data => `data:${data}`,
        }),
      ),
    ).toBe('data:1')
  })
})

describe('map', () => {
  const doubled = (state: State) => AsyncData.map(state, data => data * 2)

  it('maps all three data-bearing states, preserving each tag', () => {
    expect(doubled(refreshing)).toEqual(AsyncData.Refreshing({ data: 2 }))
    expect(doubled(stale)).toEqual(AsyncData.Stale({ error: 'boom', data: 2 }))
    expect(doubled(success)).toEqual(AsyncData.Success({ data: 2 }))
  })

  it('passes the no-data states through unchanged', () => {
    expect(doubled(idle)).toEqual(idle)
    expect(doubled(loading)).toEqual(loading)
    expect(doubled(failure)).toEqual(failure)
  })

  it('supports data-last usage in pipe', () => {
    expect(
      pipe(
        success,
        AsyncData.map(data => data + 10),
      ),
    ).toEqual(AsyncData.Success({ data: 11 }))
  })
})

describe('mapError', () => {
  const shouted = (state: State) =>
    AsyncData.mapError(state, error => error.toUpperCase())

  it('maps Failure and Stale, keeping Stale data', () => {
    expect(shouted(failure)).toEqual(AsyncData.Failure({ error: 'BOOM' }))
    expect(shouted(stale)).toEqual(AsyncData.Stale({ error: 'BOOM', data: 1 }))
  })

  it('passes every other state through unchanged', () => {
    expect(shouted(idle)).toEqual(idle)
    expect(shouted(loading)).toEqual(loading)
    expect(shouted(refreshing)).toEqual(refreshing)
    expect(shouted(success)).toEqual(success)
  })
})

describe('mapBoth', () => {
  const transformed = (state: State) =>
    AsyncData.mapBoth(state, {
      onData: data => data * 2,
      onError: error => error.toUpperCase(),
    })

  it('applies onData to Refreshing and Success', () => {
    expect(transformed(refreshing)).toEqual(AsyncData.Refreshing({ data: 2 }))
    expect(transformed(success)).toEqual(AsyncData.Success({ data: 2 }))
  })

  it('applies onError to Failure', () => {
    expect(transformed(failure)).toEqual(AsyncData.Failure({ error: 'BOOM' }))
  })

  it('applies both handlers to Stale', () => {
    expect(transformed(stale)).toEqual(
      AsyncData.Stale({ error: 'BOOM', data: 2 }),
    )
  })

  it('passes Idle and Loading through unchanged', () => {
    expect(transformed(idle)).toEqual(idle)
    expect(transformed(loading)).toEqual(loading)
  })
})

describe('flatMap', () => {
  const settleDoubled = (state: State) =>
    AsyncData.flatMap(state, data => AsyncData.succeed(data * 2))

  it('returns f(data) as-is for every data-bearing state', () => {
    expect(settleDoubled(refreshing)).toEqual(AsyncData.Success({ data: 2 }))
    expect(settleDoubled(stale)).toEqual(AsyncData.Success({ data: 2 }))
    expect(settleDoubled(success)).toEqual(AsyncData.Success({ data: 2 }))
  })

  it('passes the no-data states through unchanged', () => {
    expect(settleDoubled(idle)).toEqual(idle)
    expect(settleDoubled(loading)).toEqual(loading)
    expect(settleDoubled(failure)).toEqual(failure)
  })
})

describe('getData', () => {
  it('returns Some for Success, Refreshing, and Stale', () => {
    expect(AsyncData.getData(success)).toEqual(Option.some(1))
    expect(AsyncData.getData(refreshing)).toEqual(Option.some(1))
    expect(AsyncData.getData(stale)).toEqual(Option.some(1))
  })

  it('returns None for Idle, Loading, and Failure', () => {
    expect(Option.isNone(AsyncData.getData(idle))).toBe(true)
    expect(Option.isNone(AsyncData.getData(loading))).toBe(true)
    expect(Option.isNone(AsyncData.getData(failure))).toBe(true)
  })
})

describe('getError', () => {
  it('returns Some for Failure and Stale', () => {
    expect(AsyncData.getError(failure)).toEqual(Option.some('boom'))
    expect(AsyncData.getError(stale)).toEqual(Option.some('boom'))
  })

  it('returns None for every other state', () => {
    expect(Option.isNone(AsyncData.getError(idle))).toBe(true)
    expect(Option.isNone(AsyncData.getError(loading))).toBe(true)
    expect(Option.isNone(AsyncData.getError(refreshing))).toBe(true)
    expect(Option.isNone(AsyncData.getError(success))).toBe(true)
  })
})

describe('getOrElse', () => {
  it('returns the data for data-bearing states', () => {
    expect(AsyncData.getOrElse(success, () => 0)).toBe(1)
    expect(AsyncData.getOrElse(refreshing, () => 0)).toBe(1)
    expect(AsyncData.getOrElse(stale, () => 0)).toBe(1)
  })

  it('returns the fallback for no-data states', () => {
    expect(AsyncData.getOrElse(idle, () => 0)).toBe(0)
    expect(AsyncData.getOrElse(loading, () => 0)).toBe(0)
    expect(AsyncData.getOrElse(failure, () => 0)).toBe(0)
  })

  it('supports data-last usage in pipe', () => {
    expect(
      pipe(
        stale,
        AsyncData.getOrElse(() => 0),
      ),
    ).toBe(1)
  })
})

describe('fromOptionOrIdle', () => {
  it('returns the entry when the Option holds one', () => {
    expect(AsyncData.fromOptionOrIdle(Option.some(success))).toBe(success)
    expect(AsyncData.fromOptionOrIdle(Option.some(stale))).toBe(stale)
  })

  it('collapses a missing keyed-cache entry to Idle', () => {
    const cache = HashMap.empty<string, State>()
    expect(AsyncData.fromOptionOrIdle(HashMap.get(cache, 'notes:1'))).toEqual(
      AsyncData.Idle(),
    )
  })
})

describe('predicates', () => {
  it('each tag predicate is true only for its own state', () => {
    expect(allStates.map(AsyncData.isIdle)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ])
    expect(allStates.map(AsyncData.isLoading)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
    ])
    expect(allStates.map(AsyncData.isRefreshing)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
    ])
    expect(allStates.map(AsyncData.isFailure)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
    ])
    expect(allStates.map(AsyncData.isStale)).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
    ])
    expect(allStates.map(AsyncData.isSuccess)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
    ])
  })

  it('hasData is true for Success, Refreshing, and Stale only', () => {
    expect(allStates.map(AsyncData.hasData)).toEqual([
      false,
      false,
      true,
      false,
      true,
      true,
    ])
  })

  it('hasError is true for Failure and Stale only', () => {
    expect(allStates.map(AsyncData.hasError)).toEqual([
      false,
      false,
      false,
      true,
      true,
      false,
    ])
  })

  it('isPending is true for Loading and Refreshing only', () => {
    expect(allStates.map(AsyncData.isPending)).toEqual([
      false,
      true,
      true,
      false,
      false,
      false,
    ])
  })
})

describe('isAsyncData', () => {
  it('returns true for every state', () => {
    for (const state of allStates) {
      expect(AsyncData.isAsyncData(state)).toBe(true)
    }
  })

  it('returns false for non-states', () => {
    expect(AsyncData.isAsyncData(null)).toBe(false)
    expect(AsyncData.isAsyncData(undefined)).toBe(false)
    expect(AsyncData.isAsyncData(42)).toBe(false)
    expect(AsyncData.isAsyncData('Success')).toBe(false)
    expect(AsyncData.isAsyncData({})).toBe(false)
    expect(AsyncData.isAsyncData({ _tag: 'Ok' })).toBe(false)
  })
})

describe('orElse', () => {
  const fallback = () => AsyncData.Success<number>({ data: 99 })

  it('keeps self when it holds data', () => {
    expect(AsyncData.orElse(success, fallback)).toBe(success)
    expect(AsyncData.orElse(refreshing, fallback)).toBe(refreshing)
    expect(AsyncData.orElse(stale, fallback)).toBe(stale)
  })

  it('recovers to that() for the no-data states', () => {
    expect(AsyncData.orElse(idle, fallback)).toEqual(
      AsyncData.Success({ data: 99 }),
    )
    expect(AsyncData.orElse(loading, fallback)).toEqual(
      AsyncData.Success({ data: 99 }),
    )
    expect(AsyncData.orElse(failure, fallback)).toEqual(
      AsyncData.Success({ data: 99 }),
    )
  })
})

describe('revalidateOrLoad', () => {
  it('starts Loading from the cold no-data states', () => {
    expect(getSome(AsyncData.revalidateOrLoad(idle))).toEqual(
      AsyncData.Loading(),
    )
    expect(getSome(AsyncData.revalidateOrLoad(failure))).toEqual(
      AsyncData.Loading(),
    )
  })

  it('yields None for already-pending states', () => {
    expect(Option.isNone(AsyncData.revalidateOrLoad(loading))).toBe(true)
    expect(Option.isNone(AsyncData.revalidateOrLoad(refreshing))).toBe(true)
  })

  it('revalidates both data-bearing loaded states to Refreshing', () => {
    expect(getSome(AsyncData.revalidateOrLoad(success))).toEqual(
      AsyncData.Refreshing({ data: 1 }),
    )
    expect(getSome(AsyncData.revalidateOrLoad(stale))).toEqual(
      AsyncData.Refreshing({ data: 1 }),
    )
  })
})

describe('revalidate', () => {
  it('moves Success and Stale to Refreshing', () => {
    expect(getSome(AsyncData.revalidate(success))).toEqual(
      AsyncData.Refreshing({ data: 1 }),
    )
    expect(getSome(AsyncData.revalidate(stale))).toEqual(
      AsyncData.Refreshing({ data: 1 }),
    )
  })

  it('yields None for every other state', () => {
    expect(Option.isNone(AsyncData.revalidate(idle))).toBe(true)
    expect(Option.isNone(AsyncData.revalidate(loading))).toBe(true)
    expect(Option.isNone(AsyncData.revalidate(refreshing))).toBe(true)
    expect(Option.isNone(AsyncData.revalidate(failure))).toBe(true)
  })
})

describe('zipWith', () => {
  const add = (selfData: number, thatData: number) => selfData + thatData

  it('combines two Successes into a Success', () => {
    expect(AsyncData.zipWith(success, AsyncData.succeed(2), add)).toEqual(
      AsyncData.Success({ data: 3 }),
    )
  })

  it('any no-data input blocks the combine and discards the other data', () => {
    expect(AsyncData.zipWith(idle, success, add)).toEqual(idle)
    expect(AsyncData.zipWith(success, loading, add)).toEqual(loading)
    expect(AsyncData.zipWith(failure, success, add)).toEqual(failure)
    expect(AsyncData.zipWith(stale, loading, add)).toEqual(loading)
  })

  it('Failure dominates Loading, which dominates Idle', () => {
    expect(AsyncData.zipWith(loading, failure, add)).toEqual(failure)
    expect(AsyncData.zipWith(idle, loading, add)).toEqual(loading)
    expect(AsyncData.zipWith(idle, failure, add)).toEqual(failure)
  })

  it('keeps the left error when both sides are Failure', () => {
    const otherFailure: State = AsyncData.Failure({ error: 'other' })
    expect(AsyncData.zipWith(failure, otherFailure, add)).toEqual(failure)
  })

  it('tags the combined data Stale over Refreshing over Success', () => {
    expect(AsyncData.zipWith(stale, refreshing, add)).toEqual(
      AsyncData.Stale({ error: 'boom', data: 2 }),
    )
    expect(AsyncData.zipWith(refreshing, success, add)).toEqual(
      AsyncData.Refreshing({ data: 2 }),
    )
    expect(AsyncData.zipWith(stale, success, add)).toEqual(
      AsyncData.Stale({ error: 'boom', data: 2 }),
    )
  })

  it('takes the that-side error when only that is Stale', () => {
    const otherStale: State = AsyncData.Stale({ error: 'other', data: 2 })
    expect(AsyncData.zipWith(success, otherStale, add)).toEqual(
      AsyncData.Stale({ error: 'other', data: 3 }),
    )
  })

  it('keeps the left error when both sides are Stale', () => {
    const otherStale: State = AsyncData.Stale({ error: 'other', data: 2 })
    expect(AsyncData.zipWith(stale, otherStale, add)).toEqual(
      AsyncData.Stale({ error: 'boom', data: 3 }),
    )
  })

  it('supports data-last usage in pipe', () => {
    expect(pipe(success, AsyncData.zipWith(refreshing, add))).toEqual(
      AsyncData.Refreshing({ data: 2 }),
    )
  })
})

describe('all', () => {
  it('collects an iterable of Successes into an in-order array', () => {
    expect(
      AsyncData.all([success, AsyncData.succeed(2), AsyncData.succeed(3)]),
    ).toEqual(AsyncData.Success({ data: [1, 2, 3] }))
  })

  it('yields Success of an empty array for an empty iterable', () => {
    const states: ReadonlyArray<State> = []
    expect(AsyncData.all(states)).toEqual(AsyncData.Success({ data: [] }))
  })

  it('blocks on the highest-ranked no-data state', () => {
    expect(AsyncData.all([success, idle, loading])).toEqual(loading)
    expect(AsyncData.all([loading, idle, failure])).toEqual(failure)
    expect(AsyncData.all([success, idle])).toEqual(idle)
    expect(AsyncData.all([stale, loading])).toEqual(loading)
  })

  it('takes the leftmost Failure error', () => {
    const otherFailure: State = AsyncData.Failure({ error: 'other' })
    expect(AsyncData.all([loading, failure, otherFailure])).toEqual(failure)
  })

  it('any Stale in an all-data set makes the result Stale with the leftmost Stale error', () => {
    const otherStale: State = AsyncData.Stale({ error: 'other', data: 2 })
    expect(AsyncData.all([success, stale, otherStale])).toEqual(
      AsyncData.Stale({ error: 'boom', data: [1, 1, 2] }),
    )
  })

  it('any Refreshing in an all-data set without Stale makes the result Refreshing', () => {
    expect(AsyncData.all([success, refreshing])).toEqual(
      AsyncData.Refreshing({ data: [1, 1] }),
    )
  })

  it('combines a record into a struct', () => {
    expect(
      AsyncData.all({ count: success, doubled: AsyncData.succeed(2) }),
    ).toEqual(AsyncData.Success({ data: { count: 1, doubled: 2 } }))
  })

  it('tags a combined record by the highest-ranked data state', () => {
    expect(AsyncData.all({ user: success, orders: refreshing })).toEqual(
      AsyncData.Refreshing({ data: { user: 1, orders: 1 } }),
    )
  })

  it('collapses a record to the highest-ranked no-data field', () => {
    expect(
      AsyncData.all({ user: success, orders: failure, prefs: loading }),
    ).toEqual(failure)
  })

  it('yields Success of an empty struct for an empty record', () => {
    const states: Record<string, State> = {}
    expect(AsyncData.all(states)).toEqual(AsyncData.Success({ data: {} }))
  })
})

describe('settle', () => {
  it('a Result success settles to Success regardless of the previous state', () => {
    expect(AsyncData.settle(loading, Result.succeed(2))).toEqual(
      AsyncData.Success({ data: 2 }),
    )
    expect(AsyncData.settle(stale, Result.succeed(2))).toEqual(
      AsyncData.Success({ data: 2 }),
    )
  })

  it('a Result failure keeps the last good data as Stale', () => {
    expect(AsyncData.settle(refreshing, Result.fail('nope'))).toEqual(
      AsyncData.Stale({ error: 'nope', data: 1 }),
    )
    expect(AsyncData.settle(success, Result.fail('nope'))).toEqual(
      AsyncData.Stale({ error: 'nope', data: 1 }),
    )
    expect(AsyncData.settle(stale, Result.fail('nope'))).toEqual(
      AsyncData.Stale({ error: 'nope', data: 1 }),
    )
  })

  it('a Result failure without prior data becomes a bare Failure', () => {
    expect(AsyncData.settle(idle, Result.fail('nope'))).toEqual(
      AsyncData.Failure({ error: 'nope' }),
    )
    expect(AsyncData.settle(loading, Result.fail('nope'))).toEqual(
      AsyncData.Failure({ error: 'nope' }),
    )
    expect(AsyncData.settle(failure, Result.fail('nope'))).toEqual(
      AsyncData.Failure({ error: 'nope' }),
    )
  })

  it('supports data-last usage in pipe', () => {
    const settledFailure: Result.Result<number, string> = Result.fail('nope')
    expect(pipe(refreshing, AsyncData.settle(settledFailure))).toEqual(
      AsyncData.Stale({ error: 'nope', data: 1 }),
    )
  })
})
