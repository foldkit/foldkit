import { Layer, Option, Predicate, Schema } from 'effect'

import { Document, type HtmlBuilder } from '../html/index.js'
import type { ManagedResources } from '../managedResource/index.js'
import type { Ports } from '../port/index.js'
import type { Subscriptions } from '../subscription/subscription.js'
import type { Return as UpdateReturn } from '../update/index.js'
import { Url, fromString as urlFromString } from '../url/index.js'
import type { RoutingConfig } from './browserListeners.js'
import type { CrashConfig } from './crashUI.js'
import type { DevToolsConfig } from './devToolsConfig.js'
import {
  containRefusedPage,
  findDocumentHydration,
  hasServerRenderedMarkup,
} from './hydrationHandoff.js'
import {
  type FlagsSchemaConfig,
  type MakeRuntimeReturn,
  type RuntimeConfig,
  makeRuntime,
} from './runtime.js'
import type { SlowConfig } from './slowPhase.js'
import type { ViewTransitionConfig } from './viewTransition.js'

type BaseApplicationConfig<
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
  view: (model: Model, h: HtmlBuilder<Message>) => Document
  subscriptions?: Subscriptions<
    Model,
    Message,
    Resources | ManagedResourceServices
  >
  container: HTMLElement | null
  ports?: P
  crash?: CrashConfig<Model, Message>
  slow?: SlowConfig<Model, Message>
  viewTransition?: ViewTransitionConfig<Model, Message>
  freezeModel?: boolean
  preserveScroll?: boolean
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devTools?: DevToolsConfig
}>

/** Configuration for `makeApplication` with Flags and URL routing. */
export type RoutingApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
> = BaseApplicationConfig<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
  P
> &
  FlagsSchemaConfig<Flags> &
  Readonly<{
    routing: RoutingConfig<Message>
    init: (
      flags: Flags,
      url: Url,
    ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  }>

/** Configuration for `makeApplication` with URL routing but no Flags. */
export type RoutingApplicationConfig<
  Model,
  Message,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
> = BaseApplicationConfig<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
  P
> &
  Readonly<{
    routing: RoutingConfig<Message>
    init: (
      url: Url,
    ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  }>

/** Configuration for `makeApplication` with Flags but no URL routing. */
export type ApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
> = BaseApplicationConfig<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
  P
> &
  FlagsSchemaConfig<Flags> &
  Readonly<{
    init: (
      flags: Flags,
    ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  }>

/** Configuration for `makeApplication` without Flags or URL routing. */
export type ApplicationConfig<
  Model,
  Message,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
> = BaseApplicationConfig<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
  P
> &
  Readonly<{
    init: () => UpdateReturn<
      Model,
      Message,
      Resources | ManagedResourceServices
    >
  }>

/** The `init` function type for a `makeApplication` app without URL routing. */
export type ApplicationInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
  ManagedResourceServices = never,
> = Flags extends void
  ? () => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  : (
      flags: Flags,
    ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>

/** The `init` function type for a `makeApplication` app with URL routing, receives the current URL and optional Flags. */
export type RoutingApplicationInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
  ManagedResourceServices = never,
> = Flags extends void
  ? (
      url: Url,
    ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  : (
      flags: Flags,
      url: Url,
    ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>

/** Creates a Foldkit application that owns the page and returns a runtime that
 *  can be passed to `run`. The `view` returns a `Document`, so the runtime
 *  manages `document.title` and the canonical / og:url tags. Add a `routing`
 *  config for URL routing. Use one page-owning application per document. To
 *  mount an app scoped to a node without touching the document `<head>`, use
 *  `makeElement`. */
export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(
  config: RoutingApplicationConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices,
    P
  >,
): MakeRuntimeReturn<P, Flags, Resources, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(
  config: RoutingApplicationConfig<
    Model,
    Message,
    Resources,
    ManagedResourceServices,
    P
  >,
): MakeRuntimeReturn<P, void, Resources, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(
  config: ApplicationConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices,
    P
  >,
): MakeRuntimeReturn<P, Flags, Resources, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(
  config: ApplicationConfig<
    Model,
    Message,
    Resources,
    ManagedResourceServices,
    P
  >,
): MakeRuntimeReturn<P, void, Resources, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(
  config:
    | RoutingApplicationConfigWithFlags<
        Model,
        Message,
        Flags,
        Resources,
        ManagedResourceServices,
        P
      >
    | RoutingApplicationConfig<
        Model,
        Message,
        Resources,
        ManagedResourceServices,
        P
      >
    | ApplicationConfigWithFlags<
        Model,
        Message,
        Flags,
        Resources,
        ManagedResourceServices,
        P
      >
    | ApplicationConfig<Model, Message, Resources, ManagedResourceServices, P>,
): MakeRuntimeReturn<P, any, Resources, 'Application'> {
  const { container } = config

  const hasRouting = 'routing' in config
  const hasFlags = 'Flags' in config

  const hydration = findDocumentHydration(container, hasFlags)

  const resolvedContainer = hydration?.root ?? container
  if (resolvedContainer === null) {
    // A server-rendered page whose root lost its stamp reaches exactly here:
    // template injection put the render where the placeholder was, so
    // `getElementById` finds nothing and the stamp that would have named the
    // root is gone. There is no handoff to refuse further along, and the markup
    // is as live as any other refused page, so it is contained here.
    if (hasServerRenderedMarkup(document)) {
      containRefusedPage(document)
    }
    throw new Error(
      '[foldkit] Container is null. Make sure the element exists in the DOM ' +
        'before calling makeApplication (e.g. that your <div id="root"></div> has ' +
        'rendered, and your script runs after it). On a server-rendered page ' +
        'the runtime instead finds the root by its `data-foldkit-app` stamp.',
    )
  }

  const currentUrl: Url | undefined = hasRouting
    ? Option.getOrThrow(urlFromString(window.location.href))
    : undefined

  const baseConfig = {
    kind: 'Application',
    Model: config.Model,
    update: config.update,
    view: config.view,
    manageDocument: true,
    ports: config.ports,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container: resolvedContainer,
    ...(hydration && { hydration }),
    ...(hasRouting && { routing: config.routing }),
    ...(config.crash && { crash: config.crash }),
    ...(Predicate.isNotUndefined(config.slow) && {
      slow: config.slow,
    }),
    ...(Predicate.isNotUndefined(config.viewTransition) && {
      viewTransition: config.viewTransition,
    }),
    ...(Predicate.isNotUndefined(config.freezeModel) && {
      freezeModel: config.freezeModel,
    }),
    ...(Predicate.isNotUndefined(config.preserveScroll) && {
      preserveScroll: config.preserveScroll,
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
  if (hasFlags && hasRouting) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      configuredFlags: Option.none(),
      isFlagsRequired: true,
      init: (flags: unknown, url) =>
        (
          config as RoutingApplicationConfigWithFlags<
            Model,
            Message,
            Flags,
            Resources,
            ManagedResourceServices
          >
        ).init(flags as Flags, url ?? currentUrl!),
    } as RuntimeConfig<
      Model,
      Message,
      Flags,
      Resources,
      ManagedResourceServices,
      P,
      'Application'
    >)
  } else if (hasRouting) {
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      configuredFlags: Option.none(),
      isFlagsRequired: false,
      init: (_flags, url) =>
        (
          config as RoutingApplicationConfig<
            Model,
            Message,
            Resources,
            ManagedResourceServices
          >
        ).init(url ?? currentUrl!),
    } as RuntimeConfig<
      Model,
      Message,
      void,
      Resources,
      ManagedResourceServices,
      P,
      'Application'
    >)
  } else if (hasFlags) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      configuredFlags: Option.none(),
      isFlagsRequired: true,
      init: (flags: unknown) =>
        (
          config as ApplicationConfigWithFlags<
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
      'Application'
    >)
  } else {
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      configuredFlags: Option.none(),
      isFlagsRequired: false,
      init: () =>
        (
          config as ApplicationConfig<
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
      'Application'
    >)
  }
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}
