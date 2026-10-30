import { Context, Effect, Layer, Option, type Scope } from 'effect'

import {
  __CurrentRegistry as __CurrentInterruptRegistry,
  __makeRegistry as __makeInterruptRegistry,
} from '../command/interruptible/index.js'
import { __CurrentPortChannels } from '../port/index.js'
import type { PortChannelsBundle } from './hostConnector.js'

/**
 * The functions the runtime uses to give Commands, Subscriptions, and Flags
 * application services, port channels, and the interrupt registry.
 */
export type ResourceProvider<Resources> = Readonly<{
  applicationContext: Context.Context<never>
  provideAllResources: <A>(
    effect: Effect.Effect<A, never, Resources>,
  ) => Effect.Effect<A>
  provideApplicationServices: <A>(
    effect: Effect.Effect<A, never, Resources>,
  ) => Effect.Effect<A>
}>

/**
 * Builds the runtime's resource provider: one build of the application Layer
 * into the runtime scope and the functions that provide it.
 * `provideAllResources` is for Commands and Subscriptions.
 * `provideApplicationServices` is for Flags, which share the application
 * Layer with those later effects.
 */
export const makeResourceProvider = <Resources>({
  runtimeScope,
  maybePortChannels,
  applicationLayer,
}: Readonly<{
  runtimeScope: Scope.Scope
  maybePortChannels: Option.Option<PortChannelsBundle>
  applicationLayer: Layer.Layer<any, any, any> | undefined
}>): Effect.Effect<ResourceProvider<Resources>> =>
  Effect.gen(function* () {
    const interruptRegistry = __makeInterruptRegistry()

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const emptyContext = Context.empty() as Context.Context<any>
    const portContext = Option.match(maybePortChannels, {
      onNone: () => emptyContext,
      onSome: portChannels =>
        Context.add(emptyContext, __CurrentPortChannels, portChannels.channels),
    })
    const runtimeContext = Context.add(
      portContext,
      __CurrentInterruptRegistry,
      interruptRegistry,
    )
    const applicationContext: Context.Context<never> = applicationLayer
      ? yield* Layer.buildWithScope(applicationLayer, runtimeScope).pipe(
          Effect.provideContext(runtimeContext),
          Effect.orDie,
        )
      : Context.empty()
    const providedContext = Context.merge(runtimeContext, applicationContext)

    const provideAllResources = <A>(
      effect: Effect.Effect<A, never, Resources>,
    ): Effect.Effect<A> =>
      Effect.provideContext(
        effect,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        providedContext as Context.Context<Resources>,
      )

    return {
      applicationContext: providedContext,
      provideAllResources,
      provideApplicationServices: provideAllResources,
    }
  })
