import { Effect, Option, Predicate, Schema, type Scope, Stream } from 'effect'

import { Document, Html, type HtmlBuilder } from '../html/index.js'
import type {
  ServicesOf as ManagedResourceServicesOf,
  ManagedResources,
} from '../managedResource/index.js'
import type { LayeredMountDefinition, MountAction } from '../mount/index.js'
import type { Ports } from '../port/index.js'
import type { Subscriptions } from '../subscription/subscription.js'
import type {
  RequirementsOf as UpdateRequirementsOf,
  Return as UpdateReturn,
} from '../update/index.js'
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
  mounts?: ReadonlyArray<LayeredMountDefinition>
  container: HTMLElement | null
  ports?: P
  crash?: ElementCrashConfig<Model, Message>
  slow?: SlowConfig<Model, Message>
  viewTransition?: ViewTransitionConfig<Model, Message>
  freezeModel?: boolean
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
     * Resolves the Flags once at startup, before `init` runs. Define an
     * Element with `Application.makeElement` to supply shared Flags services
     * through `Application.provide`. The error channel is `never`, so this
     * Effect handles its own failures with `Effect.catch`, the same contract
     * a Command's Effect has.
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

type InferredElementConfig<Model, Message> = ElementConfig<
  Model,
  Message,
  any,
  any,
  any
> &
  Readonly<{ Flags?: never; flags?: never }>

type InferredElementConfigWithFlags<Model, Message, Flags> =
  ElementConfigWithFlags<Model, Message, Flags, any, any, any>

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
  | (Config extends Readonly<{
      flags: Effect.Effect<any, any, infer Requirements>
    }>
      ? Requirements
      : never)
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
 * Creates a self-contained Foldkit app scoped to its container and returns a runtime that
 * can be passed to `run`.
 *
 * Unlike `makeApplication`, the `view` returns `Html` directly rather than a
 * `Document`, and the runtime never touches the document `<head>`. This lets a
 * Foldkit app be embedded at a node (a widget on a page it does not own)
 * without clobbering the host page's `title`, `canonical`, or `og:url`. Use
 * `makeApplication` when the app owns the page and should manage those tags, and
 * `makeElement` when it is one component among others on a page it does not
 * control. Embedded apps do not own the URL bar, so `makeElement` has no
 * `routing` config. Use `Application.makeElement` when Commands, Flags,
 * Subscriptions, Mounts, or ManagedResources need services.
 */
export function makeElement<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const FlagsSchema extends Schema.Codec<any, any, never, never>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Config extends Omit<
    InferredElementConfigWithFlags<
      ModelSchema['Type'],
      UpdateMessage<Update>,
      FlagsSchema['Type']
    >,
    'Model' | 'Flags' | 'update'
  > &
    Readonly<{ Model: ModelSchema; Flags: FlagsSchema; update: Update }>,
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
      InferredElementConfigWithFlags<
        ModelSchema['Type'],
        UpdateMessage<Update>,
        FlagsSchema['Type']
      >
    > &
    SelfContainedConfig<Config, NoInfer<Update>>,
): MakeRuntimeReturn<ConfigPorts<Config>, void, never, 'Element'>

export function makeElement<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Config extends Omit<
    InferredElementConfig<ModelSchema['Type'], UpdateMessage<Update>>,
    'Model' | 'update'
  > &
    Readonly<{ Model: ModelSchema; update: Update }>,
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
      InferredElementConfig<ModelSchema['Type'], UpdateMessage<Update>>
    > &
    SelfContainedConfig<Config, NoInfer<Update>>,
): MakeRuntimeReturn<ConfigPorts<Config>, void, never, 'Element'>

export function makeElement<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources extends never = never,
  ManagedResourceServices extends never = never,
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
  Resources extends never = never,
  ManagedResourceServices extends never = never,
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
>(config: any): any {
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
    ...(config.mounts && { mounts: config.mounts }),
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
