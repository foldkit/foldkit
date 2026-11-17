import {
  Cause,
  Effect,
  Option,
  PubSub,
  Record,
  Schema,
  Scope,
  Stream,
} from 'effect'

import type { Document, HtmlBuilder } from '../html/index.js'
import type { Subscriptions } from '../subscription/subscription.js'
import type { Return as UpdateReturn } from '../update/index.js'

/** Serializable identity of a requested or accepted lazy implementation. */
export const CompositionIdentity = Schema.Struct({
  buildId: Schema.String,
  key: Schema.String,
  requestId: Schema.String,
})

/** Serializable identity of a requested or accepted lazy implementation. */
export type CompositionIdentity = typeof CompositionIdentity.Type

/** A complete immutable root implementation sharing the runtime's Model and services. */
export type Composition<
  Model,
  Message,
  Services = never,
  View = Document,
> = Readonly<{
  update: (
    model: Model,
    message: Message,
  ) => UpdateReturn<Model, Message, Services>
  view: (model: Model, h: HtmlBuilder<Message>) => View
  subscriptions?: Subscriptions<Model, Message, Services>
}>

/**
 * Loads a finite set of implementations inside one running Runtime. The root
 * update handles lifecycle Messages and accepts only the current request's
 * identity. Loading errors become Messages; a new requestId explicitly retries.
 * Resources and ManagedResources remain declared on the root configuration.
 */
export type LazyCompositionConfig<
  Model,
  Message,
  Resources = never,
  Services = Resources,
  View = Document,
> = Readonly<{
  buildId: string
  keys: ReadonlyArray<string>
  requested: (model: Model) => Option.Option<CompositionIdentity>
  accepted: (model: Model) => Option.Option<CompositionIdentity>
  isLifecycleMessage: (message: Message) => boolean
  load: (
    key: string,
  ) => Effect.Effect<
    Composition<Model, Message, Services, View>,
    string,
    Resources
  >
  onLoaded: (identity: CompositionIdentity) => Message
  onFailed: (identity: CompositionIdentity, reason: string) => Message
}>

/** @internal Compares complete activation identity, including request generation. */
export const sameCompositionIdentity = (
  left: Option.Option<CompositionIdentity>,
  right: Option.Option<CompositionIdentity>,
): boolean =>
  Option.isNone(left)
    ? Option.isNone(right)
    : Option.isSome(right) &&
      left.value.buildId === right.value.buildId &&
      left.value.key === right.value.key &&
      left.value.requestId === right.value.requestId

/** @internal Builds a runtime-scoped implementation cache and loading channel. */
export const makeLazyComposition = <Model, Message, Resources, Services>(
  config: LazyCompositionConfig<Model, Message, Resources, Services>,
  base: Composition<Model, Message, Services>,
  provideResources: <A>(
    effect: Effect.Effect<A, never, Resources>,
  ) => Effect.Effect<A>,
) => {
  const keys = Object.freeze([...config.keys])
  const snapshots = new Map<string, Composition<Model, Message, Services>>()
  const completedRequests = new Map<string, string>()

  const invalidIdentity = (
    identity: CompositionIdentity,
  ): string | undefined => {
    if (identity.buildId !== config.buildId) {
      return `[foldkit] Lazy composition build ${identity.buildId} does not match ${config.buildId}.`
    }
    if (!keys.includes(identity.key)) {
      return `[foldkit] Unknown lazy composition key ${identity.key}.`
    }
    return undefined
  }

  const load = (identity: CompositionIdentity) =>
    Effect.suspend(() => {
      const reason = invalidIdentity(identity)
      if (reason !== undefined) {
        return Effect.fail(reason)
      }
      const snapshot = snapshots.get(identity.key)
      if (snapshot !== undefined) {
        return Effect.succeed(snapshot)
      }
      return config.load(identity.key).pipe(
        Effect.map(composition => {
          const snapshot = Object.freeze({
            update: composition.update,
            view: composition.view,
            ...(composition.subscriptions !== undefined && {
              subscriptions: Object.freeze(
                Record.map(composition.subscriptions, subscription =>
                  Object.freeze({ ...subscription }),
                ),
              ),
            }),
          })
          snapshots.set(identity.key, snapshot)
          return snapshot
        }),
      )
    })

  const resolve = (model: Model): Composition<Model, Message, Services> => {
    const identity = config.accepted(model)
    if (Option.isNone(identity)) {
      return base
    }
    const reason = invalidIdentity(identity.value)
    if (reason !== undefined) {
      throw new Error(reason)
    }
    const snapshot = snapshots.get(identity.value.key)
    if (snapshot === undefined) {
      throw new Error(
        `[foldkit] Accepted lazy composition ${identity.value.key} has not loaded.`,
      )
    }
    return snapshot
  }

  const update = (model: Model, message: Message) => {
    const implementation = config.isLifecycleMessage(message)
      ? base
      : resolve(model)
    const result = implementation.update(model, message)
    resolve(result.model)
    return result
  }

  const prepare = (model: Model): Effect.Effect<void> => {
    const identity = config.accepted(model)
    if (Option.isNone(identity)) {
      return Effect.void
    }
    return load(identity.value).pipe(
      Effect.catch(reason => Effect.die(new Error(reason))),
      provideResources,
      Effect.asVoid,
    )
  }

  const startLoading = (
    initModel: Model,
    modelPubSub: PubSub.PubSub<Model>,
    runtimeScope: Scope.Scope,
    enqueueMessageEffect: (message: Message) => Effect.Effect<void>,
    crashWith: (
      cause: Cause.Cause<never>,
      message: Option.Option<Message>,
    ) => Effect.Effect<void>,
    readLiveModel: () => Model,
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const models = yield* PubSub.subscribe(modelPubSub).pipe(
        Effect.provideService(Scope.Scope, runtimeScope),
      )
      yield* Stream.concat(
        Stream.make(initModel),
        Stream.fromSubscription(models),
      ).pipe(
        Stream.map(() => config.requested(readLiveModel())),
        Stream.changesWith(sameCompositionIdentity),
        Stream.switchMap(identity => {
          if (Option.isNone(identity)) {
            return Stream.empty
          }
          if (
            completedRequests.get(identity.value.key) ===
              identity.value.requestId &&
            identity.value.buildId === config.buildId
          ) {
            return Stream.empty
          }
          return Stream.fromEffect(
            load(identity.value).pipe(
              Effect.match({
                onFailure: reason => config.onFailed(identity.value, reason),
                onSuccess: () => config.onLoaded(identity.value),
              }),
              provideResources,
              Effect.tap(() =>
                Effect.sync(() => {
                  if (
                    identity.value.buildId === config.buildId &&
                    keys.includes(identity.value.key)
                  ) {
                    completedRequests.set(
                      identity.value.key,
                      identity.value.requestId,
                    )
                  }
                }),
              ),
            ),
          )
        }),
        Stream.runForEach(enqueueMessageEffect),
        Effect.catchCause(cause => crashWith(cause, Option.none())),
        Effect.forkIn(runtimeScope),
      )
    })

  return { prepare, resolve, update, startLoading, accepted: config.accepted }
}
