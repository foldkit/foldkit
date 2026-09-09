import { Effect, Layer, Option, Predicate, Schema } from 'effect'

import { Document, Html, type HtmlBuilder } from '../html/index.js'
import type { ManagedResources } from '../managedResource/index.js'
import type { Ports } from '../port/index.js'
import type { Subscriptions } from '../subscription/subscription.js'
import type { Return as UpdateReturn } from '../update/index.js'
import type {
  CrashConfig,
  CrashContext,
  ElementCrashConfig,
} from './crashUI.js'
import type { DevToolsConfig } from './devToolsConfig.js'
import type { ApplicationInit } from './makeApplication.js'
import {
  type FlagsSchemaConfig,
  type MakeRuntimeReturn,
  type RuntimeConfig,
  makeRuntime,
} from './runtime.js'
import type { SlowConfig } from './slowPhase.js'
import type { ViewTransitionConfig } from './viewTransition.js'

type BaseElementConfig<
  Model,
  Message,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
> = Readonly<{
  Model: Schema.Codec<Model, any, unknown, unknown>
  update: (
    model: Model,
    message: Message,
  ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  view: (model: Model, h: HtmlBuilder<Message>) => Html
  subscriptions?: Subscriptions<
    Model,
    Message,
    Resources | ManagedResourceServices
  >
  container: HTMLElement | null
  ports?: P
  crash?: ElementCrashConfig<Model, Message>
  slow?: SlowConfig<Model, Message>
  viewTransition?: ViewTransitionConfig<Model, Message>
  freezeModel?: boolean
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devTools?: DevToolsConfig
}>

/** Configuration for `makeElement` with Flags. */
export type ElementConfigWithFlags<
  Model,
  Message,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
> = BaseElementConfig<Model, Message, Resources, ManagedResourceServices, P> &
  FlagsSchemaConfig<Flags> &
  Readonly<{
    /**
     * Resolves the Flags once at startup, before `init` runs. Services this
     * Effect requires are provided from the `resources` Layer, which the
     * runtime builds a single time and shares with every Command and
     * Subscription. The error channel is `never`, so this Effect handles its
     * own failures with `Effect.catch`, the same contract a Command's Effect
     * has.
     */
    flags: Effect.Effect<Flags, never, NoInfer<Resources>>
    init: (
      flags: Flags,
    ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  }>

/** Configuration for `makeElement` without Flags. */
export type ElementConfig<
  Model,
  Message,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
> = BaseElementConfig<Model, Message, Resources, ManagedResourceServices, P> &
  Readonly<{
    init: () => UpdateReturn<
      Model,
      Message,
      Resources | ManagedResourceServices
    >
  }>

/** The `init` function type for a `makeElement` app. A scoped app never owns
 *  the URL, so its `init` has the same shape as a non-routing
 *  `ApplicationInit`: argless, or receiving Flags when `Flags` is set. */
export type ElementInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
  ManagedResourceServices = never,
> = ApplicationInit<Model, Message, Flags, Resources, ManagedResourceServices>

const toCrashConfig = <Model, Message>(
  crash: ElementCrashConfig<Model, Message> | undefined,
): CrashConfig<Model, Message> | undefined => {
  if (Predicate.isUndefined(crash)) {
    return undefined
  }

  const elementCrashView = crash.view

  return {
    ...(Predicate.isNotUndefined(elementCrashView) && {
      view: (
        context: CrashContext<Model, Message>,
        h: HtmlBuilder<never>,
      ): Document => ({
        title: '',
        body: elementCrashView(context, h),
      }),
    }),
    ...(Predicate.isNotUndefined(crash.report) && {
      report: crash.report,
    }),
  }
}

/**
 * Creates a Foldkit app scoped to its container and returns a runtime that
 * can be passed to `run`.
 *
 * Unlike `makeApplication`, the `view` returns `Html` directly rather than a
 * `Document`, and the runtime never touches the document `<head>`. This lets a
 * Foldkit app be embedded at a node (a widget on a page it does not own)
 * without clobbering the host page's `title`, `canonical`, or `og:url`. Use
 * `makeApplication` when the app owns the page and should manage those tags, and
 * `makeElement` when it is one component among others on a page it does not
 * control. Embedded apps do not own the URL bar, so `makeElement` has no
 * `routing` config.
 */
export function makeElement<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(
  config: ElementConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices,
    P
  >,
): MakeRuntimeReturn<P, void, Resources, 'Element'>

export function makeElement<
  Model,
  Message extends { _tag: string },
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(
  config: ElementConfig<Model, Message, Resources, ManagedResourceServices, P>,
): MakeRuntimeReturn<P, void, Resources, 'Element'>

export function makeElement<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(
  config:
    | ElementConfigWithFlags<
        Model,
        Message,
        Flags,
        Resources,
        ManagedResourceServices,
        P
      >
    | ElementConfig<Model, Message, Resources, ManagedResourceServices, P>,
): MakeRuntimeReturn<P, void, Resources, 'Element'> {
  const { container } = config
  if (container === null) {
    throw new Error(
      '[foldkit] Container is null. Make sure the element exists in the DOM ' +
        'before calling makeElement (e.g. that your <div id="root"></div> has ' +
        'rendered, and your script runs after it).',
    )
  }

  const hasFlags = 'Flags' in config

  const elementView = config.view
  const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: '',
    body: elementView(model, h),
  })

  const crash = toCrashConfig(config.crash)

  const baseConfig = {
    kind: 'Element',
    Model: config.Model,
    update: config.update,
    view,
    manageDocument: false,
    ports: config.ports,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container,
    ...(Predicate.isNotUndefined(crash) && { crash }),
    ...(Predicate.isNotUndefined(config.slow) && {
      slow: config.slow,
    }),
    ...(Predicate.isNotUndefined(config.viewTransition) && {
      viewTransition: config.viewTransition,
    }),
    ...(Predicate.isNotUndefined(config.freezeModel) && {
      freezeModel: config.freezeModel,
    }),
    ...(config.resources && { resources: config.resources }),
    ...(config.managedResources && {
      managedResources: config.managedResources,
    }),
    ...(Predicate.isNotUndefined(config.devTools) && {
      devTools: config.devTools,
    }),
  }

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  if (hasFlags) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      configuredFlags: Option.some(config.flags),
      isFlagsRequired: true,
      init: (flags: unknown) =>
        (
          config as ElementConfigWithFlags<
            Model,
            Message,
            Flags,
            Resources,
            ManagedResourceServices
          >
        ).init(flags as Flags),
    } as RuntimeConfig<
      Model,
      Message,
      Flags,
      Resources,
      ManagedResourceServices,
      P,
      'Element'
    >) as unknown as MakeRuntimeReturn<P, void, Resources, 'Element'>
  } else {
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      configuredFlags: Option.none(),
      isFlagsRequired: false,
      init: () =>
        (
          config as ElementConfig<
            Model,
            Message,
            Resources,
            ManagedResourceServices
          >
        ).init(),
    } as RuntimeConfig<
      Model,
      Message,
      void,
      Resources,
      ManagedResourceServices,
      P,
      'Element'
    >)
  }
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}
