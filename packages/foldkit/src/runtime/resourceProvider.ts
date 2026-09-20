import {
  Array,
  Cause,
  Context,
  Effect,
  Layer,
  Option,
  Record,
  Ref,
  type Scope,
} from 'effect'

import {
  __CurrentRegistry as __CurrentInterruptRegistry,
  __makeRegistry as __makeInterruptRegistry,
} from '../command/interruptible/index.js'
import type {
  ManagedResourceConfig,
  ManagedResources,
} from '../managedResource/index.js'
import { __CurrentPortChannels } from '../port/index.js'
import type { PortChannelsBundle } from './hostConnector.js'

/** A Managed Resource's config next to the Ref that holds its acquired value. */
export type ManagedResourceRef<Model, Message> = Readonly<{
  config: ManagedResourceConfig<Model, Message>
  ref: Ref.Ref<Option.Option<unknown>>
}>

/**
 * The functions the runtime uses to give Commands and Subscriptions the
 * app's `resources` Layer, its Managed Resources, its port channels, and
 * the interrupt registry, and to give Flags the Layer alone, plus the
 * Managed Resource refs the lifecycle fibers write to.
 */
export type ResourceProvider<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
> = Readonly<{
  managedResourceRefs: ReadonlyArray<ManagedResourceRef<Model, Message>>
  provideAllResources: <A>(
    effect: Effect.Effect<A, never, Resources | ManagedResourceServices>,
  ) => Effect.Effect<A>
  provideResources: <A>(
    effect: Effect.Effect<A, never, Resources>,
  ) => Effect.Effect<A>
}>

/**
 * Builds the runtime's resource provider: one cached build of the
 * `resources` Layer into the runtime scope, a Ref per Managed Resource, and
 * the two functions that provide them. `provideAllResources` is for Commands
 * and Subscriptions. `provideResources` is for Flags, which run before there
 * is a Model to render a crash view against.
 */
export const makeResourceProvider = <
  Model,
  Message,
  Resources,
  ManagedResourceServices,
>({
  resources,
  managedResources,
  runtimeScope,
  maybePortChannels,
}: Readonly<{
  resources: Layer.Layer<Resources> | undefined
  managedResources:
    | ManagedResources<Model, Message, ManagedResourceServices>
    | undefined
  runtimeScope: Scope.Scope
  maybePortChannels: Option.Option<PortChannelsBundle>
}>): Effect.Effect<
  ResourceProvider<Model, Message, Resources, ManagedResourceServices>
> =>
  Effect.gen(function* () {
    // NOTE: `Effect.provide(effect, layer)` builds the Layer into a
    // scope that closes when the provided effect ends, so providing the
    // Layer per Command would construct and tear down every resource on
    // each invocation. Building once into `runtimeScope` through a
    // cached Effect is what makes `resources` long-lived: the first
    // Command or Subscription that runs triggers construction, every
    // later one shares the same built services, and release happens at
    // runtime teardown. The build is uninterruptible because
    // `Effect.cached` caches whatever Exit the first run produces:
    // dispose racing an in-flight build would otherwise cache an
    // interrupt, which every waiter would then surface as a crash.
    const maybeAcquireResourceContext: Option.Option<
      Effect.Effect<Context.Context<Resources>>
    > = yield* Option.match(Option.fromNullishOr(resources), {
      onNone: () => Effect.succeed(Option.none()),
      onSome: resourceLayer =>
        Effect.map(
          Effect.cached(
            Effect.uninterruptible(
              Layer.buildWithScope(resourceLayer, runtimeScope),
            ),
          ),
          Option.some,
        ),
    })

    const managedResourceEntries: ReadonlyArray<
      [string, ManagedResourceConfig<Model, Message>]
    > = managedResources
      ? /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        (Record.toEntries(managedResources) as ReadonlyArray<
          [string, ManagedResourceConfig<Model, Message>]
        >)
      : []

    const managedResourceRefs = yield* Effect.forEach(
      managedResourceEntries,
      ([_key, config]) =>
        Ref.make<Option.Option<unknown>>(Option.none()).pipe(
          Effect.map(ref => ({ config, ref })),
        ),
    )

    const mergeResourceIntoLayer = (
      layer: Layer.Layer<any>,
      { config, ref }: ManagedResourceRef<Model, Message>,
    ) =>
      Layer.merge(
        layer,
        Layer.succeed(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          config.resource._tag as Context.Service<any, any>,
          ref,
        ),
      )

    const maybeManagedResourceLayer = Array.match(managedResourceRefs, {
      onEmpty: () => Option.none(),
      onNonEmpty: refs =>
        Option.some(
          Array.reduce(
            refs,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            Layer.empty as Layer.Layer<any>,
            mergeResourceIntoLayer,
          ),
        ),
    })

    const interruptRegistry = __makeInterruptRegistry()

    const provideAllResources = <A>(
      effect: Effect.Effect<A, never, Resources | ManagedResourceServices>,
    ): Effect.Effect<A> => {
      const withResources = Option.match(maybeAcquireResourceContext, {
        onNone: () => effect,
        onSome: acquireResourceContext =>
          Effect.flatMap(acquireResourceContext, resourceContext =>
            Effect.provideContext(effect, resourceContext),
          ),
      })

      const withManagedResources = Option.match(maybeManagedResourceLayer, {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        onNone: () => withResources as Effect.Effect<A>,
        onSome: managedLayer =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          Effect.provide(withResources, managedLayer) as Effect.Effect<A>,
      })

      const withPortChannels = Option.match(maybePortChannels, {
        onNone: () => withManagedResources,
        onSome: portChannels =>
          Effect.provideService(
            withManagedResources,
            __CurrentPortChannels,
            portChannels.channels,
          ),
      })

      return Effect.provideService(
        withPortChannels,
        __CurrentInterruptRegistry,
        interruptRegistry,
      )
    }

    // NOTE: Flags run through the same cached build that Commands and
    // Subscriptions use, rather than being handed the Layer again, so a
    // service needed both at startup and by a Command is constructed
    // once. An app without Flags never reaches it, which keeps the Layer
    // lazy when the first thing that needs it is a Command.
    //
    // NOTE: a Layer that fails to build is not fatal here. Flags resolve
    // before `init`, so there is no Model for a crash view to render
    // against and a failure escaping this point kills the app with a
    // blank container. Running Flags against an empty context instead
    // lets an app whose Flags never touch the Layer boot as it did
    // before Flags could consume `resources`: the cached failure then
    // surfaces at the first Command or Subscription, where `crashWith`
    // does render the crash view. Flags that do need the Layer still
    // fail here, and both causes are reported: the `Service not found`
    // defect the empty context produced is useless on its own, and the
    // build failure that explains it would be lost if it replaced the
    // Flags cause outright. Combining them also keeps a Flags Effect
    // that fails for its own unrelated reason visible instead of
    // attributing its defect to the Layer. Interrupts propagate
    // untouched on both sides, because dispose racing either the build
    // or the Flags run is not a failure to recover from, and
    // `Effect.catchCause` hands the handler interrupt causes too.
    const provideResources = <A>(
      effect: Effect.Effect<A, never, Resources>,
    ): Effect.Effect<A> =>
      Option.match(maybeAcquireResourceContext, {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        onNone: () => effect as Effect.Effect<A>,
        onSome: acquireResourceContext =>
          Effect.matchCauseEffect(acquireResourceContext, {
            onFailure: buildCause =>
              Cause.hasInterruptsOnly(buildCause)
                ? Effect.failCause(buildCause)
                : Effect.catchCause(
                    Effect.provideContext(
                      effect,
                      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                      Context.empty() as Context.Context<Resources>,
                    ),
                    flagsCause =>
                      Cause.hasInterruptsOnly(flagsCause)
                        ? Effect.failCause(flagsCause)
                        : Effect.failCause(
                            Cause.combine(buildCause, flagsCause),
                          ),
                  ),
            onSuccess: resourceContext =>
              Effect.provideContext(effect, resourceContext),
          }),
      })

    return { managedResourceRefs, provideAllResources, provideResources }
  })
