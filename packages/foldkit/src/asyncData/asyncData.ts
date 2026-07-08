import {
  Array,
  Function,
  Match as M,
  Option,
  Predicate,
  Result,
  Schema as S,
} from 'effect'

import { ts } from '../schema/index.js'

// STATE

/** The `Idle` state: nothing requested yet. */
export type Idle = Readonly<{ _tag: 'Idle' }>

/** The `Loading` state: first request in flight, no prior data. */
export type Loading = Readonly<{ _tag: 'Loading' }>

/** The `Refreshing` state: reloading while holding the previous good data. */
export type Refreshing<A> = Readonly<{ _tag: 'Refreshing'; data: A }>

/** The `Failure` state: request failed, showing the failure. */
export type Failure<E> = Readonly<{ _tag: 'Failure'; error: E }>

/** The `Stale` state: the last refresh failed, still holding the previous
 *  good data. The failed-refresh mirror of `Refreshing`. */
export type Stale<A, E> = Readonly<{ _tag: 'Stale'; error: E; data: A }>

/** The `Success` state: request succeeded, data present. */
export type Success<A> = Readonly<{ _tag: 'Success'; data: A }>

/** The six-state union for an asynchronously loaded value: `Idle | Loading
 *  | Refreshing(data) | Failure(error) | Stale(error, data) | Success(data)`.
 *  Value-first type parameters, matching `Result<A, E>` and `Exit<A, E>`.
 *
 *  `Refreshing` and `Stale` make stale-while-revalidate and
 *  stale-on-failure first-class states: both hold the previous good `data`,
 *  `Refreshing` while a reload is in flight, `Stale` after a reload failed.
 *
 *  Data-presence classification, used throughout the module:
 *
 *  - "has data" states: `Success`, `Refreshing`, `Stale`.
 *  - "no data" states: `Idle`, `Loading`, `Failure`.
 *  - "pending" states (a request in flight): `Loading`, `Refreshing` only.
 *    `Stale` is not pending; its fetch already failed.
 *
 *  Naming rule: predicates are tag-named (`isSuccess`, `isFailure`) but
 *  getters are payload-named (`getData`, `getError`) because `getData` spans
 *  three tags (`Success`, `Refreshing`, `Stale`) and `getError` spans two
 *  (`Failure`, `Stale`). Handler keys are tag-named where dispatch is per tag
 *  (`match`) and channel-named where one handler covers multiple tags
 *  (`matchData`, `mapBoth`). */
export type AsyncData<A, E> =
  | Idle
  | Loading
  | Refreshing<A>
  | Failure<E>
  | Stale<A, E>
  | Success<A>

/** Constructs the `Idle` state. A parameter-free callable Schema, so it can
 *  also serve as a Union member. */
export const Idle = ts('Idle')

/** Constructs the `Loading` state. A parameter-free callable Schema, so it
 *  can also serve as a Union member. */
export const Loading = ts('Loading')

/** Constructs a `Refreshing` state holding the previous good data. Plain
 *  value builder, generic in `A`; use the `Schema` factory's `Refreshing`
 *  for a Schema-bound constructor. */
export const Refreshing = <A>(
  payload: Readonly<{ data: A }>,
): AsyncData<A, never> => ({
  _tag: 'Refreshing',
  data: payload.data,
})

/** Constructs a `Failure` state carrying the error only. Plain value
 *  builder, generic in `E`; use the `Schema` factory's `Failure` for a
 *  Schema-bound constructor. */
export const Failure = <E>(
  payload: Readonly<{ error: E }>,
): AsyncData<never, E> => ({
  _tag: 'Failure',
  error: payload.error,
})

/** Constructs a `Stale` state carrying both the refresh error and the
 *  last good data. Plain value builder, generic in `A` and `E`; use the
 *  `Schema` factory's `Stale` for a Schema-bound constructor. */
export const Stale = <A, E>(
  payload: Readonly<{ error: E; data: A }>,
): AsyncData<A, E> => ({
  _tag: 'Stale',
  error: payload.error,
  data: payload.data,
})

/** Constructs a `Success` state holding the data. Plain value builder,
 *  generic in `A`; use the `Schema` factory's `Success` for a Schema-bound
 *  constructor. */
export const Success = <A>(
  payload: Readonly<{ data: A }>,
): AsyncData<A, never> => ({
  _tag: 'Success',
  data: payload.data,
})

/** Bare-value alias for `Success({ data })`, mirroring `Result.succeed`. */
export const succeed = <A, E = never>(data: A): AsyncData<A, E> =>
  Success({ data })

/** Bare-value alias for `Failure({ error })`, mirroring `Result.fail`. */
export const fail = <E, A = never>(error: E): AsyncData<A, E> =>
  Failure({ error })

// SCHEMA

/** The encoded (wire) form of a `AsyncData<A, E>` whose data encodes to
 *  `AI` and whose error encodes to `EI`. */
export type AsyncDataEncoded<AI, EI> =
  | Readonly<{ _tag: 'Idle' }>
  | Readonly<{ _tag: 'Loading' }>
  | Readonly<{ _tag: 'Refreshing'; data: AI }>
  | Readonly<{ _tag: 'Failure'; error: EI }>
  | Readonly<{ _tag: 'Stale'; error: EI; data: AI }>
  | Readonly<{ _tag: 'Success'; data: AI }>

/** What the `Schema` factory returns: the six-state Union codec to embed in
 *  a Model plus the Schema-bound constructors for the four parameterized
 *  states. Combinators are not part of this bag; they are module-level free
 *  functions over any `AsyncData<A, E>` value. */
export type AsyncDataSchema<A, AI, E, EI> = Readonly<{
  /** The six-state Union codec. Embed this in your Model, or in
   *  `S.HashMap(key, this)` for a keyed cache. */
  schema: S.Codec<AsyncData<A, E>, AsyncDataEncoded<AI, EI>>
  Idle: typeof Idle
  Loading: typeof Loading
  Refreshing: (payload: Readonly<{ data: A }>) => AsyncData<A, E>
  Failure: (payload: Readonly<{ error: E }>) => AsyncData<A, E>
  Stale: (payload: Readonly<{ error: E; data: A }>) => AsyncData<A, E>
  Success: (payload: Readonly<{ data: A }>) => AsyncData<A, E>
}>

/** Builds the six-state `AsyncData` Schema for the given data and error
 *  Schemas (value-first). Put `schema` in your Model; use the returned
 *  constructors when you want ones typed to this instance's `A` and `E`.
 *
 *  @example
 *  ```ts
 *  import { AsyncData } from 'foldkit'
 *  import { Schema as S } from 'effect'
 *
 *  const Note = S.Struct({ id: S.String, body: S.String })
 *  const Notes = AsyncData.Schema(S.Array(Note), S.String)
 *
 *  // Model field: typeof Notes.schema.Type
 *  const initial = AsyncData.Idle()
 *  const loaded = Notes.Success({ data: [] })
 *  ```
 */
export const Schema = <A, AI, E, EI>(
  dataSchema: S.Codec<A, AI>,
  errorSchema: S.Codec<E, EI>,
): AsyncDataSchema<A, AI, E, EI> => {
  const RefreshingSchema = ts('Refreshing', { data: dataSchema })
  const FailureSchema = ts('Failure', { error: errorSchema })
  const StaleSchema = ts('Stale', { error: errorSchema, data: dataSchema })
  const SuccessSchema = ts('Success', { data: dataSchema })
  const schema = S.Union([
    Idle,
    Loading,
    RefreshingSchema,
    FailureSchema,
    StaleSchema,
    SuccessSchema,
  ])
  return {
    schema,
    Idle,
    Loading,
    Refreshing: RefreshingSchema,
    Failure: FailureSchema,
    Stale: StaleSchema,
    Success: SuccessSchema,
  }
}

// OPERATION

/** Handles all six states exhaustively, passing each handler its unwrapped
 *  payload. `onStale` alone receives the whole `{ error, data }` payload
 *  object because `Stale` carries two fields. Use `matchData` when the view
 *  does not care which of the data-bearing states it is rendering.
 *
 *  @example
 *  ```ts
 *  import { AsyncData } from 'foldkit'
 *
 *  AsyncData.match(notes, {
 *    onIdle: () => 'Not loaded',
 *    onLoading: () => 'Loading',
 *    onRefreshing: notes => `Refreshing ${notes.length} notes`,
 *    onFailure: error => `Failed: ${error}`,
 *    onStale: ({ error, data }) => `${data.length} notes (stale: ${error})`,
 *    onSuccess: notes => `${notes.length} notes`,
 *  })
 *  ```
 */
// NOTE: match, matchData, matchDataSplitEmpty, getData, and getError use
// refinement chains instead of Match because tagsExhaustive returns
// Unify<B>, which does not reduce when the handlers return a caller's
// naked generic in effect 4.0.0-beta.88. Combinators whose handlers
// return concrete AsyncData shapes use Match as usual.
export const match: {
  <A, E, B, C = B, D = B, F = B, G = B, H = B>(
    handlers: Readonly<{
      onIdle: Function.LazyArg<B>
      onLoading: Function.LazyArg<C>
      onRefreshing: (data: A) => D
      onFailure: (error: E) => F
      onStale: (payload: Readonly<{ error: E; data: A }>) => G
      onSuccess: (data: A) => H
    }>,
  ): (self: AsyncData<A, E>) => B | C | D | F | G | H
  <A, E, B, C = B, D = B, F = B, G = B, H = B>(
    self: AsyncData<A, E>,
    handlers: Readonly<{
      onIdle: Function.LazyArg<B>
      onLoading: Function.LazyArg<C>
      onRefreshing: (data: A) => D
      onFailure: (error: E) => F
      onStale: (payload: Readonly<{ error: E; data: A }>) => G
      onSuccess: (data: A) => H
    }>,
  ): B | C | D | F | G | H
} = Function.dual(
  2,
  <A, E, B>(
    self: AsyncData<A, E>,
    handlers: Readonly<{
      onIdle: Function.LazyArg<B>
      onLoading: Function.LazyArg<B>
      onRefreshing: (data: A) => B
      onFailure: (error: E) => B
      onStale: (payload: Readonly<{ error: E; data: A }>) => B
      onSuccess: (data: A) => B
    }>,
  ): B => {
    if (isIdle(self)) {
      return handlers.onIdle()
    }
    if (isLoading(self)) {
      return handlers.onLoading()
    }
    if (isRefreshing(self)) {
      return handlers.onRefreshing(self.data)
    }
    if (isFailure(self)) {
      return handlers.onFailure(self.error)
    }
    if (isStale(self)) {
      return handlers.onStale({ error: self.error, data: self.data })
    }
    return handlers.onSuccess(self.data)
  },
)

/** Collapses the six states to the three channels a view usually renders:
 *  `onData` spans the data-bearing states (`Success`, `Refreshing`,
 *  `Stale`), `onFailure` receives the `Failure` error, and `onEmpty` covers
 *  `Idle` and `Loading` together. A `Stale` renders through `onData` so its
 *  data stays on screen. Use `matchDataSplitEmpty` when `Idle` and `Loading`
 *  render differently, and `match` when the stale error or the `Refreshing`
 *  signal matters. */
export const matchData: {
  <A, E, B, C = B, D = B>(handlers: {
    readonly onEmpty: Function.LazyArg<B>
    readonly onFailure: (error: E) => C
    readonly onData: (data: A) => D
  }): (self: AsyncData<A, E>) => B | C | D
  <A, E, B, C = B, D = B>(
    self: AsyncData<A, E>,
    handlers: {
      readonly onEmpty: Function.LazyArg<B>
      readonly onFailure: (error: E) => C
      readonly onData: (data: A) => D
    },
  ): B | C | D
} = Function.dual(
  2,
  <A, E, B>(
    self: AsyncData<A, E>,
    handlers: {
      readonly onEmpty: Function.LazyArg<B>
      readonly onFailure: (error: E) => B
      readonly onData: (data: A) => B
    },
  ): B => {
    const maybeData = getData(self)
    if (Option.isSome(maybeData)) {
      return handlers.onData(maybeData.value)
    }
    if (isFailure(self)) {
      return handlers.onFailure(self.error)
    }
    return handlers.onEmpty()
  },
)

/** Like `matchData`, but the collapsed `onEmpty` channel is split in two:
 *  `onIdle` handles `Idle` and `onLoading` handles `Loading`, for views that
 *  render nothing requested yet differently from a request in flight.
 *  `onData` and `onFailure` behave exactly as in `matchData`. */
export const matchDataSplitEmpty: {
  <A, E, B, C = B, D = B, F = B>(handlers: {
    readonly onIdle: Function.LazyArg<B>
    readonly onLoading: Function.LazyArg<C>
    readonly onFailure: (error: E) => D
    readonly onData: (data: A) => F
  }): (self: AsyncData<A, E>) => B | C | D | F
  <A, E, B, C = B, D = B, F = B>(
    self: AsyncData<A, E>,
    handlers: {
      readonly onIdle: Function.LazyArg<B>
      readonly onLoading: Function.LazyArg<C>
      readonly onFailure: (error: E) => D
      readonly onData: (data: A) => F
    },
  ): B | C | D | F
} = Function.dual(
  2,
  <A, E, B>(
    self: AsyncData<A, E>,
    handlers: {
      readonly onIdle: Function.LazyArg<B>
      readonly onLoading: Function.LazyArg<B>
      readonly onFailure: (error: E) => B
      readonly onData: (data: A) => B
    },
  ): B => {
    const maybeData = getData(self)
    if (Option.isSome(maybeData)) {
      return handlers.onData(maybeData.value)
    }
    if (isFailure(self)) {
      return handlers.onFailure(self.error)
    }
    if (isLoading(self)) {
      return handlers.onLoading()
    }
    return handlers.onIdle()
  },
)

/** Maps the data of all three data-bearing states, preserving each tag so
 *  the `Refreshing` and `Stale` signals survive a pure transform. `Stale`
 *  maps only its `data`, keeping its `error`. The no-data states pass
 *  through unchanged. */
export const map: {
  <A, B>(f: (data: A) => B): <E>(self: AsyncData<A, E>) => AsyncData<B, E>
  <A, E, B>(self: AsyncData<A, E>, f: (data: A) => B): AsyncData<B, E>
} = Function.dual(
  2,
  <A, E, B>(self: AsyncData<A, E>, f: (data: A) => B): AsyncData<B, E> =>
    M.value(self).pipe(
      M.withReturnType<AsyncData<B, E>>(),
      M.tagsExhaustive({
        Idle: idle => idle,
        Loading: loading => loading,
        Refreshing: ({ data }) => Refreshing({ data: f(data) }),
        Failure: failure => failure,
        Stale: ({ error, data }) => Stale({ error, data: f(data) }),
        Success: ({ data }) => Success({ data: f(data) }),
      }),
    ),
)

/** Maps the error of the two error-bearing states: `Failure` and `Stale`
 *  transform (`Stale` keeps its `data`), everything else passes through.
 *  Use it to unify heterogeneous error types before a combine. */
export const mapError: {
  <E, E2>(f: (error: E) => E2): <A>(self: AsyncData<A, E>) => AsyncData<A, E2>
  <A, E, E2>(self: AsyncData<A, E>, f: (error: E) => E2): AsyncData<A, E2>
} = Function.dual(
  2,
  <A, E, E2>(self: AsyncData<A, E>, f: (error: E) => E2): AsyncData<A, E2> =>
    M.value(self).pipe(
      M.withReturnType<AsyncData<A, E2>>(),
      M.tagsExhaustive({
        Idle: idle => idle,
        Loading: loading => loading,
        Refreshing: refreshing => refreshing,
        Failure: ({ error }) => Failure({ error: f(error) }),
        Stale: ({ error, data }) => Stale({ error: f(error), data }),
        Success: success => success,
      }),
    ),
)

/** Maps both channels with channel-named handlers: `onData` spans `Success`,
 *  `Refreshing`, and `Stale`; `onError` spans `Failure` and `Stale`. For
 *  `Stale`, both handlers apply. Tags are preserved. */
export const mapBoth: {
  <A, E, B, E2>(handlers: {
    readonly onData: (data: A) => B
    readonly onError: (error: E) => E2
  }): (self: AsyncData<A, E>) => AsyncData<B, E2>
  <A, E, B, E2>(
    self: AsyncData<A, E>,
    handlers: {
      readonly onData: (data: A) => B
      readonly onError: (error: E) => E2
    },
  ): AsyncData<B, E2>
} = Function.dual(
  2,
  <A, E, B, E2>(
    self: AsyncData<A, E>,
    handlers: {
      readonly onData: (data: A) => B
      readonly onError: (error: E) => E2
    },
  ): AsyncData<B, E2> =>
    M.value(self).pipe(
      M.withReturnType<AsyncData<B, E2>>(),
      M.tagsExhaustive({
        Idle: idle => idle,
        Loading: loading => loading,
        Refreshing: ({ data }) => Refreshing({ data: handlers.onData(data) }),
        Failure: ({ error }) => Failure({ error: handlers.onError(error) }),
        Stale: ({ error, data }) =>
          Stale({
            error: handlers.onError(error),
            data: handlers.onData(data),
          }),
        Success: ({ data }) => Success({ data: handlers.onData(data) }),
      }),
    ),
)

/** Treats every data-bearing state (`Success`, `Refreshing`, `Stale`)
 *  exactly like `Success(data)`: returns `f(data)` unchanged, dropping the
 *  tag and any `Stale` error, so a caller can settle in-flight or stale data
 *  into `Success`. The no-data states pass through. Widens the error channel
 *  to `E | E2`, matching `Result.flatMap`. */
export const flatMap: {
  <A, B, E2>(
    f: (data: A) => AsyncData<B, E2>,
  ): <E>(self: AsyncData<A, E>) => AsyncData<B, E | E2>
  <A, E, B, E2>(
    self: AsyncData<A, E>,
    f: (data: A) => AsyncData<B, E2>,
  ): AsyncData<B, E | E2>
} = Function.dual(
  2,
  <A, E, B, E2>(
    self: AsyncData<A, E>,
    f: (data: A) => AsyncData<B, E2>,
  ): AsyncData<B, E | E2> =>
    M.value(self).pipe(
      M.withReturnType<AsyncData<B, E | E2>>(),
      M.tagsExhaustive({
        Idle: idle => idle,
        Loading: loading => loading,
        Refreshing: ({ data }) => f(data),
        Failure: failure => failure,
        Stale: ({ data }) => f(data),
        Success: ({ data }) => f(data),
      }),
    ),
)

/** Returns the data as an `Option`, spanning all three data-bearing states:
 *  `Some` for `Success`, `Refreshing`, and `Stale`, `None` otherwise.
 *  Payload-named because it deliberately spans three tags. */
export const getData = <A, E>(self: AsyncData<A, E>): Option.Option<A> => {
  if (isSuccess(self) || isRefreshing(self) || isStale(self)) {
    return Option.some(self.data)
  }
  return Option.none()
}

/** Returns the error as an `Option`, spanning both error-bearing states:
 *  `Some` for `Failure` and `Stale`, `None` otherwise. Symmetric with
 *  `getData`. */
export const getError = <A, E>(self: AsyncData<A, E>): Option.Option<E> => {
  if (isFailure(self) || isStale(self)) {
    return Option.some(self.error)
  }
  return Option.none()
}

/** Returns the data of any data-bearing state, or `onEmpty()` for the three
 *  no-data states. The fallback is a nullary thunk, mirroring
 *  `Option.getOrElse`, because the no-data states collapse to empty with no
 *  single payload. */
export const getOrElse: {
  <B>(onEmpty: Function.LazyArg<B>): <A, E>(self: AsyncData<A, E>) => A | B
  <A, E, B>(self: AsyncData<A, E>, onEmpty: Function.LazyArg<B>): A | B
} = Function.dual(
  2,
  <A, E, B>(self: AsyncData<A, E>, onEmpty: Function.LazyArg<B>): A | B =>
    Option.getOrElse(getData(self), onEmpty),
)

/** Collapses a possibly-missing cache entry to an AsyncData: `Some(entry)`
 *  is the entry, `None` is `Idle`. The keyed-cache read idiom, where a key
 *  that was never fetched is simply absent and absence means nothing was
 *  requested yet:
 *
 *  ```ts
 *  const notes = AsyncData.fromOptionOrIdle(HashMap.get(model.notesByNotebook, notebookId))
 *  ``` */
export const fromOptionOrIdle = <A, E>(
  maybeEntry: Option.Option<AsyncData<A, E>>,
): AsyncData<A, E> => Option.getOrElse(maybeEntry, () => Idle())

/** Returns `true` only for the `Idle` state. Refinement. */
export const isIdle = <A, E>(self: AsyncData<A, E>): self is Idle =>
  self._tag === 'Idle'

/** Returns `true` only for the empty `Loading` state, not `Refreshing`.
 *  Refinement. */
export const isLoading = <A, E>(self: AsyncData<A, E>): self is Loading =>
  self._tag === 'Loading'

/** Returns `true` only for the `Refreshing` state. Refinement. */
export const isRefreshing = <A, E>(
  self: AsyncData<A, E>,
): self is Refreshing<A> => self._tag === 'Refreshing'

/** Returns `true` only for the `Failure` state, not `Stale`. Refinement. */
export const isFailure = <A, E>(self: AsyncData<A, E>): self is Failure<E> =>
  self._tag === 'Failure'

/** Returns `true` only for the `Stale` state: a failed refresh holding the
 *  last good data. Refinement. */
export const isStale = <A, E>(self: AsyncData<A, E>): self is Stale<A, E> =>
  self._tag === 'Stale'

/** Returns `true` only for the `Success` state, not `Refreshing` or
 *  `Stale`. Refinement. */
export const isSuccess = <A, E>(self: AsyncData<A, E>): self is Success<A> =>
  self._tag === 'Success'

/** Returns `true` when the state holds data: `Success`, `Refreshing`, or
 *  `Stale`. */
export const hasData = <A, E>(self: AsyncData<A, E>): boolean =>
  Option.isSome(getData(self))

/** Returns `true` when the state carries an error: `Failure` or `Stale`.
 *  The error-channel twin of `hasData`. */
export const hasError = <A, E>(self: AsyncData<A, E>): boolean =>
  Option.isSome(getError(self))

/** Returns `true` when a request is in flight: `Loading` or `Refreshing`
 *  only. `Stale` is not pending because its fetch already failed. Use for a
 *  spinner regardless of held data. */
export const isPending = <A, E>(self: AsyncData<A, E>): boolean =>
  isLoading(self) || isRefreshing(self)

const stateTags: ReadonlyArray<string> = [
  'Idle',
  'Loading',
  'Refreshing',
  'Failure',
  'Stale',
  'Success',
]

/** Type guard on `unknown`: checks that the value has a `_tag` belonging to
 *  the six `AsyncData` states. */
export const isAsyncData = (
  input: unknown,
): input is AsyncData<unknown, unknown> =>
  Predicate.hasProperty(input, '_tag') &&
  Predicate.isString(input._tag) &&
  Array.contains(stateTags, input._tag)

/** Returns `self` when it holds data (`Success`, `Refreshing`, or `Stale`),
 *  otherwise `that()`. The recovery and cache-fallback combinator: recover
 *  an `Idle`, `Loading`, or `Failure` into a secondary source without
 *  `match`. */
export const orElse: {
  <A, E>(
    that: Function.LazyArg<AsyncData<A, E>>,
  ): (self: AsyncData<A, E>) => AsyncData<A, E>
  <A, E>(
    self: AsyncData<A, E>,
    that: Function.LazyArg<AsyncData<A, E>>,
  ): AsyncData<A, E>
} = Function.dual(
  2,
  <A, E>(
    self: AsyncData<A, E>,
    that: Function.LazyArg<AsyncData<A, E>>,
  ): AsyncData<A, E> => (hasData(self) ? self : that()),
)

/** The revalidate-on-entry transition: revalidates loaded data and loads
 *  cold data. The data-bearing loaded states (`Success`, `Stale`) move to
 *  `Refreshing`; the cold no-data states (`Idle`, `Failure`) start a fresh
 *  `Loading`; the already-pending states (`Loading`, `Refreshing`) yield
 *  `None` so the request in flight is not restarted. `None` means no
 *  transition, and no load Command, is needed. */
export const revalidateOrLoad = <A, E>(
  self: AsyncData<A, E>,
): Option.Option<AsyncData<A, E>> =>
  M.value(self).pipe(
    M.withReturnType<Option.Option<AsyncData<A, E>>>(),
    M.tagsExhaustive({
      Idle: () => Option.some(Loading()),
      Loading: () => Option.none(),
      Refreshing: () => Option.none(),
      Failure: () => Option.some(Loading()),
      Stale: ({ data }) => Option.some(Refreshing({ data })),
      Success: ({ data }) => Option.some(Refreshing({ data })),
    }),
  )

/** The loaded-only revalidation transition: `Success` and `Stale` move to
 *  `Refreshing`, every other state yields `None`. Unlike
 *  `revalidateOrLoad` there is no cold-start `Loading`, so only caches
 *  that actually hold data revalidate; this is the generic refresher path
 *  after a mutation. */
export const revalidate = <A, E>(
  self: AsyncData<A, E>,
): Option.Option<AsyncData<A, E>> =>
  M.value(self).pipe(
    M.tag('Success', 'Stale', ({ data }) => Refreshing({ data })),
    M.option,
  )

/** The first-visit load transition: the cold no-data states (`Idle`,
 *  `Failure`) start a fresh `Loading`; every other state yields `None`, so
 *  loaded data is kept without revalidation and a request in flight is not
 *  restarted. The load-only sibling of `revalidateOrLoad` and `revalidate`,
 *  and the state-machine form of TanStack Query's `staleTime: Infinity`:
 *  fetch on first visit, keep the cache afterwards. */
export const loadIfMissing = <A, E>(
  self: AsyncData<A, E>,
): Option.Option<AsyncData<A, E>> =>
  M.value(self).pipe(
    M.tag('Idle', 'Failure', () => Loading()),
    M.option,
  )

/** Combines two values under the two-tier lattice
 *  `Failure > Loading > Idle > Stale > Refreshing > Success`. If either
 *  input is a no-data state, the highest-ranked such state wins with no
 *  combination (`self`'s error wins when both are `Failure`). Otherwise both
 *  hold data: combine with `f` and tag the result with the highest-ranked
 *  data state present (`self`'s error wins when both are `Stale`).
 *
 *  Because the combined value needs both inputs' data, a single no-data
 *  input collapses the whole combine to that state:
 *  `zipWith(Idle(), Success({ data }), f)` yields `Idle`. */
export const zipWith: {
  <A, E, B, C>(
    that: AsyncData<B, E>,
    f: (selfData: A, thatData: B) => C,
  ): (self: AsyncData<A, E>) => AsyncData<C, E>
  <A, E, B, C>(
    self: AsyncData<A, E>,
    that: AsyncData<B, E>,
    f: (selfData: A, thatData: B) => C,
  ): AsyncData<C, E>
} = Function.dual(
  3,
  <A, E, B, C>(
    self: AsyncData<A, E>,
    that: AsyncData<B, E>,
    f: (selfData: A, thatData: B) => C,
  ): AsyncData<C, E> => {
    if (isFailure(self)) {
      return self
    }
    if (isFailure(that)) {
      return that
    }
    if (isLoading(self) || isLoading(that)) {
      return Loading()
    }
    if (isIdle(self) || isIdle(that)) {
      return Idle()
    }
    const data = f(self.data, that.data)
    if (isStale(self)) {
      return Stale({ error: self.error, data })
    }
    if (isStale(that)) {
      return Stale({ error: that.error, data })
    }
    if (isRefreshing(self) || isRefreshing(that)) {
      return Refreshing({ data })
    }
    return Success({ data })
  },
)

const combineLattice = <E>(
  states: ReadonlyArray<AsyncData<any, E>>,
  combineData: (datas: ReadonlyArray<any>) => any,
): AsyncData<any, E> => {
  const maybeFailure = Array.findFirst(states, isFailure)
  if (Option.isSome(maybeFailure)) {
    return maybeFailure.value
  }
  if (Array.some(states, isLoading)) {
    return Loading()
  }
  if (Array.some(states, isIdle)) {
    return Idle()
  }
  const data = combineData(Array.getSomes(Array.map(states, getData)))
  const maybeStale = Array.findFirst(states, isStale)
  if (Option.isSome(maybeStale)) {
    return Stale({ error: maybeStale.value.error, data })
  }
  if (Array.some(states, isRefreshing)) {
    return Refreshing({ data })
  }
  return Success({ data })
}

const allIterable = (
  inputs: Iterable<AsyncData<any, any>>,
): AsyncData<any, any> =>
  combineLattice(Array.fromIterable(inputs), Function.identity)

const allRecord = (
  inputs: Record<string, AsyncData<any, any>>,
): AsyncData<any, any> => {
  const entries = Object.entries(inputs)
  const keys = Array.map(entries, ([key]) => key)
  const states = Array.map(entries, ([, state]) => state)
  return combineLattice(states, datas =>
    Object.fromEntries(Array.zip(keys, datas)),
  )
}

/** Combines an iterable or record of values under the `zipWith` lattice.
 *  An iterable collapses to an in-order array of data (empty input yields
 *  `Success({ data: [] })`); a record builds a struct (empty input yields
 *  `Success({ data: {} })`). The highest-ranked no-data state blocks, the
 *  leftmost `Failure` error wins, and any `Stale` in an all-data set makes
 *  the result `Stale` with the leftmost `Stale` error. All inputs must share
 *  one error type; unify with `mapError` first.
 *
 *  The record form is the multi-resource screen:
 *  `all({ user, orders, prefs })` combines into one value whose data is the
 *  struct of all datas. */
export const all: <
  const Inputs extends
    | Iterable<AsyncData<any, any>>
    | Record<string, AsyncData<any, any>>,
>(
  inputs: Inputs,
) => [Inputs] extends [ReadonlyArray<AsyncData<any, any>>]
  ? AsyncData<
      {
        -readonly [K in keyof Inputs]: [Inputs[K]] extends [
          AsyncData<infer A, any>,
        ]
          ? A
          : never
      },
      Inputs[number] extends never
        ? never
        : [Inputs[number]] extends [AsyncData<any, infer E>]
          ? E
          : never
    >
  : [Inputs] extends [Iterable<AsyncData<infer A, infer E>>]
    ? AsyncData<Array<A>, E>
    : AsyncData<
        {
          -readonly [K in keyof Inputs]: [Inputs[K]] extends [
            AsyncData<infer A, any>,
          ]
            ? A
            : never
        },
        Inputs[keyof Inputs] extends never
          ? never
          : [Inputs[keyof Inputs]] extends [AsyncData<any, infer E>]
            ? E
            : never
      > = (
  inputs: Iterable<AsyncData<any, any>> | Record<string, AsyncData<any, any>>,
): any => {
  if (Symbol.iterator in inputs) {
    return allIterable(inputs)
  }
  return allRecord(inputs)
}

/** Folds a settled `Result` into the previous state, keeping the last good
 *  data: a `Result` success becomes `Success`, and a `Result` failure
 *  becomes `Stale({ error, data })` when `self` holds data, else a bare
 *  `Failure`. The primary way to fold a fetch back into the Model, and the
 *  reason a failed refresh keeps data on screen: without `settle`, every
 *  fetch needs a success arm and a failure arm that hand-assemble
 *  `Success`, `Stale`, and `Failure` from the previous state. When a
 *  failure should deliberately drop the previous data, match on the
 *  `Result` directly and build the `Failure` explicitly.
 *
 *  @example
 *  ```ts
 *  import { Effect, pipe } from 'effect'
 *  import { AsyncData, Command } from 'foldkit'
 *
 *  // The Command settles the fetch into a Result instead of throwing:
 *  const LoadNotes = Command.define(
 *    'LoadNotes',
 *    SettledLoadNotes,
 *  )(
 *    pipe(
 *      fetchNotes,
 *      Effect.result,
 *      Effect.map(result => SettledLoadNotes({ result })),
 *    ),
 *  )
 *
 *  // One update arm folds it in, whatever the previous state was:
 *  SettledLoadNotes: ({ result }) => [
 *    evo(model, { notes: AsyncData.settle(result) }),
 *    [],
 *  ]
 *  ```
 */
export const settle: {
  <A, E>(
    result: Result.Result<A, E>,
  ): (self: AsyncData<A, E>) => AsyncData<A, E>
  <A, E>(self: AsyncData<A, E>, result: Result.Result<A, E>): AsyncData<A, E>
} = Function.dual(
  2,
  <A, E>(self: AsyncData<A, E>, result: Result.Result<A, E>): AsyncData<A, E> =>
    Result.match(result, {
      onSuccess: data => Success({ data }),
      onFailure: error =>
        Option.match(getData(self), {
          onNone: () => Failure({ error }),
          onSome: data => Stale({ error, data }),
        }),
    }),
)
