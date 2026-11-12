import {
  Cause,
  Effect,
  Equivalence,
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
  equivalence: Equivalence.Equivalence<unknown>
  latestDependencies: MutableRef.MutableRef<unknown>
  restartedDependencies: MutableRef.MutableRef<unknown>
  restarts: Queue.Queue<unknown>
}>

/**
 * Forks one fiber per Subscription into the runtime scope, and one fiber that
 * follows the Model for all of them. On every Model, that fiber derives each
 * Subscription's dependencies in a single synchronous pass and hands them only
 * to the Subscriptions whose dependencies changed under their equivalence. Each
 * Subscription's fiber restarts its stream on what it is handed and feeds the
 * Messages the stream emits into the queue. A Model change therefore wakes one
 * fiber plus the Subscriptions it affects, not every Subscription. A defect
 * anywhere in that pipeline crashes the runtime instead of dying silently in
 * the fiber.
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

          // NOTE: restarts compare against `restartedDependencies`, the
          // dependencies the stream last restarted on, not against the
          // previous Model's. Comparing against the previous Model's would
          // let a run of small changes, each within the equivalence, add up
          // without ever restarting the stream.
          const followed: FollowedSubscription<Model> = {
            key,
            modelToDependencies,
            equivalence,
            latestDependencies: MutableRef.make(initDependencies),
            restartedDependencies: MutableRef.make(initDependencies),
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
            MutableRef.get(followed.restartedDependencies),
          )
        ) {
          MutableRef.set(followed.restartedDependencies, dependencies)
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
