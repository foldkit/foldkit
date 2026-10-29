import {
  Cause,
  Effect,
  Option,
  PubSub,
  Record,
  Ref,
  Schema,
  Scope,
  Stream,
  pipe,
} from 'effect'

import {
  type Subscriptions,
  __maybeActiveDependencies as maybeActiveDependencies,
} from '../subscription/subscription.js'
import {
  type ResolvedSlowPhaseConfig,
  type SlowSubscriptionDependenciesContext,
  measureSlowPhase,
  reportSlowPhase,
} from './slowPhase.js'

/**
 * Forks one fiber per Subscription into the runtime scope. Each fiber
 * derives the Subscription's active dependencies from every Model, restarts
 * its stream when they change under its equivalence, runs no stream while
 * they are `None`, and feeds the Messages the stream emits into the queue.
 * A defect anywhere in that pipeline crashes the runtime instead of dying
 * silently in the fiber.
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
      ([key, subscription]) =>
        Effect.gen(function* () {
          const {
            dependenciesSchema,
            keepAliveEquivalence,
            dependenciesToStream,
          } = subscription
          const equivalence = Option.makeEquivalence(
            keepAliveEquivalence ?? Schema.toEquivalence(dependenciesSchema),
          )
          const modelToMaybeDependencies = (model: Model) =>
            maybeActiveDependencies(subscription, model)

          const [maybeInitDependencies, maybeInitDependenciesDuration] =
            measureSlowPhase(maybeSlowSubscriptionDependencies, () =>
              modelToMaybeDependencies(initModel),
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

          const latestDependenciesRef = yield* Ref.make(maybeInitDependencies)
          const modelSubscription = yield* PubSub.subscribe(modelPubSub).pipe(
            Effect.provideService(Scope.Scope, runtimeScope),
          )

          const modelChangesStream = Stream.fromSubscription(
            modelSubscription,
          ).pipe(
            // NOTE: Ref.set runs upstream of Stream.changesWith on
            // every model change, so readDependencies() returns
            // current values even when the equivalence filter
            // doesn't emit. Moving this into a tap after
            // changesWith would silently break subscribers whose
            // dependencies are equivalence-stable across model
            // changes.
            Stream.mapEffect(model =>
              Effect.gen(function* () {
                const [maybeDependencies, maybeDependenciesDuration] =
                  measureSlowPhase(maybeSlowSubscriptionDependencies, () =>
                    modelToMaybeDependencies(model),
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

                yield* Ref.set(latestDependenciesRef, maybeDependencies)
                return maybeDependencies
              }),
            ),
          )

          yield* Effect.forkIn(runtimeScope)(
            Stream.concat(
              Stream.make(maybeInitDependencies),
              modelChangesStream,
            ).pipe(
              Stream.changesWith(equivalence),
              Stream.switchMap(maybeDependencies =>
                Option.match(maybeDependencies, {
                  onNone: () => Stream.empty,
                  onSome: dependencies =>
                    dependenciesToStream(dependencies, () =>
                      Option.getOrElse(
                        Ref.getUnsafe(latestDependenciesRef),
                        () => dependencies,
                      ),
                    ),
                }),
              ),
              Stream.runForEach(message =>
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                enqueueMessageEffect(message as Message),
              ),
              provideAllResources,
              Effect.catchCause(cause => crashWith(cause, Option.none())),
            ),
          )
        }).pipe(Effect.catchCause(cause => crashWith(cause, Option.none()))),
      {
        concurrency: 'unbounded',
        discard: true,
      },
    ),
  )
