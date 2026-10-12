import { Effect, Option, Predicate, Schema, type Scope, Stream } from 'effect'

import { Document, type HtmlBuilder } from '../html/index.js'
import type {
  ServicesOf as ManagedResourceServicesOf,
  ManagedResources,
} from '../managedResource/index.js'
import type {
  LayeredMountDefinition,
  MountAction,
  RequirementsOf as MountRequirementsOf,
  PreciseMountRegistry,
} from '../mount/index.js'
import type { Ports } from '../port/index.js'
import type { Subscriptions } from '../subscription/subscription.js'
import type {
  RequirementsOf as UpdateRequirementsOf,
  Return as UpdateReturn,
} from '../update/index.js'
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
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = Readonly<{
  Model: Schema.Codec<Model, any, unknown, unknown>
  update: (
    model: Model,
    message: Message,
  ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  view: (
    model: Model,
    h: HtmlBuilder<Message, MountRequirementsOf<NoInfer<Mounts>>>,
  ) => Document
  subscriptions?: Subscriptions<
    Model,
    Message,
    Resources | ManagedResourceServices
  >
  mounts?: Mounts
  container: HTMLElement | null
  ports?: P
  crash?: CrashConfig<Model, Message>
  slow?: SlowConfig<Model, Message>
  viewTransition?: ViewTransitionConfig<Model, Message>
  freezeModel?: boolean
  preserveScroll?: boolean
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
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = BaseApplicationConfig<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
  P,
  Mounts
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
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = BaseApplicationConfig<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
  P,
  Mounts
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
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = BaseApplicationConfig<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
  P,
  Mounts
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
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = BaseApplicationConfig<
  Model,
  Message,
  Resources,
  ManagedResourceServices,
  P,
  Mounts
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

type InferredApplicationConfig<
  Model,
  Message,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = ApplicationConfig<Model, Message, any, any, any, Mounts>

type InferredApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = ApplicationConfigWithFlags<Model, Message, Flags, any, any, any, Mounts>

type InferredRoutingApplicationConfig<
  Model,
  Message,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = RoutingApplicationConfig<Model, Message, any, any, any, Mounts>

type InferredRoutingApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = RoutingApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  any,
  any,
  any,
  Mounts
>

type RoutingApplicationConfigWithFlagsInput<
  ModelSchema extends Schema.Codec<any, any, any, any>,
  FlagsSchema extends Schema.Codec<any, any, never, never>,
  Update extends (model: ModelSchema['Type'], message: any) => any,
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = Omit<
  InferredRoutingApplicationConfigWithFlags<
    ModelSchema['Type'],
    UpdateMessage<Update>,
    FlagsSchema['Type'],
    Mounts
  >,
  'Model' | 'Flags' | 'update'
> &
  Readonly<{ Model: ModelSchema; Flags: FlagsSchema; update: Update }>

type RoutingApplicationConfigInput<
  ModelSchema extends Schema.Codec<any, any, any, any>,
  Update extends (model: ModelSchema['Type'], message: any) => any,
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = Omit<
  InferredRoutingApplicationConfig<
    ModelSchema['Type'],
    UpdateMessage<Update>,
    Mounts
  >,
  'Model' | 'update'
> &
  Readonly<{ Model: ModelSchema; update: Update }>

type ApplicationConfigWithFlagsInput<
  ModelSchema extends Schema.Codec<any, any, any, any>,
  FlagsSchema extends Schema.Codec<any, any, never, never>,
  Update extends (model: ModelSchema['Type'], message: any) => any,
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = Omit<
  InferredApplicationConfigWithFlags<
    ModelSchema['Type'],
    UpdateMessage<Update>,
    FlagsSchema['Type'],
    Mounts
  >,
  'Model' | 'Flags' | 'update'
> &
  Readonly<{ Model: ModelSchema; Flags: FlagsSchema; update: Update }>

type ApplicationConfigInput<
  ModelSchema extends Schema.Codec<any, any, any, any>,
  Update extends (model: ModelSchema['Type'], message: any) => any,
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = Omit<
  InferredApplicationConfig<ModelSchema['Type'], UpdateMessage<Update>, Mounts>,
  'Model' | 'update'
> &
  Readonly<{ Model: ModelSchema; update: Update }>

type ExactConfigKeys<Config, Shape> = Readonly<{
  [Key in Exclude<keyof Config, keyof Shape>]: never
}>

type ReturnRequirements<Return> =
  Return extends Readonly<{ commands?: infer Commands }>
    ? NonNullable<Commands> extends ReadonlyArray<infer Command>
      ? Command extends Readonly<{
          effect: Effect.Effect<any, any, infer Requirements>
        }>
        ? Requirements
        : never
      : never
    : never

type FunctionReturn<Fn> = Fn extends (
  ...args: ReadonlyArray<any>
) => infer Return
  ? Return
  : never

type SubscriptionRequirements<Subscriptions> =
  Subscriptions extends Readonly<Record<string, infer Subscription>>
    ? Subscription extends Readonly<{
        dependenciesToStream: (
          ...args: ReadonlyArray<any>
        ) => Stream.Stream<any, any, infer Requirements>
      }>
      ? Requirements
      : never
    : never

type MountRequirements<Config> =
  Config extends Readonly<{ mounts: ReadonlyArray<infer Definition> }>
    ? Definition extends (
        ...args: ReadonlyArray<any>
      ) => MountAction<any, any, infer Requirements>
      ? Requirements
      : never
    : never

type ManagedResourceRuntimeServices<Config> =
  Config extends Readonly<{ managedResources: infer ManagedResources }>
    ? ManagedResourceServicesOf<ManagedResources>
    : never

type ManagedResourceLifecycleRequirements<Config> =
  Config extends Readonly<{
    managedResources: Readonly<Record<string, infer Entry>>
  }>
    ?
        | (Entry extends Readonly<{
            acquire: (
              ...args: ReadonlyArray<any>
            ) => Effect.Effect<any, any, infer Requirements>
          }>
            ? Exclude<Requirements, Scope.Scope>
            : never)
        | (Entry extends Readonly<{
            release: (
              ...args: ReadonlyArray<any>
            ) => Effect.Effect<any, any, infer Requirements>
          }>
            ? Exclude<Requirements, Scope.Scope>
            : never)
    : never

type ConfigRequirements<
  Config,
  Update extends (...args: ReadonlyArray<any>) => any,
> = Exclude<
  | (Config extends Readonly<{ init: infer Init }>
      ? ReturnRequirements<FunctionReturn<Init>>
      : never)
  | UpdateRequirementsOf<Update>
  | (Config extends Readonly<{ subscriptions: infer Subscriptions }>
      ? SubscriptionRequirements<Subscriptions>
      : never)
  | MountRequirements<Config>
  | ManagedResourceLifecycleRequirements<Config>,
  ManagedResourceRuntimeServices<Config>
>

type SelfContainedConfig<
  Config,
  Update extends (...args: ReadonlyArray<any>) => any,
> = [ConfigRequirements<Config, Update>] extends [never] ? unknown : never

type SelfContainedUpdate<Update extends (...args: ReadonlyArray<any>) => any> =
  [UpdateRequirementsOf<Update>] extends [never] ? unknown : never

type ConfigPorts<Config> =
  Config extends Readonly<{ ports: infer P extends Ports }> ? P : undefined

type UpdateMessage<Update> = Update extends (
  model: any,
  message: infer Message,
) => any
  ? Message
  : never

type DeclaredUpdateMessage<
  Update extends (...args: ReadonlyArray<any>) => any,
> =
  Parameters<Update> extends [any, ...infer MessageParameters]
    ? Exclude<MessageParameters[number], undefined>
    : never

type ValidUpdate<Model, Update> = Update extends (
  model: Model,
  message: any,
) => any
  ? [DeclaredUpdateMessage<Update>] extends [Readonly<{ _tag: string }>]
    ? (
        model: Model,
        message: UpdateMessage<Update>,
      ) => UpdateReturn<Model, UpdateMessage<Update>, unknown>
    : never
  : never

/**
 * Creates a self-contained Foldkit application that owns the page and returns
 *  a runtime that can be passed to `run`. The `view` returns a `Document`, so
 *  the runtime manages `document.title` and the canonical / og:url tags. Add a
 *  `routing` config for URL routing. Use one page-owning application per
 *  document. Use `Application.make` when Commands, Flags, Subscriptions,
 *  Mounts, or ManagedResources need services. To mount an app scoped to a node
 *  without touching the document `<head>`, use `makeElement`.
 */
export function makeApplication<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const FlagsSchema extends Schema.Codec<any, any, never, never>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
  const Config extends RoutingApplicationConfigWithFlagsInput<
    ModelSchema,
    FlagsSchema,
    Update,
    Mounts
  > = RoutingApplicationConfigWithFlagsInput<
    ModelSchema,
    FlagsSchema,
    Update,
    Mounts
  >,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      Flags: FlagsSchema
      update: Update &
        ValidUpdate<ModelSchema['Type'], NoInfer<Update>> &
        SelfContainedUpdate<NoInfer<Update>>
    }> &
    ExactConfigKeys<
      Config,
      InferredRoutingApplicationConfigWithFlags<
        ModelSchema['Type'],
        UpdateMessage<Update>,
        FlagsSchema['Type'],
        Mounts
      >
    > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts> &
    SelfContainedConfig<Config, NoInfer<Update>>,
): MakeRuntimeReturn<
  ConfigPorts<Config>,
  FlagsSchema['Type'],
  never,
  'Application'
>

export function makeApplication<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
  const Config extends RoutingApplicationConfigInput<
    ModelSchema,
    Update,
    Mounts
  > = RoutingApplicationConfigInput<ModelSchema, Update, Mounts>,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      update: Update &
        ValidUpdate<ModelSchema['Type'], NoInfer<Update>> &
        SelfContainedUpdate<NoInfer<Update>>
    }> &
    ExactConfigKeys<
      Config,
      InferredRoutingApplicationConfig<
        ModelSchema['Type'],
        UpdateMessage<Update>,
        Mounts
      >
    > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts> &
    SelfContainedConfig<Config, NoInfer<Update>>,
): MakeRuntimeReturn<ConfigPorts<Config>, void, never, 'Application'>

export function makeApplication<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const FlagsSchema extends Schema.Codec<any, any, never, never>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
  const Config extends ApplicationConfigWithFlagsInput<
    ModelSchema,
    FlagsSchema,
    Update,
    Mounts
  > = ApplicationConfigWithFlagsInput<ModelSchema, FlagsSchema, Update, Mounts>,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      Flags: FlagsSchema
      update: Update &
        ValidUpdate<ModelSchema['Type'], NoInfer<Update>> &
        SelfContainedUpdate<NoInfer<Update>>
    }> &
    ExactConfigKeys<
      Config,
      InferredApplicationConfigWithFlags<
        ModelSchema['Type'],
        UpdateMessage<Update>,
        FlagsSchema['Type'],
        Mounts
      >
    > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts> &
    SelfContainedConfig<Config, NoInfer<Update>>,
): MakeRuntimeReturn<
  ConfigPorts<Config>,
  FlagsSchema['Type'],
  never,
  'Application'
>

export function makeApplication<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
  const Config extends ApplicationConfigInput<ModelSchema, Update, Mounts> =
    ApplicationConfigInput<ModelSchema, Update, Mounts>,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      update: Update &
        ValidUpdate<ModelSchema['Type'], NoInfer<Update>> &
        SelfContainedUpdate<NoInfer<Update>>
    }> &
    ExactConfigKeys<
      Config,
      InferredApplicationConfig<
        ModelSchema['Type'],
        UpdateMessage<Update>,
        Mounts
      >
    > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts> &
    SelfContainedConfig<Config, NoInfer<Update>>,
): MakeRuntimeReturn<ConfigPorts<Config>, void, never, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources extends never = never,
  ManagedResourceServices extends never = never,
  P extends Ports | undefined = undefined,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
>(
  config: RoutingApplicationConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices,
    P,
    Mounts
  > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts>,
): MakeRuntimeReturn<P, Flags, Resources, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Resources extends never = never,
  ManagedResourceServices extends never = never,
  P extends Ports | undefined = undefined,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
>(
  config: RoutingApplicationConfig<
    Model,
    Message,
    Resources,
    ManagedResourceServices,
    P,
    Mounts
  > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts>,
): MakeRuntimeReturn<P, void, Resources, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources extends never = never,
  ManagedResourceServices extends never = never,
  P extends Ports | undefined = undefined,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
>(
  config: ApplicationConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices,
    P,
    Mounts
  > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts>,
): MakeRuntimeReturn<P, Flags, Resources, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Resources extends never = never,
  ManagedResourceServices extends never = never,
  P extends Ports | undefined = undefined,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
>(
  config: ApplicationConfig<
    Model,
    Message,
    Resources,
    ManagedResourceServices,
    P,
    Mounts
  > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts>,
): MakeRuntimeReturn<P, void, Resources, 'Application'>

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
>(config: any): any {
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
    ...(config.mounts && { mounts: config.mounts }),
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
