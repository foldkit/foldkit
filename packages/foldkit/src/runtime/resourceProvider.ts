import {
  Array,
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
 * The functions the runtime uses to give Commands, Subscriptions, and Flags
 * application services, Managed Resources, port channels, and the interrupt
 * registry, plus the Managed Resource refs the lifecycle fibers write to.
 */
export type ResourceProvider<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
> = Readonly<{
  applicationContext: Context.Context<never>
  managedResourceRefs: ReadonlyArray<ManagedResourceRef<Model, Message>>
  provideAllResources: <A>(
    effect: Effect.Effect<A, never, Resources | ManagedResourceServices>,
  ) => Effect.Effect<A>
  provideApplicationServices: <A>(
    effect: Effect.Effect<A, never, Resources>,
  ) => Effect.Effect<A>
}>

/**
 * Builds the runtime's resource provider: one build of the application Layer
 * into the runtime scope, a Ref per Managed Resource, and the functions that
 * provide them. `provideAllResources` is for Commands and Subscriptions.
 * `provideApplicationServices` is for Flags, which share the application
 * Layer with those later effects.
 */
export const makeResourceProvider = <
  Model,
  Message,
  Resources,
  ManagedResourceServices,
>({
  managedResources,
  runtimeScope,
  maybePortChannels,
  applicationLayer,
}: Readonly<{
  managedResources:
    | ManagedResources<Model, Message, ManagedResourceServices>
    | undefined
  runtimeScope: Scope.Scope
  maybePortChannels: Option.Option<PortChannelsBundle>
  applicationLayer: Layer.Layer<any, any, any> | undefined
}>): Effect.Effect<
  ResourceProvider<Model, Message, Resources, ManagedResourceServices>
> =>
  Effect.gen(function* () {
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

    const managedResourceContext = Array.reduce(
      managedResourceRefs,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Context.empty() as Context.Context<any>,
      (context, { config, ref }) =>
        Context.add(context, config.resource._tag, ref),
    )
    const portContext = Option.match(maybePortChannels, {
      onNone: () => managedResourceContext,
      onSome: portChannels =>
        Context.add(
          managedResourceContext,
          __CurrentPortChannels,
          portChannels.channels,
        ),
    })
    const runtimeContext = Context.add(
      portContext,
      __CurrentInterruptRegistry,
      interruptRegistry,
    )
    const applicationContext = applicationLayer
      ? yield* Layer.buildWithScope(applicationLayer, runtimeScope).pipe(
          Effect.provideContext(runtimeContext),
          Effect.orDie,
        )
      : Context.empty()
    const providedContext = Context.merge(runtimeContext, applicationContext)

    const provideAllResources = <A>(
      effect: Effect.Effect<A, never, Resources | ManagedResourceServices>,
    ): Effect.Effect<A> => {
      const withResources = Effect.provideContext(effect, providedContext)

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

    const provideApplicationServices = <A>(
      effect: Effect.Effect<A, never, Resources>,
    ): Effect.Effect<A> =>
      Effect.provideContext(
        effect,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        providedContext as Context.Context<Resources>,
      )

    return {
      applicationContext,
      managedResourceRefs,
      provideAllResources,
      provideApplicationServices,
    }
  })
