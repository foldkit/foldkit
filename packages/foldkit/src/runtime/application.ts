import { Effect, Layer, Option, Schema, Stream } from 'effect'

import {
  type LayeredMountDefinition,
  type MountAction,
  type PreciseMountRegistry,
} from '../mount/index.js'
import type { Ports } from '../port/index.js'
import type { Return as UpdateReturn } from '../update/index.js'
import type { ValidHandlerContracts } from './handlerContracts.js'
import type {
  ApplicationConfig,
  ApplicationConfigWithFlags,
  RoutingApplicationConfig,
  RoutingApplicationConfigWithFlags,
} from './makeApplication.js'
import { makeApplication as makeRuntimeApplication } from './makeApplication.js'
import type { ElementConfig, ElementConfigWithFlags } from './makeElement.js'
import { makeElement as makeRuntimeElement } from './makeElement.js'
import { type MakeRuntimeReturn, runtimeInternals } from './runtime.js'

declare const ApplicationTypeId: unique symbol

type InferredApplicationConfig<
  Model,
  Message,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = ApplicationConfig<Model, Message, any, any, Mounts>

type InferredApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = ApplicationConfigWithFlags<Model, Message, Flags, any, any, Mounts>

type InferredRoutingApplicationConfig<
  Model,
  Message,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = RoutingApplicationConfig<Model, Message, any, any, Mounts>

type InferredRoutingApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = RoutingApplicationConfigWithFlags<Model, Message, Flags, any, any, Mounts>

type InferredElementConfig<
  Model,
  Message,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = ElementConfig<Model, Message, any, any, Mounts> &
  Readonly<{ Flags?: never; flags?: never }>

type InferredElementConfigWithFlags<
  Model,
  Message,
  Flags,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = ElementConfigWithFlags<Model, Message, Flags, any, any, Mounts>

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
>

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
>

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
>

type ApplicationConfigInput<
  ModelSchema extends Schema.Codec<any, any, any, any>,
  Update extends (model: ModelSchema['Type'], message: any) => any,
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = Omit<
  InferredApplicationConfig<ModelSchema['Type'], UpdateMessage<Update>, Mounts>,
  'Model' | 'update'
>

type ElementConfigWithFlagsInput<
  ModelSchema extends Schema.Codec<any, any, any, any>,
  FlagsSchema extends Schema.Codec<any, any, never, never>,
  Update extends (model: ModelSchema['Type'], message: any) => any,
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = Omit<
  InferredElementConfigWithFlags<
    ModelSchema['Type'],
    UpdateMessage<Update>,
    FlagsSchema['Type'],
    Mounts
  >,
  'Model' | 'Flags' | 'update'
>

type ElementConfigInput<
  ModelSchema extends Schema.Codec<any, any, any, any>,
  Update extends (model: ModelSchema['Type'], message: any) => any,
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = Omit<
  InferredElementConfig<ModelSchema['Type'], UpdateMessage<Update>, Mounts>,
  'Model' | 'update'
>

type ExactConfigKeys<Config, Shape> = Readonly<{
  [Key in Exclude<keyof Config, keyof Shape>]: never
}>

type CommandRequirements<Command> =
  Command extends Readonly<{
    effect: Effect.Effect<any, any, infer Requirements>
  }>
    ? Requirements
    : never

type ReturnRequirements<Return> =
  Return extends Readonly<{
    commands?: infer Commands
  }>
    ? NonNullable<Commands> extends ReadonlyArray<infer Command>
      ? CommandRequirements<Command>
      : never
    : never

type FunctionReturn<Fn> = Fn extends (
  ...args: ReadonlyArray<never>
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
  Config extends Readonly<{
    mounts: ReadonlyArray<infer Definition>
  }>
    ? Definition extends (
        ...args: ReadonlyArray<any>
      ) => MountAction<any, any, infer Requirements>
      ? Requirements
      : never
    : never

type ConfigRequirements<Config, Update> =
  | (Config extends Readonly<{ init: infer Init }>
      ? ReturnRequirements<FunctionReturn<Init>>
      : never)
  | ReturnRequirements<FunctionReturn<Update>>
  | (Config extends Readonly<{ subscriptions: infer Subscriptions }>
      ? SubscriptionRequirements<Subscriptions>
      : never)
  | MountRequirements<Config>
  | (Config extends Readonly<{
      flags: Effect.Effect<any, any, infer Requirements>
    }>
      ? Requirements
      : never)

type ConfigPorts<Config> =
  Config extends Readonly<{
    ports: infer P extends Ports
  }>
    ? P
    : undefined

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

type ResidualRequirements<Current, Provided, Needed, RuntimeServices> = Exclude<
  Exclude<Current, Provided> | Needed,
  RuntimeServices
>

/** @internal Passive program contract before all ordinary Services are provided. */
export interface PendingApplication<
  P extends Ports | undefined,
  Flags,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  Kind extends 'Application' | 'Element' = 'Application',
> extends Readonly<{
  /**
   * Port declarations captured by completion. Runtime.embed returns connected
   * send and subscription handles after the runtime has started.
   */
  ports: P
  /**
   * Supplies the ordinary services a Layer produces and carries the Layer's
   * own requirements forward. The application already carries the handler
   * graph selected during root completion. Combine independent service Layers
   * with `Layer.mergeAll` before calling this method once. A bundle may produce
   * services beyond the application's requirements. Those services remain
   * available to Flags and other runtime effects. A later call supplies the
   * Layers provided by earlier calls, so provide a dependent Layer before its
   * dependency.
   *
   * Provision also works when the application has no unmet requirements. For
   * example, only its Flags Effect may need a shared service. Commands and
   * Subscription restarts reuse the provided services. Keep concrete
   * environment providers at application completion so tests can provide
   * different services to the same handler Layers. Use `Layer.provideMerge`
   * when the provider must also be available to Flags or other runtime effects.
   *
   * A hydrating start validates its server handoff before building Layers.
   * Layers are built once for each runtime start and released when it stops.
   * Provided variants of one program share embed activity and disposal
   * ordering.
   */
  provide<const LayerType extends Layer.Layer<never, any, any>>(
    layer: LayerType &
      ValidHandlerContracts<
        | NoInfer<Requirements>
        | NoInfer<ProvidedServices>
        | Layer.Success<NoInfer<LayerType>>
        | Layer.Services<NoInfer<LayerType>>
      >,
  ): PublicProgram<
    P,
    Flags,
    ResidualRequirements<
      Requirements,
      Layer.Success<LayerType>,
      Layer.Services<LayerType>,
      RuntimeServices
    >,
    RuntimeServices,
    ProvidedServices | Layer.Success<LayerType>,
    Kind
  >
  [ApplicationTypeId]: Readonly<{
    Flags: (flags: Flags) => Flags
    Requirements: (requirements: Requirements) => Requirements
    RuntimeServices: (services: RuntimeServices) => RuntimeServices
    ProvidedServices: (services: ProvidedServices) => ProvidedServices
    Kind: Kind
  }>
}> {}

type Program<
  P extends Ports | undefined,
  Flags,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  Kind extends 'Application' | 'Element',
> = PendingApplication<
  P,
  Flags,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  Kind
> &
  ([Requirements] extends [never]
    ? MakeRuntimeReturn<P, Flags, ProvidedServices, Kind>
    : unknown)

/**
 * A page-owning Foldkit application whose Effect requirements are carried in
 * its type. Applications with no requirements can be passed directly to
 * `Runtime.run`. Call `application.provide` with a Layer before starting an
 * application that has requirements.
 */
export type Application<
  P extends Ports | undefined = undefined,
  Flags = void,
  Requirements = never,
  RuntimeServices = never,
  ProvidedServices = never,
> = Program<
  P,
  Flags,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  'Application'
>

/**
 * A container-scoped Foldkit Element whose remaining ordinary service
 * requirements are carried in its type. Call `element.provide` with ordinary
 * service Layers before passing the Element to `Runtime.run` or `Runtime.embed`.
 */
export type Element<
  P extends Ports | undefined = undefined,
  Requirements = never,
  RuntimeServices = never,
  ProvidedServices = never,
> = Program<P, void, Requirements, RuntimeServices, ProvidedServices, 'Element'>

type PublicProgram<
  P extends Ports | undefined,
  Flags,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  Kind extends 'Application' | 'Element',
> = Kind extends 'Application'
  ? Application<P, Flags, Requirements, RuntimeServices, ProvidedServices>
  : Element<P, Requirements, RuntimeServices, ProvidedServices>

/**
 * Defines a page-owning Foldkit application and preserves the services its
 * init and update Commands, Subscriptions, and registered Mounts require.
 */
export function __makeFromConfig<
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
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
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
    PreciseMountRegistry<Mounts>,
): Application<
  ConfigPorts<Config>,
  FlagsSchema['Type'],
  ConfigRequirements<Config, Update>
>

export function __makeFromConfig<
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
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
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
    PreciseMountRegistry<Mounts>,
): Application<ConfigPorts<Config>, void, ConfigRequirements<Config, Update>>

export function __makeFromConfig<
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
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
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
    PreciseMountRegistry<Mounts>,
): Application<
  ConfigPorts<Config>,
  FlagsSchema['Type'],
  ConfigRequirements<Config, Update>
>

export function __makeFromConfig<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
  const Config extends ApplicationConfigInput<ModelSchema, Update, Mounts> =
    ApplicationConfigInput<ModelSchema, Update, Mounts>,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
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
    PreciseMountRegistry<Mounts>,
): Application<ConfigPorts<Config>, void, ConfigRequirements<Config, Update>>

export function __makeFromConfig(
  config:
    | InferredRoutingApplicationConfigWithFlags<any, any, any>
    | InferredRoutingApplicationConfig<any, any>
    | InferredApplicationConfigWithFlags<any, any, any>
    | InferredApplicationConfig<any, any>,
): unknown {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return bindProvide(makeRuntimeApplication(config as any))
}

/**
 * Defines a container-scoped Foldkit Element with requirements inferred from
 * its Flags Effect, init and update Commands, Subscriptions, and registered
 * Mounts. Its view returns `Html` and does not manage page metadata.
 */
export function __makeElementFromConfig<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const FlagsSchema extends Schema.Codec<any, any, never, never>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
  const Config extends ElementConfigWithFlagsInput<
    ModelSchema,
    FlagsSchema,
    Update,
    Mounts
  > = ElementConfigWithFlagsInput<ModelSchema, FlagsSchema, Update, Mounts>,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      Flags: FlagsSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
    }> &
    ExactConfigKeys<
      Config,
      InferredElementConfigWithFlags<
        ModelSchema['Type'],
        UpdateMessage<Update>,
        FlagsSchema['Type'],
        Mounts
      >
    > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts>,
): Element<ConfigPorts<Config>, ConfigRequirements<Config, Update>>

export function __makeElementFromConfig<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
  const Config extends ElementConfigInput<ModelSchema, Update, Mounts> =
    ElementConfigInput<ModelSchema, Update, Mounts>,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
    }> &
    ExactConfigKeys<
      Config,
      InferredElementConfig<ModelSchema['Type'], UpdateMessage<Update>, Mounts>
    > &
    Readonly<{ mounts?: Mounts }> &
    PreciseMountRegistry<Mounts>,
): Element<ConfigPorts<Config>, ConfigRequirements<Config, Update>>

export function __makeElementFromConfig(
  config:
    | InferredElementConfigWithFlags<any, any, any>
    | InferredElementConfig<any, any>,
): unknown {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return bindProvide(makeRuntimeElement(config as any))
}

type RuntimeProgram = Readonly<{
  runtimeId: string
  start: (preservedModel?: unknown) => Effect.Effect<void>
  ports: Ports | undefined
}>

type BoundRuntimeProgram = RuntimeProgram &
  Readonly<{
    provide: (layer: Layer.Layer<any, any, any>) => unknown
  }>

const provideProgram = (
  program: RuntimeProgram,
  layer: Layer.Layer<any, any, any>,
): unknown => {
  const internals = runtimeInternals.get(program)

  if (internals === undefined) {
    throw new Error(
      '[foldkit] program.provide expects a program created by Program.make or Program.makeElement.',
    )
  }

  const applicationLayer = internals.applicationLayer
    ? Layer.provideMerge(internals.applicationLayer, layer)
    : layer

  const startWith = (
    maybeConnector: Parameters<typeof internals.startWith>[0],
    preservedModel?: unknown,
    bootMode: Parameters<typeof internals.startWith>[2] = 'Fresh',
    flags?: Parameters<typeof internals.startWith>[3],
    buildId?: string,
  ) =>
    internals.startWithApplicationLayer(
      maybeConnector,
      preservedModel,
      bootMode,
      flags,
      buildId,
      applicationLayer,
    )

  const provided = {
    ...program,
    start: (preservedModel?: unknown) =>
      startWith(Option.none(), preservedModel),
  }

  runtimeInternals.set(provided, {
    ...internals,
    applicationLayer,
    startWith,
  })

  return bindProvide(provided)
}

const bindProvide = (program: RuntimeProgram): unknown => {
  const internals = runtimeInternals.get(program)

  if (internals === undefined) {
    throw new Error(
      '[foldkit] Application constructors must return a Foldkit Runtime program.',
    )
  }

  const application: BoundRuntimeProgram = {
    ...program,
    provide: layer => provideProgram(application, layer),
  }

  runtimeInternals.set(application, internals)

  return application
}
