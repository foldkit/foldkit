import {
  Array,
  Cause,
  Effect,
  MutableRef,
  Option,
  PubSub,
  Queue,
  Record,
  Schema,
  Scope,
  Stream,
  pipe,
} from 'effect'
import type { Equivalence } from 'effect/Equivalence'

import type { Subscriptions } from '../subscription/subscription.js'
import {
  type ResolvedSlowPhaseConfig,
  type SlowSubscriptionDependenciesContext,
  measureSlowPhase,
  reportSlowPhase,
} from './slowPhase.js'

type FollowedSubscription<Model> = Readonly<{
  key: string
  modelToDependencies: (model: Model) => unknown
  equivalence: Equivalence<unknown>
  latestDependencies: MutableRef.MutableRef<unknown>
  offeredDependencies: MutableRef.MutableRef<unknown>
  restarts: Queue.Queue<unknown>
}>

/**
 * Starts each Subscription from the initial Model and follows later Models
 * through one shared fiber. Each Model updates every entry's latest
 * dependencies. Changed dependencies are offered to the entry's stream fiber,
 * which restarts the stream and enqueues its Messages. A defect in dependency
 * derivation, equivalence, or a stream crashes the runtime.
 */
export const forkSubscriptionFibers = <Model, Message, Services>({
  subscriptions,
  initModel,
  modelPubSub,
  runtimeScope,
  maybeSlowSubscriptionDependencies,
  enqueueMessageEffect,
  provideAllResources,
  crashWith,
}: Readonly<{
  subscriptions: Subscriptions<Model, Message, Services>
  initModel: Model
  modelPubSub: PubSub.PubSub<Model>
  runtimeScope: Scope.Scope
  maybeSlowSubscriptionDependencies: Option.Option<
    ResolvedSlowPhaseConfig<SlowSubscriptionDependenciesContext<Model>>
  >
  enqueueMessageEffect: (message: Message) => Effect.Effect<void>
  provideAllResources: <A>(
    effect: Effect.Effect<A, never, Services>,
  ) => Effect.Effect<A>
  crashWith: (
    cause: Cause.Cause<never>,
    maybeMessage: Option.Option<Message>,
  ) => Effect.Effect<void>
}>): Effect.Effect<void> =>
  Effect.gen(function* () {
    const deriveDependencies = (
      key: string,
      modelToDependencies: (model: Model) => unknown,
      model: Model,
    ): unknown => {
      const [dependencies, maybeDependenciesDuration] = measureSlowPhase(
        maybeSlowSubscriptionDependencies,
        () => modelToDependencies(model),
      )
      reportSlowPhase<SlowSubscriptionDependenciesContext<Model>>(
        maybeSlowSubscriptionDependencies,
        maybeDependenciesDuration,
        (durationMs, thresholdMs) => ({
          _tag: 'SubscriptionDependencies',
          subscriptionKey: key,
          model,
          durationMs,
          thresholdMs,
        }),
      )

      return dependencies
    }

    const followedSubscriptions = yield* Effect.forEach(
      Record.toEntries(subscriptions),
      ([
        key,
        {
          dependenciesSchema,
          modelToDependencies,
          keepAliveEquivalence,
          dependenciesToStream,
        },
      ]) =>
        Effect.gen(function* () {
          const equivalence =
            keepAliveEquivalence ?? Schema.toEquivalence(dependenciesSchema)
          const initDependencies = deriveDependencies(
            key,
            modelToDependencies,
            initModel,
          )
          const restarts = yield* Queue.unbounded<unknown>()

          const followed: FollowedSubscription<Model> = {
            key,
            modelToDependencies,
            equivalence,
            latestDependencies: MutableRef.make(initDependencies),
            offeredDependencies: MutableRef.make(initDependencies),
            restarts,
          }

          yield* Effect.forkIn(runtimeScope)(
            Stream.concat(
              Stream.make(initDependencies),
              Stream.fromQueue(restarts),
            ).pipe(
              Stream.switchMap(dependencies =>
                dependenciesToStream(dependencies, () =>
                  MutableRef.get(followed.latestDependencies),
                ),
              ),
              Stream.runForEach(message =>
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                enqueueMessageEffect(message as Message),
              ),
              provideAllResources,
              Effect.catchCause(cause => crashWith(cause, Option.none())),
            ),
          )

          return followed
        }),
    )

    if (Array.isArrayEmpty(followedSubscriptions)) {
      return
    }

    const followModel = (model: Model): void => {
      for (const followed of followedSubscriptions) {
        const dependencies = deriveDependencies(
          followed.key,
          followed.modelToDependencies,
          model,
        )
        MutableRef.set(followed.latestDependencies, dependencies)

        if (
          !followed.equivalence(
            dependencies,
            MutableRef.get(followed.offeredDependencies),
          )
        ) {
          MutableRef.set(followed.offeredDependencies, dependencies)
          Queue.offerUnsafe(followed.restarts, dependencies)
        }
      }
    }

    const modelSubscription = yield* PubSub.subscribe(modelPubSub).pipe(
      Effect.provideService(Scope.Scope, runtimeScope),
    )

    yield* Effect.forkIn(runtimeScope)(
      pipe(
        Stream.fromSubscription(modelSubscription),
        Stream.runForEach(model => Effect.sync(() => followModel(model))),
        Effect.catchCause(cause => crashWith(cause, Option.none())),
      ),
    )
  })
