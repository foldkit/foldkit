import {
  Cause,
  Effect,
  Option,
  PubSub,
  Record,
  Ref,
  Schema,
  type Scope,
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

/**
 * Forks one fiber per Subscription into the runtime scope. Each fiber
 * derives the Subscription's dependencies from every Model, restarts its
 * stream when they change under its equivalence, and feeds the Messages
 * the stream emits into the queue. A defect anywhere in that pipeline
 * crashes the runtime instead of dying silently in the fiber.
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
  pipe(
    subscriptions,
    Record.toEntries,
    Effect.forEach(
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

          const [initDependencies, maybeInitDependenciesDuration] =
            measureSlowPhase(maybeSlowSubscriptionDependencies, () =>
              modelToDependencies(initModel),
            )
          reportSlowPhase<SlowSubscriptionDependenciesContext<Model>>(
            maybeSlowSubscriptionDependencies,
            maybeInitDependenciesDuration,
            (durationMs, thresholdMs) => ({
              _tag: 'SubscriptionDependencies',
              subscriptionKey: key,
              model: initModel,
              durationMs,
              thresholdMs,
            }),
          )

          const latestDependenciesRef = yield* Ref.make(initDependencies)

          const modelChangesStream = Stream.fromPubSub(modelPubSub).pipe(
            // NOTE: Ref.set runs upstream of Stream.changesWith on
            // every model change, so readDependencies() returns
            // current values even when the equivalence filter
            // doesn't emit. Moving this into a tap after
            // changesWith would silently break subscribers whose
            // dependencies are equivalence-stable across model
            // changes.
            Stream.mapEffect(model =>
              Effect.gen(function* () {
                const [dependencies, maybeDependenciesDuration] =
                  measureSlowPhase(maybeSlowSubscriptionDependencies, () =>
                    modelToDependencies(model),
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

                yield* Ref.set(latestDependenciesRef, dependencies)
                return dependencies
              }),
            ),
          )

          yield* Effect.forkIn(runtimeScope)(
            Stream.concat(
              Stream.make(initDependencies),
              modelChangesStream,
            ).pipe(
              Stream.changesWith(equivalence),
              Stream.switchMap(dependencies =>
                dependenciesToStream(dependencies, () =>
                  Ref.getUnsafe(latestDependenciesRef),
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
        }),
      {
        concurrency: 'unbounded',
        discard: true,
      },
    ),
  )
