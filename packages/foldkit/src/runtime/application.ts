import {
  Effect,
  Layer,
  Option,
  Predicate,
  Schema,
  type Scope,
  Stream,
} from 'effect'

import type { ServicesOf as ManagedResourceServicesOf } from '../managedResource/index.js'
import {
  type LayeredMountDefinition,
  type MountAction,
  MountRegistrationTypeId,
} from '../mount/index.js'
import type { Ports } from '../port/index.js'
import type { Return as UpdateReturn } from '../update/index.js'
import type {
  ApplicationConfig,
  ApplicationConfigWithFlags,
  RoutingApplicationConfig,
  RoutingApplicationConfigWithFlags,
} from './makeApplication.js'
import { makeApplication } from './makeApplication.js'
import type { ElementConfig, ElementConfigWithFlags } from './makeElement.js'
import { makeElement as makeRuntimeElement } from './makeElement.js'
import { type MakeRuntimeReturn, runtimeInternals } from './runtime.js'

declare const ApplicationTypeId: unique symbol

type InferredApplicationConfig<Model, Message> = ApplicationConfig<
  Model,
  Message,
  any,
  any,
  any
>

type InferredApplicationConfigWithFlags<Model, Message, Flags> =
  ApplicationConfigWithFlags<Model, Message, Flags, any, any, any>

type InferredRoutingApplicationConfig<Model, Message> =
  RoutingApplicationConfig<Model, Message, any, any, any>

type InferredRoutingApplicationConfigWithFlags<Model, Message, Flags> =
  RoutingApplicationConfigWithFlags<Model, Message, Flags, any, any, any>

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

type ValidUpdate<Model, Update> = Update extends (
  model: Model,
  message: infer Message,
) => any
  ? (model: Model, message: Message) => UpdateReturn<Model, Message, unknown>
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

const assertDistinctMountNames = (
  mounts: ReadonlyArray<LayeredMountDefinition>,
): void => {
  const definitions = new Map<string, object>()

  for (const mount of mounts) {
    const previous = definitions.get(mount.name)
    const registration = mount[MountRegistrationTypeId]

    if (previous && previous !== registration) {
      throw new Error(
        `[foldkit] Mount handlers have the same name "${mount.name}" but different definitions. Give each definition a distinct name.`,
      )
    }

    definitions.set(mount.name, registration)
  }
}

type PendingApplication<
  P extends Ports | undefined,
  Flags,
  Requirements,
  RuntimeServices,
  Kind extends 'Application' | 'Element' = 'Application',
> = Readonly<{
  ports: P
  [ApplicationTypeId]: Readonly<{
    Flags: (flags: Flags) => Flags
    Requirements: (requirements: Requirements) => Requirements
    RuntimeServices: (services: RuntimeServices) => RuntimeServices
    Kind: Kind
  }>
}>

type Program<
  P extends Ports | undefined,
  Flags,
  Requirements,
  RuntimeServices,
  Kind extends 'Application' | 'Element',
> = [Requirements] extends [never]
  ? MakeRuntimeReturn<P, Flags, never, Kind>
  : PendingApplication<P, Flags, Requirements, RuntimeServices, Kind>

/** A page-owning Foldkit application whose Effect requirements are carried in
 * its type. Applications with no requirements can be passed directly to
 * `Runtime.run`. Supply a Layer to an application with requirements through
 * {@link provide} before starting it. */
export type Application<
  P extends Ports | undefined = undefined,
  Flags = void,
  Requirements = never,
  RuntimeServices = never,
> = [Requirements] extends [never]
  ? MakeRuntimeReturn<P, Flags, never, 'Application'>
  : PendingApplication<P, Flags, Requirements, RuntimeServices, 'Application'>

/** A container-scoped Foldkit Element whose Effect requirements are carried
 * in its type. Supply its handler Layers through {@link provide} before
 * passing it to `Runtime.run` or `Runtime.embed`. */
export type Element<
  P extends Ports | undefined = undefined,
  Requirements = never,
  RuntimeServices = never,
> = Program<P, void, Requirements, RuntimeServices, 'Element'>

/** Defines a page-owning Foldkit application and preserves the services its
 * init Commands, update Commands, and Subscriptions require. */
export function make<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const FlagsSchema extends Schema.Codec<any, any, never, never>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Config extends Omit<
    InferredRoutingApplicationConfigWithFlags<
      ModelSchema['Type'],
      UpdateMessage<Update>,
      FlagsSchema['Type']
    >,
    'Model' | 'Flags' | 'update'
  >,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      Flags: FlagsSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
    }>,
): Application<
  ConfigPorts<Config>,
  FlagsSchema['Type'],
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

export function make<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Config extends Omit<
    InferredRoutingApplicationConfig<
      ModelSchema['Type'],
      UpdateMessage<Update>
    >,
    'Model' | 'update'
  >,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
    }>,
): Application<
  ConfigPorts<Config>,
  void,
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

export function make<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const FlagsSchema extends Schema.Codec<any, any, never, never>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Config extends Omit<
    InferredApplicationConfigWithFlags<
      ModelSchema['Type'],
      UpdateMessage<Update>,
      FlagsSchema['Type']
    >,
    'Model' | 'Flags' | 'update'
  >,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      Flags: FlagsSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
    }>,
): Application<
  ConfigPorts<Config>,
  FlagsSchema['Type'],
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

export function make<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Config extends Omit<
    InferredApplicationConfig<ModelSchema['Type'], UpdateMessage<Update>>,
    'Model' | 'update'
  >,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
    }>,
): Application<
  ConfigPorts<Config>,
  void,
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

export function make(
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
    assertDistinctHandlerNames('ManagedResource', config.managedResources)
  }

  if (config.mounts) {
    assertDistinctMountNames(config.mounts)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return makeApplication(config as any)
}

/** Defines a container-scoped Foldkit Element with requirements inferred from
 * its Flags Effect, init and update Commands, Subscriptions, registered Mounts,
 * and ManagedResources. Its view returns `Html` and does not manage page
 * metadata. */
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
  >,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      Flags: FlagsSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
    }>,
): Element<
  ConfigPorts<Config>,
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

export function makeElement<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Config extends Omit<
    InferredElementConfig<ModelSchema['Type'], UpdateMessage<Update>>,
    'Model' | 'update'
  >,
>(
  config: Config &
    Readonly<{
      Model: ModelSchema
      update: Update & ValidUpdate<ModelSchema['Type'], Update>
    }>,
): Element<
  ConfigPorts<Config>,
  ConfigRequirements<Config, Update>,
  ManagedResourceRuntimeServices<Config>
>

export function makeElement(
  config:
    | InferredElementConfigWithFlags<any, any, any>
    | InferredElementConfig<any, any>,
): unknown {
  if (config.subscriptions) {
    assertDistinctHandlerNames('Subscription', config.subscriptions)
  }

  if (config.managedResources) {
    assertDistinctHandlerNames('ManagedResource', config.managedResources)
  }

  if (config.mounts) {
    assertDistinctMountNames(config.mounts)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return makeRuntimeElement(config as any)
}

/** Supplies the services a Layer produces and carries its own requirements
 * forward on the application. Combine independent feature Layers with
 * `Layer.mergeAll` before calling this once. A bundle may produce services
 * beyond the application's requirements; they remain available at runtime.
 * Layers are built once for each runtime start and released when it stops. */
export const provide = <
  P extends Ports | undefined,
  Flags,
  CurrentRequirements,
  RuntimeServices,
  Kind extends 'Application' | 'Element',
  Provided,
  E,
  Needed,
>(
  application: PendingApplication<
    P,
    Flags,
    CurrentRequirements,
    RuntimeServices,
    Kind
  >,
  layer: Layer.Layer<Provided, E, Needed>,
): Program<
  P,
  Flags,
  ResidualRequirements<CurrentRequirements, Provided, Needed, RuntimeServices>,
  RuntimeServices,
  Kind
> => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const program = application as unknown as MakeRuntimeReturn<
    P,
    Flags,
    CurrentRequirements,
    Kind
  >
  const internals = runtimeInternals.get(program)

  if (internals === undefined) {
    throw new Error(
      '[foldkit] Application.provide expects a program created by Application.make or Application.makeElement.',
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

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return provided as unknown as Program<
    P,
    Flags,
    ResidualRequirements<
      CurrentRequirements,
      Provided,
      Needed,
      RuntimeServices
    >,
    RuntimeServices,
    Kind
  >
}
