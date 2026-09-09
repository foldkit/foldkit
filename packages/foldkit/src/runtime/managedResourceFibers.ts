import {
  Cause,
  Effect,
  Option,
  PubSub,
  Ref,
  Schema,
  type Scope,
  Stream,
  pipe,
} from 'effect'

import type { ManagedResourceConfig } from '../managedResource/index.js'
import type { ManagedResourceRef } from './resourceProvider.js'

/**
 * Forks one fiber per Managed Resource into the runtime scope. Each fiber
 * derives the resource's requirements from every Model, acquires the
 * resource when they appear or change and releases it when they change
 * again or go away, keeps the shared Ref pointing at the live value, and
 * feeds the acquired, released, and error Messages into the queue.
 */
export const forkManagedResourceFibers = <Model, Message>({
  managedResourceRefs,
  initModel,
  modelPubSub,
  runtimeScope,
  enqueueMessageEffect,
  crashWith,
}: Readonly<{
  managedResourceRefs: ReadonlyArray<ManagedResourceRef<Model, Message>>
  initModel: Model
  modelPubSub: PubSub.PubSub<Model>
  runtimeScope: Scope.Scope
  enqueueMessageEffect: (message: Message) => Effect.Effect<void>
  crashWith: (
    cause: Cause.Cause<never>,
    maybeMessage: Option.Option<Message>,
  ) => Effect.Effect<void>
}>): Effect.Effect<void> => {
  const maybeRequirementsToLifecycle =
    (
      config: ManagedResourceConfig<Model, Message>,
      resourceRef: Ref.Ref<Option.Option<unknown>>,
    ) =>
    (maybeRequirements: unknown): Stream.Stream<Effect.Effect<Message>> => {
      if (
        Option.isOption(maybeRequirements) &&
        Option.isNone(maybeRequirements)
      ) {
        return Stream.empty
      }

      const requirements = Option.isOption(maybeRequirements)
        ? Option.getOrThrow(maybeRequirements)
        : maybeRequirements

      const acquire = Effect.gen(function* () {
        const value = yield* config.acquire(requirements)
        yield* Ref.set(resourceRef, Option.some(value))
        return value
      })

      const release = (value: unknown) =>
        Effect.gen(function* () {
          yield* config
            .release(value)
            .pipe(Effect.catchCause(() => Effect.void))
          yield* Ref.set(resourceRef, Option.none())
          yield* enqueueMessageEffect(config.onReleased())
        })

      return pipe(
        Stream.scoped(
          Stream.fromEffect(Effect.acquireRelease(acquire, release)),
        ),
        Stream.flatMap(value =>
          Stream.concat(Stream.make(config.onAcquired(value)), Stream.never),
        ),
        Stream.map(Effect.succeed),
        Stream.catch(error =>
          Stream.make(Effect.succeed(config.onAcquireError(error))),
        ),
      )
    }

  const forkManagedResourceLifecycle = ({
    config,
    ref: resourceRef,
  }: ManagedResourceRef<Model, Message>) =>
    Effect.gen(function* () {
      const modelStream = Stream.concat(
        Stream.make(initModel),
        Stream.fromPubSub(modelPubSub),
      )

      const equivalence = Schema.toEquivalence(config.schema)

      yield* Effect.forkIn(runtimeScope)(
        modelStream.pipe(
          Stream.map(config.modelToMaybeRequirements),
          Stream.changesWith(equivalence),
          Stream.switchMap(maybeRequirementsToLifecycle(config, resourceRef)),
          Stream.runForEach(Effect.flatMap(enqueueMessageEffect)),
          // NOTE: a defect in `modelToMaybeRequirements` or the equivalence
          // surfaces as the crash view instead of dying silently in this
          // fiber. `provideAllResources` is not needed: `acquire` only
          // requires `Scope`, which `Stream.scoped` supplies, and `release`
          // requires nothing.
          Effect.catchCause(cause => crashWith(cause, Option.none())),
        ),
      )
    })

  return Effect.forEach(managedResourceRefs, forkManagedResourceLifecycle, {
    concurrency: 'unbounded',
    discard: true,
  })
}
