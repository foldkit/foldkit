import {
  Effect,
  Layer,
  Option,
  Predicate,
  Schema,
  type Scope,
  Stream,
} from 'effect'

import type { AnyBlock, DefinedUpdateSource } from '../block/definition.js'
import { lowerBlock } from '../block/lowering.js'
import type {
  RequirementsOfBlock,
  RuntimeServicesOfBlock,
  ValidateImplementationComposition,
  ValidateRootHandlerAssembly,
} from '../block/requirements.js'
import { qualifyLayer } from '../block/scope.js'
import type { Document } from '../html/index.js'
import type {
  ServicesOf as ManagedResourceServicesOf,
  ManagedResources,
} from '../managedResource/index.js'
import {
  type LayeredMountDefinition,
  type MountAction,
  type PreciseMountRegistry,
} from '../mount/index.js'
import type { Ports } from '../port/index.js'
import type { Subscriptions } from '../subscription/subscription.js'
import type {
  Commands as UpdateCommands,
  Return as UpdateReturn,
} from '../update/index.js'
import type { Url } from '../url/index.js'
import type { VNode } from '../vdom.js'
import {
  type AnyComposition,
  type CompletedComposition,
  type DefinitionOf,
  type MessageSchemaOf,
  type ModelSchemaOf,
  type ViewRequirementsOf,
  complete,
} from './applicationAuthoring.js'
import type { RoutingConfig } from './browserListeners.js'
import type { CrashConfig, ElementCrashConfig } from './crashUI.js'
import type { DevToolsConfig } from './devToolsConfig.js'
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
import type { SlowConfig } from './slowPhase.js'
import type { ViewTransitionConfig } from './viewTransition.js'

declare const ApplicationTypeId: unique symbol

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

type InferredElementConfig<
  Model,
  Message,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = ElementConfig<Model, Message, any, any, any, Mounts> &
  Readonly<{ Flags?: never; flags?: never }>

type InferredElementConfigWithFlags<
  Model,
  Message,
  Flags,
  Mounts extends ReadonlyArray<LayeredMountDefinition> = readonly [],
> = ElementConfigWithFlags<Model, Message, Flags, any, any, any, Mounts>

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
            ) => Effect.Effect<any, any, infer R>
          }>
            ? Exclude<R, Scope.Scope>
            : never)
        | (Entry extends Readonly<{
            release: (
              ...args: ReadonlyArray<any>
            ) => Effect.Effect<any, any, infer R>
          }>
            ? Exclude<R, Scope.Scope>
            : never)
    : never

type ConfigRequirements<Config, Update> = Exclude<
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
  | ManagedResourceLifecycleRequirements<Config>,
  ManagedResourceRuntimeServices<Config>
>

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

const assertDistinctHandlerNames = (
  kind: 'Subscription' | 'ManagedResource',
  entries: Readonly<Record<string, unknown>>,
): void => {
  const definitions = new Map<
    string,
    Readonly<{ key: string; toLayer: unknown }>
  >()

  for (const [key, entry] of globalThis.Object.entries(entries)) {
    if (!Predicate.isObject(entry)) {
      continue
    }

    const { name, toLayer } = entry

    if (!Predicate.isString(name) || !Predicate.isFunction(toLayer)) {
      continue
    }

    const previous = definitions.get(name)

    if (previous && previous.toLayer !== toLayer) {
      throw new Error(
        `[foldkit] ${kind} handlers "${previous.key}" and "${key}" have the same name "${name}" but different definitions. Give each definition a distinct name.`,
      )
    }

    definitions.set(name, { key, toLayer })
  }
}

const assertDistinctManagedResourceKeys = (
  entries: Readonly<Record<string, unknown>>,
): void => {
  const registrations = new Map<string, string>()

  for (const [registrationKey, entry] of globalThis.Object.entries(entries)) {
    if (!Predicate.isObject(entry)) {
      continue
    }

    const { resource } = entry

    if (!Predicate.isObject(resource)) {
      continue
    }

    const { key: resourceKey } = resource

    if (!Predicate.isString(resourceKey)) {
      continue
    }

    const previousRegistrationKey = registrations.get(resourceKey)

    if (previousRegistrationKey !== undefined) {
      throw new Error(
        `[foldkit] ManagedResource registrations "${previousRegistrationKey}" and "${registrationKey}" use the same resource tag key "${resourceKey}". Give each lifecycle owner a distinct ManagedResource tag key.`,
      )
    }

    registrations.set(resourceKey, registrationKey)
  }
}

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
 * init and update Commands, Subscriptions, registered Mounts, and
 * ManagedResources require.
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
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
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
): Application<
  ConfigPorts<Config>,
  void,
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

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
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
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
): Application<
  ConfigPorts<Config>,
  void,
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

export function __makeFromConfig(
  config:
    | InferredRoutingApplicationConfigWithFlags<any, any, any>
    | InferredRoutingApplicationConfig<any, any>
    | InferredApplicationConfigWithFlags<any, any, any>
    | InferredApplicationConfig<any, any>,
): unknown {
  if (config.subscriptions) {
    assertDistinctHandlerNames('Subscription', config.subscriptions)
  }

  if (config.managedResources) {
    assertDistinctManagedResourceKeys(config.managedResources)
    assertDistinctHandlerNames('ManagedResource', config.managedResources)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return bindProvide(makeRuntimeApplication(config as any))
}

/**
 * Defines a container-scoped Foldkit Element with requirements inferred from
 * its Flags Effect, init and update Commands, Subscriptions, registered Mounts,
 * and ManagedResources. Its view returns `Html` and does not manage page
 * metadata.
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
): Element<
  ConfigPorts<Config>,
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

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
): Element<
  ConfigPorts<Config>,
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

export function __makeElementFromConfig(
  config:
    | InferredElementConfigWithFlags<any, any, any>
    | InferredElementConfig<any, any>,
): unknown {
  if (config.subscriptions) {
    assertDistinctHandlerNames('Subscription', config.subscriptions)
  }

  if (config.managedResources) {
    assertDistinctManagedResourceKeys(config.managedResources)
    assertDistinctHandlerNames('ManagedResource', config.managedResources)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return bindProvide(makeRuntimeElement(config as any))
}

type AnyLayer = Layer.Layer<never, any, any> | Layer.Layer<any, any, any>

type CompositionModel<CompositionValue extends AnyComposition> =
  ModelSchemaOf<CompositionValue>['Type']

type CompositionMessage<CompositionValue extends AnyComposition> =
  MessageSchemaOf<CompositionValue>['Type']

type CompositionOwner<CompositionValue extends AnyComposition> =
  DefinitionOf<CompositionValue>['owner']

type CompositionViewRequirements<CompositionValue extends AnyComposition> =
  ViewRequirementsOf<CompositionValue>

type RootReturn<Model, Message> = Readonly<{
  model: Model
  commands?: UpdateCommands<Message, any> | undefined
  outMessage?: unknown | undefined
}>

type RootLifecycleConfig<CompositionValue extends AnyComposition> = Readonly<{
  subscriptions?: Subscriptions<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>,
    any
  >
  managedResources?: ManagedResources<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>,
    any
  >
}>

type AnyRootFunction = (...args: ReadonlyArray<never>) => unknown

type AnyRootConfig = Readonly<{
  init: AnyRootFunction
  update: AnyRootFunction
  view: AnyRootFunction
}>

type RootUpdateInput<
  UpdateFunction extends AnyRootFunction,
  Source,
> = UpdateFunction & Partial<DefinedUpdateSource<Source>>

type PreciseRootUpdate<
  UpdateFunction extends AnyRootFunction,
  Source,
> = unknown extends Source
  ? UpdateFunction
  : Source extends readonly [
        infer Model,
        infer Message,
        infer Context extends ReadonlyArray<unknown>,
        infer Output,
      ]
    ? (model: Model, message: Message, ...context: Context) => Output
    : never

type ValidateRootConfigChannels<
  CompositionValue extends AnyComposition,
  Config extends AnyRootConfig,
> =
  FunctionReturn<Config['init']> extends RootReturn<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>
  >
    ? FunctionReturn<Config['update']> extends RootReturn<
        CompositionModel<CompositionValue>,
        CompositionMessage<CompositionValue>
      >
      ? AcceptsExactly<
          Config['update'],
          readonly [
            CompositionModel<CompositionValue>,
            CompositionMessage<CompositionValue>,
          ]
        > extends never
        ? Readonly<{
            'Application update must accept exactly its Model and Message': Config['update']
          }>
        : unknown
      : Readonly<{
          'Application update must return its Model and Messages': FunctionReturn<
            Config['update']
          >
        }>
    : Readonly<{
        'Application init must return its Model and Messages': FunctionReturn<
          Config['init']
        >
      }>

type RequiredConfigField<Config, Key extends keyof Config> = Readonly<{
  [Field in Key]: Config[Field]
}>

type OptionalConfigField<
  Config,
  Key extends PropertyKey,
> = Key extends keyof Config
  ? Readonly<{ [Field in Key]: Config[Field] }>
  : unknown

type ConfigEffectsLayer<Config> =
  Config extends Readonly<{ EffectsLayer: infer EffectsLayer extends AnyLayer }>
    ? EffectsLayer
    : typeof Layer.empty

type RootImplementation<Config extends AnyRootConfig> = RequiredConfigField<
  Config,
  'init' | 'update' | 'view'
> &
  OptionalConfigField<Config, 'subscriptions'> &
  OptionalConfigField<Config, 'managedResources'> &
  Readonly<{ EffectsLayer: ConfigEffectsLayer<Config> }>

type CompletedRoot<
  CompositionValue extends AnyComposition,
  Config extends AnyRootConfig,
> = CompletedComposition<CompositionValue, RootImplementation<Config>>

type RootFlagsRequirements<Config> = undefined extends Config
  ? never
  : Config extends Effect.Effect<any, any, infer Requirements>
    ? Requirements
    : never

type ProducedOutMessage<Output> = Output extends unknown
  ? 'outMessage' extends keyof Output
    ? Output extends Readonly<{ outMessage?: infer OutMessage }>
      ? Exclude<OutMessage, undefined>
      : never
    : never
  : never

type EmitsNoOutMessage<Producer extends AnyRootFunction> = [
  ProducedOutMessage<FunctionReturn<Producer>>,
] extends [never]
  ? unknown
  : never

type AcceptsExactly<
  Producer extends AnyRootFunction,
  Args extends ReadonlyArray<unknown>,
> = Producer extends (...args: Args) => any
  ? ((...args: Args) => unknown) extends (
      ...args: Parameters<Producer>
    ) => unknown
    ? unknown
    : never
  : never

type RootViewKind = 'Document' | 'Element'

type ValidateRootView<
  CompositionValue extends AnyComposition,
  View extends AnyRootFunction,
  Kind extends RootViewKind,
> =
  View extends Readonly<{
    __blockDefinitionView: Readonly<{
      owner: (value: infer ViewOwner) => unknown
      model: (value: infer ViewModel) => unknown
      message: (value: infer ViewMessage) => unknown
      mountRequirements: () => infer ViewRequirements
    }>
  }>
    ? [ViewOwner, CompositionOwner<CompositionValue>] extends [
        CompositionOwner<CompositionValue>,
        ViewOwner,
      ]
      ? [ViewModel, CompositionModel<CompositionValue>] extends [
          CompositionModel<CompositionValue>,
          ViewModel,
        ]
        ? [ViewMessage, CompositionMessage<CompositionValue>] extends [
            CompositionMessage<CompositionValue>,
            ViewMessage,
          ]
          ? [
              Exclude<
                ViewRequirements,
                CompositionViewRequirements<CompositionValue>
              >,
            ] extends [never]
            ? Parameters<View> extends readonly [unknown, unknown]
              ? Kind extends 'Document'
                ? FunctionReturn<View> extends Document
                  ? unknown
                  : Readonly<{
                      'ApplicationComposition.makeApplication requires a Document view': View
                    }>
                : FunctionReturn<View> extends VNode | null
                  ? unknown
                  : Readonly<{
                      'ApplicationComposition.makeElement requires an Element view': View
                    }>
              : Readonly<{
                  'Application root view must not require view inputs': View
                }>
            : Readonly<{
                'Application view requires Mounts absent from its composition': Exclude<
                  ViewRequirements,
                  CompositionViewRequirements<CompositionValue>
                >
              }>
          : Readonly<{
              'Application view must use its composition Message': ViewMessage
            }>
        : Readonly<{
            'Application view must use its composition Model': ViewModel
          }>
      : Readonly<{
          'Application view must be authored by its definition': ViewOwner
        }>
    : Readonly<{
        'Application view must be authored by its definition': View
      }>

type NormalizedRootConfig<Config extends AnyRootConfig> = Readonly<{
  [Key in keyof Config]: Key extends 'update'
    ? Config['update'] extends DefinedUpdateSource<infer Source>
      ? PreciseRootUpdate<Config['update'], Source>
      : Config['update']
    : Config[Key]
}>

/** @internal Checks shared browser and server root recipes. */
export type ValidateRoot<
  CompositionValue extends AnyComposition,
  Config extends AnyRootConfig,
  InitArgs extends ReadonlyArray<unknown>,
  Kind extends RootViewKind,
> = ValidateNormalizedRoot<
  CompositionValue,
  NormalizedRootConfig<Config>,
  InitArgs,
  Kind
>

type ValidateNormalizedRoot<
  CompositionValue extends AnyComposition,
  Config extends AnyRootConfig,
  InitArgs extends ReadonlyArray<unknown>,
  Kind extends RootViewKind,
> = ValidateImplementationComposition<
  DefinitionOf<CompositionValue>,
  CompletedRoot<CompositionValue, Config>
> &
  ValidateRootHandlerAssembly<CompletedRoot<CompositionValue, Config>> &
  ValidateRootConfigChannels<CompositionValue, Config> &
  ValidateRootView<CompositionValue, Config['view'], Kind> &
  (EmitsNoOutMessage<Config['update']> extends never
    ? Readonly<{
        'Application update must return no OutMessage': CompositionMessage<CompositionValue>
      }>
    : AcceptsExactly<Config['init'], InitArgs> extends never
      ? Readonly<{
          'Application init must accept its Flags and routing inputs': InitArgs
        }>
      : EmitsNoOutMessage<Config['init']> extends never
        ? Readonly<{
            'Application init must return no OutMessage': InitArgs
          }>
        : unknown)

type RootRequirements<
  CompositionValue extends AnyComposition,
  Config extends AnyRootConfig,
> = RequirementsOfBlock<CompletedRoot<CompositionValue, Config>>

type RootRuntimeServices<
  CompositionValue extends AnyComposition,
  Config extends AnyRootConfig,
> = RuntimeServicesOfBlock<CompletedRoot<CompositionValue, Config>>

type RootProvidedServices<
  CompositionValue extends AnyComposition,
  Config extends AnyRootConfig,
> = Layer.Success<CompletedRoot<CompositionValue, Config>['EffectsLayer']>

type RootFlags<FlagsSchema> = undefined extends FlagsSchema
  ? void
  : FlagsSchema extends Schema.Codec<any, any, never, never>
    ? FlagsSchema['Type']
    : never

type OptionalRootField<Key extends PropertyKey, Value> = undefined extends Value
  ? unknown
  : Readonly<{ [Field in Key]: Value }>

type RootEffectsLayer<EffectsLayerValue> = undefined extends EffectsLayerValue
  ? typeof Layer.empty
  : Exclude<EffectsLayerValue, undefined> extends infer LayerValue extends
        AnyLayer
    ? LayerValue
    : never

type PreciseRootImplementation<
  Init extends AnyRootFunction,
  UpdateFunction extends AnyRootFunction,
  View extends AnyRootFunction,
  SubscriptionsValue,
  ManagedResourcesValue,
  EffectsLayerValue,
> = Readonly<{
  init: Init
  update: UpdateFunction
  view: View
  EffectsLayer: RootEffectsLayer<EffectsLayerValue>
}> &
  OptionalRootField<'subscriptions', SubscriptionsValue> &
  OptionalRootField<'managedResources', ManagedResourcesValue>

type RootSubscriptions<CompositionValue extends AnyComposition> = NonNullable<
  RootLifecycleConfig<CompositionValue>['subscriptions']
>

type RootManagedResources<CompositionValue extends AnyComposition> =
  NonNullable<RootLifecycleConfig<CompositionValue>['managedResources']>

type PageRootInput<
  CompositionValue extends AnyComposition,
  Init extends AnyRootFunction,
  UpdateFunction extends AnyRootFunction,
  View extends AnyRootFunction,
  SubscriptionsValue,
  ManagedResourcesValue,
  EffectsLayerValue,
  FlagsSchema,
  PortsValue,
> = Readonly<{
  /**
   * Produces the initial Model and optional Commands on a fresh Runtime start,
   * with the Flags and URL required by its signature. A valid Model restored
   * after a Vite development reload skips init.
   */
  init: Init
  /**
   * The pure root update authored in this Application context. It returns
   * the next Model and optional Commands; it cannot emit an OutMessage.
   */
  update: UpdateFunction
  /**
   * The canonical owned view. Its child and Mount requirements must be
   * registered in this Composition.
   */
  view: View
  /**
   * Local root Subscription declarations. Omit when there are none;
   * registered children supply their own declarations automatically. The
   * Runtime starts and stops Streams according to their Model dependencies.
   */
  subscriptions?: SubscriptionsValue
  /**
   * Local root ManagedResource declarations. Omit when there are none;
   * registered children supply their occurrence-scoped declarations. Handler
   * construction is application-scoped; acquired handles follow Model state.
   */
  managedResources?: ManagedResourcesValue
  /**
   * The root's local handler recipe. Defaults to Layer.empty. Child recipes
   * are included automatically; provide ordinary Services on the completed
   * Application or Element. The Runtime builds the selected graph at start.
   */
  EffectsLayer?: EffectsLayerValue
  /**
   * The startup Flags Schema. Declare it when init accepts Flags. This
   * Schema requires no encoding or decoding Services.
   */
  Flags?: FlagsSchema
  /**
   * URL request and change Message constructors. Required when init accepts
   * a URL; omit for an Application that does not route. The Runtime installs
   * page navigation listeners when it starts.
   */
  routing?: RoutingConfig<CompositionMessage<CompositionValue>>
  /**
   * The host element. Resolve it at browser startup. Completion rejects a
   * missing element unless it adopts a matching server-rendered root.
   */
  container: HTMLElement | null
  /**
   * Declared inbound and outbound Ports. Omit when there are none.
   * Runtime.embed returns their connected consumer-facing handles.
   */
  ports?: PortsValue
  /**
   * Optional crash rendering and reporting policy. Without a custom view,
   * the Runtime renders its default crash UI. Dispatch stops on a crash.
   */
  crash?: CrashConfig<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>
  >
  /**
   * Slow-phase measurement and reporting policy. Defaults to development-only
   * measurements and console warnings. Pass false to disable.
   */
  slow?: SlowConfig<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>
  >
  /**
   * Opt-in predicate for browser view transitions. Omit to use ordinary
   * rendering without probing transition support. Unsupported browsers and
   * reduced-motion preferences take the ordinary path.
   */
  viewTransition?: ViewTransitionConfig<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>
  >
  /**
   * Deep-freezes Models after init and update under Vite development mode.
   * Defaults to true; production is unaffected. Set false to disable.
   */
  freezeModel?: boolean
  /**
   * Preserves the window scroll offset across Vite development reloads.
   * Defaults to true for page-owning Applications. Production is unaffected;
   * nested scroll containers are not preserved.
   */
  preserveScroll?: boolean
  /**
   * DevTools recording and overlay policy. Defaults to development-only
   * visibility; pass false to disable. Configure Message to permit decoded
   * external dispatch through the DevTools bridge.
   */
  devTools?: DevToolsConfig
}>

type ElementRootInput<
  CompositionValue extends AnyComposition,
  Init extends AnyRootFunction,
  UpdateFunction extends AnyRootFunction,
  View extends AnyRootFunction,
  SubscriptionsValue,
  ManagedResourcesValue,
  EffectsLayerValue,
  FlagsSchema,
  FlagsEffect,
  PortsValue,
> = Readonly<{
  /**
   * Produces the initial Model and optional Commands on a fresh Runtime start,
   * with the Flags and URL required by its signature. A valid Model restored
   * after a Vite development reload skips init.
   */
  init: Init
  /**
   * The pure root update authored in this Application context. It returns
   * the next Model and optional Commands; it cannot emit an OutMessage.
   */
  update: UpdateFunction
  /**
   * The canonical owned view. Its child and Mount requirements must be
   * registered in this Composition.
   */
  view: View
  /**
   * Local root Subscription declarations. Omit when there are none;
   * registered children supply their own declarations automatically. The
   * Runtime starts and stops Streams according to their Model dependencies.
   */
  subscriptions?: SubscriptionsValue
  /**
   * Local root ManagedResource declarations. Omit when there are none;
   * registered children supply their occurrence-scoped declarations. Handler
   * construction is application-scoped; acquired handles follow Model state.
   */
  managedResources?: ManagedResourcesValue
  /**
   * The root's local handler recipe. Defaults to Layer.empty. Child recipes
   * are included automatically; provide ordinary Services on the completed
   * Application or Element. The Runtime builds the selected graph at start.
   */
  EffectsLayer?: EffectsLayerValue
  /**
   * The startup Flags Schema. Declare it when init accepts Flags. This
   * Schema requires no encoding or decoding Services.
   */
  Flags?: FlagsSchema
  /**
   * Resolves Flags once before init on a fresh Runtime start. A valid restored
   * development Model skips both. Required together with Flags; omit both when
   * init takes no Flags. It handles its own failures and may use ordinary
   * Services provided on the completed Element.
   */
  flags?: FlagsEffect
  /**
   * The host element. Resolve it at browser startup. Completion rejects a
   * missing element; embedded Elements do not adopt a server-rendered root.
   */
  container: HTMLElement | null
  /**
   * Declared inbound and outbound Ports. Omit when there are none.
   * Runtime.embed returns their connected consumer-facing handles.
   */
  ports?: PortsValue
  /**
   * Optional crash rendering and reporting policy. Without a custom view,
   * the Runtime renders its default crash UI. Dispatch stops on a crash.
   */
  crash?: ElementCrashConfig<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>
  >
  /**
   * Slow-phase measurement and reporting policy. Defaults to development-only
   * measurements and console warnings. Pass false to disable.
   */
  slow?: SlowConfig<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>
  >
  /**
   * Opt-in predicate for browser view transitions. Omit to use ordinary
   * rendering without probing transition support. Unsupported browsers and
   * reduced-motion preferences take the ordinary path.
   */
  viewTransition?: ViewTransitionConfig<
    CompositionModel<CompositionValue>,
    CompositionMessage<CompositionValue>
  >
  /**
   * Deep-freezes Models after init and update under Vite development mode.
   * Defaults to true; production is unaffected. Set false to disable.
   */
  freezeModel?: boolean
  /**
   * DevTools recording and overlay policy. Defaults to development-only
   * visibility; pass false to disable. Configure Message to permit decoded
   * external dispatch through the DevTools bridge.
   */
  devTools?: DevToolsConfig
}>

type ValidateElementFlags<FlagsSchema, FlagsEffect> =
  undefined extends FlagsSchema
    ? undefined extends FlagsEffect
      ? unknown
      : Readonly<{
          'ApplicationComposition.makeElement requires matching Flags and flags': FlagsEffect
        }>
    : FlagsSchema extends Schema.Codec<any, any, never, never>
      ? undefined extends FlagsEffect
        ? Readonly<{
            'ApplicationComposition.makeElement requires matching Flags and flags': FlagsSchema
          }>
        : FlagsEffect extends Effect.Effect<FlagsSchema['Type'], never, any>
          ? unknown
          : Readonly<{
              'ApplicationComposition.makeElement requires matching Flags and flags': FlagsEffect
            }>
      : never

type PageRootModeFields<
  CompositionValue extends AnyComposition,
  Init extends AnyRootFunction,
  FlagsSchema,
> = undefined extends FlagsSchema
  ? Parameters<Init> extends readonly []
    ? Readonly<{ Flags?: never; routing?: never }>
    : Parameters<Init> extends readonly [Url]
      ? Readonly<{
          Flags?: never
          routing: RoutingConfig<CompositionMessage<CompositionValue>>
        }>
      : never
  : FlagsSchema extends Schema.Codec<any, any, never, never>
    ? Parameters<Init> extends readonly [FlagsSchema['Type']]
      ? Readonly<{ Flags: FlagsSchema; routing?: never }>
      : Parameters<Init> extends readonly [FlagsSchema['Type'], Url]
        ? Readonly<{
            Flags: FlagsSchema
            routing: RoutingConfig<CompositionMessage<CompositionValue>>
          }>
        : never
    : never

type ElementRootModeFields<
  Init extends AnyRootFunction,
  FlagsSchema,
  FlagsEffect,
> = undefined extends FlagsSchema
  ? Parameters<Init> extends readonly []
    ? Readonly<{ Flags?: never; flags?: never }>
    : never
  : FlagsSchema extends Schema.Codec<any, any, never, never>
    ? Parameters<Init> extends readonly [FlagsSchema['Type']]
      ? Readonly<{ Flags: FlagsSchema; flags: FlagsEffect }>
      : never
    : never

type RootPorts<PortsValue> = undefined extends PortsValue
  ? undefined
  : Exclude<PortsValue, undefined>

/**
 * Completes an Application Composition as a passive page-owning Application.
 * Captures the registered graph, implementation and browser configuration.
 * Remaining ordinary Service requirements stay in the returned type until
 * application.provide supplies them. Runtime.run builds Layers and starts it.
 */
export interface MakeApplication<CompositionValue extends AnyComposition> {
  <
    const Init extends AnyRootFunction,
    const UpdateFunction extends AnyRootFunction,
    const View extends AnyRootFunction,
    const SubscriptionsValue extends
      | RootSubscriptions<CompositionValue>
      | undefined,
    const ManagedResourcesValue extends
      | RootManagedResources<CompositionValue>
      | undefined,
    const EffectsLayerValue extends AnyLayer | undefined,
    const FlagsSchema extends Schema.Codec<any, any, never, never> | undefined,
    const PortsValue extends Ports | undefined,
    const UpdateSource = unknown,
  >(
    config: PageRootInput<
      CompositionValue,
      Init,
      RootUpdateInput<UpdateFunction, UpdateSource>,
      View,
      SubscriptionsValue,
      ManagedResourcesValue,
      EffectsLayerValue,
      FlagsSchema,
      PortsValue
    > &
      NoInfer<PageRootModeFields<CompositionValue, Init, FlagsSchema>> &
      NoInfer<
        ValidateRoot<
          CompositionValue,
          PreciseRootImplementation<
            Init,
            PreciseRootUpdate<UpdateFunction, UpdateSource>,
            View,
            SubscriptionsValue,
            ManagedResourcesValue,
            EffectsLayerValue
          >,
          Parameters<Init>,
          'Document'
        >
      >,
  ): Application<
    RootPorts<PortsValue>,
    RootFlags<FlagsSchema>,
    RootRequirements<
      CompositionValue,
      PreciseRootImplementation<
        Init,
        PreciseRootUpdate<UpdateFunction, UpdateSource>,
        View,
        SubscriptionsValue,
        ManagedResourcesValue,
        EffectsLayerValue
      >
    >,
    RootRuntimeServices<
      CompositionValue,
      PreciseRootImplementation<
        Init,
        PreciseRootUpdate<UpdateFunction, UpdateSource>,
        View,
        SubscriptionsValue,
        ManagedResourcesValue,
        EffectsLayerValue
      >
    >,
    RootProvidedServices<
      CompositionValue,
      PreciseRootImplementation<
        Init,
        PreciseRootUpdate<UpdateFunction, UpdateSource>,
        View,
        SubscriptionsValue,
        ManagedResourcesValue,
        EffectsLayerValue
      >
    >
  >
}

/**
 * Completes an Application Composition as a passive container-scoped Element.
 * Its owned view returns Html. Optional Flags are resolved at Runtime startup
 * from the supplied Effect. Runtime.run or Runtime.embed builds its Layers and
 * starts its lifecycle work; completion does not execute handlers.
 */
export interface MakeElement<CompositionValue extends AnyComposition> {
  <
    const Init extends AnyRootFunction,
    const UpdateFunction extends AnyRootFunction,
    const View extends AnyRootFunction,
    const SubscriptionsValue extends
      | RootSubscriptions<CompositionValue>
      | undefined,
    const ManagedResourcesValue extends
      | RootManagedResources<CompositionValue>
      | undefined,
    const EffectsLayerValue extends AnyLayer | undefined,
    const FlagsSchema extends Schema.Codec<any, any, never, never> | undefined,
    const FlagsEffect extends Effect.Effect<any, never, any> | undefined,
    const PortsValue extends Ports | undefined,
    const UpdateSource = unknown,
  >(
    config: ElementRootInput<
      CompositionValue,
      Init,
      RootUpdateInput<UpdateFunction, UpdateSource>,
      View,
      SubscriptionsValue,
      ManagedResourcesValue,
      EffectsLayerValue,
      FlagsSchema,
      FlagsEffect,
      PortsValue
    > &
      NoInfer<ElementRootModeFields<Init, FlagsSchema, FlagsEffect>> &
      NoInfer<ValidateElementFlags<FlagsSchema, FlagsEffect>> &
      NoInfer<
        ValidateRoot<
          CompositionValue,
          PreciseRootImplementation<
            Init,
            PreciseRootUpdate<UpdateFunction, UpdateSource>,
            View,
            SubscriptionsValue,
            ManagedResourcesValue,
            EffectsLayerValue
          >,
          Parameters<Init>,
          'Element'
        >
      >,
  ): Element<
    RootPorts<PortsValue>,
    | RootRequirements<
        CompositionValue,
        PreciseRootImplementation<
          Init,
          PreciseRootUpdate<UpdateFunction, UpdateSource>,
          View,
          SubscriptionsValue,
          ManagedResourcesValue,
          EffectsLayerValue
        >
      >
    | RootFlagsRequirements<FlagsEffect>,
    RootRuntimeServices<
      CompositionValue,
      PreciseRootImplementation<
        Init,
        PreciseRootUpdate<UpdateFunction, UpdateSource>,
        View,
        SubscriptionsValue,
        ManagedResourcesValue,
        EffectsLayerValue
      >
    >,
    RootProvidedServices<
      CompositionValue,
      PreciseRootImplementation<
        Init,
        PreciseRootUpdate<UpdateFunction, UpdateSource>,
        View,
        SubscriptionsValue,
        ManagedResourcesValue,
        EffectsLayerValue
      >
    >
  >
}

/**
 * Internal implementation of the owned makeApplication completion method.
 * Captures passive configuration and validates handler and view coverage.
 * The Runtime constructs the selected handler and Service Layers at start.
 */
export function makeApplication<
  const CompositionValue extends AnyComposition,
  const Init extends AnyRootFunction,
  const UpdateFunction extends AnyRootFunction,
  const View extends AnyRootFunction,
  const SubscriptionsValue extends
    | RootSubscriptions<CompositionValue>
    | undefined,
  const ManagedResourcesValue extends
    | RootManagedResources<CompositionValue>
    | undefined,
  const EffectsLayerValue extends AnyLayer | undefined,
  const FlagsSchema extends Schema.Codec<any, any, never, never> | undefined,
  const PortsValue extends Ports | undefined,
>(
  composition: CompositionValue,
  config: PageRootInput<
    CompositionValue,
    Init,
    UpdateFunction,
    View,
    SubscriptionsValue,
    ManagedResourcesValue,
    EffectsLayerValue,
    FlagsSchema,
    PortsValue
  > &
    NoInfer<PageRootModeFields<CompositionValue, Init, FlagsSchema>> &
    NoInfer<
      ValidateRoot<
        CompositionValue,
        PreciseRootImplementation<
          Init,
          UpdateFunction,
          View,
          SubscriptionsValue,
          ManagedResourcesValue,
          EffectsLayerValue
        >,
        Parameters<Init>,
        'Document'
      >
    >,
): Application<
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  RootRequirements<
    CompositionValue,
    PreciseRootImplementation<
      Init,
      UpdateFunction,
      View,
      SubscriptionsValue,
      ManagedResourcesValue,
      EffectsLayerValue
    >
  >,
  RootRuntimeServices<
    CompositionValue,
    PreciseRootImplementation<
      Init,
      UpdateFunction,
      View,
      SubscriptionsValue,
      ManagedResourcesValue,
      EffectsLayerValue
    >
  >,
  RootProvidedServices<
    CompositionValue,
    PreciseRootImplementation<
      Init,
      UpdateFunction,
      View,
      SubscriptionsValue,
      ManagedResourcesValue,
      EffectsLayerValue
    >
  >
>
export function makeApplication(composition: AnyComposition, config: any): any {
  const { block, options } = completeRoot(composition, config)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const lowered = lowerBlock(block as never)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const application = __makeFromConfig({ ...options, ...lowered } as never)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return installBlock(application, block as never)
}

/**
 * Internal implementation of the owned makeElement completion method.
 * Captures passive container configuration; the Runtime constructs handler
 * Layers and starts lifecycle work later.
 */
export function makeElement<
  const CompositionValue extends AnyComposition,
  const Init extends AnyRootFunction,
  const UpdateFunction extends AnyRootFunction,
  const View extends AnyRootFunction,
  const SubscriptionsValue extends
    | RootSubscriptions<CompositionValue>
    | undefined,
  const ManagedResourcesValue extends
    | RootManagedResources<CompositionValue>
    | undefined,
  const EffectsLayerValue extends AnyLayer | undefined,
  const FlagsSchema extends Schema.Codec<any, any, never, never> | undefined,
  const FlagsEffect extends Effect.Effect<any, never, any> | undefined,
  const PortsValue extends Ports | undefined,
>(
  composition: CompositionValue,
  config: ElementRootInput<
    CompositionValue,
    Init,
    UpdateFunction,
    View,
    SubscriptionsValue,
    ManagedResourcesValue,
    EffectsLayerValue,
    FlagsSchema,
    FlagsEffect,
    PortsValue
  > &
    NoInfer<ElementRootModeFields<Init, FlagsSchema, FlagsEffect>> &
    NoInfer<ValidateElementFlags<FlagsSchema, FlagsEffect>> &
    NoInfer<
      ValidateRoot<
        CompositionValue,
        PreciseRootImplementation<
          Init,
          UpdateFunction,
          View,
          SubscriptionsValue,
          ManagedResourcesValue,
          EffectsLayerValue
        >,
        Parameters<Init>,
        'Element'
      >
    >,
): Element<
  RootPorts<PortsValue>,
  | RootRequirements<
      CompositionValue,
      PreciseRootImplementation<
        Init,
        UpdateFunction,
        View,
        SubscriptionsValue,
        ManagedResourcesValue,
        EffectsLayerValue
      >
    >
  | RootFlagsRequirements<FlagsEffect>,
  RootRuntimeServices<
    CompositionValue,
    PreciseRootImplementation<
      Init,
      UpdateFunction,
      View,
      SubscriptionsValue,
      ManagedResourcesValue,
      EffectsLayerValue
    >
  >,
  RootProvidedServices<
    CompositionValue,
    PreciseRootImplementation<
      Init,
      UpdateFunction,
      View,
      SubscriptionsValue,
      ManagedResourcesValue,
      EffectsLayerValue
    >
  >
>
export function makeElement(composition: AnyComposition, config: any): any {
  const { block, options } = completeRoot(composition, config)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const element = __makeElementFromConfig({
    ...options,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    ...lowerBlock(block as never),
  } as never)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return installBlock(element, block as never)
}

const completeRoot = (
  composition: AnyComposition,
  config: any,
): Readonly<{
  block: AnyBlock
  options: globalThis.Record<string, unknown>
}> => {
  const {
    init,
    update,
    view,
    subscriptions,
    managedResources,
    EffectsLayer = Layer.empty,
    ...options
  } = config
  const implementation = {
    init,
    update,
    view,
    ...(subscriptions === undefined ? {} : { subscriptions }),
    ...(managedResources === undefined ? {} : { managedResources }),
    EffectsLayer,
  }

  return {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    block: complete(composition, implementation) as AnyBlock,
    options,
  }
}

const installBlock = (program: any, block: AnyBlock): any => {
  const internals = runtimeInternals.get(program)!
  const nativeStart = internals.startWithApplicationLayer
  internals.compositionRoot = block
  internals.startWithApplicationLayer = (
    connector,
    preservedModel,
    bootMode,
    flags,
    buildId,
    layer,
  ) =>
    nativeStart(
      connector,
      preservedModel,
      bootMode,
      flags,
      buildId,
      qualifyLayer(block.owner.id, layer),
    )
  return provideProgram(
    program,
    // oxlint-disable-next-line typescript/consistent-type-assertions
    block.EffectsLayer as Layer.Layer<any, any, any>,
  )
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
      '[foldkit] application.provide expects a program created by ApplicationComposition.makeApplication or ApplicationComposition.makeElement.',
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
