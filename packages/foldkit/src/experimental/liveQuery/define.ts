import { Effect, type Option, Predicate, Schema, type Stream } from 'effect'

import type { ValidateConstructionRequirements } from '../../block/scope.js'
import type { SyncFields } from '../query/keyedQuery.js'
import {
  type CanonicalLiveQuery,
  type LiveQuery,
  type LiveQueryConfig,
  type LiveQueryEntry,
  defineLiveQuery,
} from './liveQuery.js'

/**
 * Defines a Block that retains the latest state of keyed live feeds, such as
 * an event-sourced read model or a document synchronized over a WebSocket.
 *
 * Each feed is selected by `args`. Its handler returns a Stream of entries,
 * each carrying a sequence number `seq`, the authoritative `state` after the
 * entry, and optional `meta`. LiveQuery applies an entry only when its `seq`
 * is greater than the feed's cursor, so a restarted Stream that repeats
 * entries changes nothing.
 *
 * Set `handler` to a generator function that constructs the feed opener. The
 * opener receives the feed args and the cursor to resume after, which is
 * `None` on a cold start. The constructor runs when the application Layer is
 * built, and the LiveQuery Block includes that implementation in its Effects
 * Layer, so every service the constructor or the Stream requires becomes a
 * requirement of the completed Block.
 *
 * Omit `handler` when a host supplies the implementation. `toLayer` accepts
 * an Effect constructor for a host implementation or an alternative to the
 * canonical handler.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export function define<
  Name extends string,
  S,
  SI,
  E,
  EI,
  const Fields extends SyncFields,
  M = undefined,
  MI = undefined,
  HandlerRequirements = never,
  Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
    never,
    never,
    never
  >,
>(
  config: LiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields> &
    Readonly<{
      /** Constructs the canonical feed opener when the LiveQuery Layer is built. */
      handler: (() => Generator<
        Yielded,
        (
          args: Schema.Struct.Type<NoInfer<Fields>>,
          maybeAfter: Option.Option<number>,
        ) => Stream.Stream<
          LiveQueryEntry<NoInfer<S>, NoInfer<M>>,
          NoInfer<E>,
          HandlerRequirements
        >,
        unknown
      >) &
        ValidateConstructionRequirements<Effect.Services<Yielded>>
    }>,
): CanonicalLiveQuery<
  Name,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields,
  HandlerRequirements,
  Effect.Error<Yielded>,
  Effect.Services<Yielded>
>
export function define<
  Name extends string,
  S,
  SI,
  E,
  EI,
  const Fields extends SyncFields,
  M = undefined,
  MI = undefined,
>(
  config: LiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields> &
    Readonly<{ handler?: never }>,
): LiveQuery<Name, S, SI, E, EI, M, MI, Fields>
export function define<
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
>(
  config: LiveQueryConfig<string, S, SI, E, EI, M, MI, Fields> &
    Readonly<{
      handler?: () => Generator<
        Effect.Effect<unknown, ConstructorError, ConstructorRequirements>,
        (
          args: Schema.Struct.Type<Fields>,
          maybeAfter: Option.Option<number>,
        ) => Stream.Stream<LiveQueryEntry<S, M>, E, HandlerRequirements>,
        unknown
      >
    }>,
): unknown {
  const resolvedConfig = { ...config, meta: config.meta ?? Schema.Undefined }

  if (Predicate.isNotUndefined(config.handler)) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return defineLiveQuery(resolvedConfig, Effect.gen(config.handler) as never)
  } else {
    return defineLiveQuery(resolvedConfig)
  }
}
