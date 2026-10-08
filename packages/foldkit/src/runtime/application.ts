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
import type { Ports } from '../port/index.js'
import type { Return as UpdateReturn } from '../update/index.js'
import type {
  ApplicationConfig,
  ApplicationConfigWithFlags,
  RoutingApplicationConfig,
  RoutingApplicationConfigWithFlags,
} from './makeApplication.js'
import { makeApplication } from './makeApplication.js'
import { type MakeRuntimeReturn, runtimeInternals } from './runtime.js'

declare const ApplicationTypeId: unique symbol

type WithoutResources<Config> = Omit<Config, 'resources'> &
  Readonly<{ resources?: never }>

type ApplicationConfigWithoutResources<Model, Message> = WithoutResources<
  ApplicationConfig<Model, Message, any, any, any>
>

type ApplicationConfigWithFlagsWithoutResources<Model, Message, Flags> =
  WithoutResources<
    ApplicationConfigWithFlags<Model, Message, Flags, any, any, any>
  >

type RoutingApplicationConfigWithoutResources<Model, Message> =
  WithoutResources<RoutingApplicationConfig<Model, Message, any, any, any>>

type RoutingApplicationConfigWithFlagsWithoutResources<Model, Message, Flags> =
  WithoutResources<
    RoutingApplicationConfigWithFlags<Model, Message, Flags, any, any, any>
  >

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

type PendingApplication<
  P extends Ports | undefined,
  Flags,
  Requirements,
  RuntimeServices,
> = Readonly<{
  ports: P
  [ApplicationTypeId]: Readonly<{
    Flags: (flags: Flags) => Flags
    Requirements: (requirements: Requirements) => Requirements
    RuntimeServices: (services: RuntimeServices) => RuntimeServices
  }>
}>

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
  : PendingApplication<P, Flags, Requirements, RuntimeServices>

/** Defines a page-owning Foldkit application and preserves the services its
 * init Commands, update Commands, and Subscriptions require. */
export function make<
  const ModelSchema extends Schema.Codec<any, any, any, any>,
  const FlagsSchema extends Schema.Codec<any, any, never, never>,
  const Update extends (model: ModelSchema['Type'], message: any) => any,
  const Config extends Omit<
    RoutingApplicationConfigWithFlagsWithoutResources<
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
    RoutingApplicationConfigWithoutResources<
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
    ApplicationConfigWithFlagsWithoutResources<
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
    ApplicationConfigWithoutResources<
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

export function make(
  config:
    | RoutingApplicationConfigWithFlagsWithoutResources<any, any, any>
    | RoutingApplicationConfigWithoutResources<any, any>
    | ApplicationConfigWithFlagsWithoutResources<any, any, any>
    | ApplicationConfigWithoutResources<any, any>,
): unknown {
  if (config.subscriptions) {
    assertDistinctHandlerNames('Subscription', config.subscriptions)
  }

  if (config.managedResources) {
    assertDistinctHandlerNames('ManagedResource', config.managedResources)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return makeApplication(config as any)
}

/** Supplies the services a Layer produces and carries its own requirements
 * forward on the application. Layers are built once for each runtime start
 * and released when that runtime stops. */
export const provide = <
  P extends Ports | undefined,
  Flags,
  CurrentRequirements,
  RuntimeServices,
  Provided extends CurrentRequirements,
  E,
  Needed,
>(
  application: PendingApplication<
    P,
    Flags,
    CurrentRequirements,
    RuntimeServices
  >,
  layer: Layer.Layer<Provided, E, Needed>,
): Application<
  P,
  Flags,
  ResidualRequirements<CurrentRequirements, Provided, Needed, RuntimeServices>,
  RuntimeServices
> => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const program = application as unknown as MakeRuntimeReturn<
    P,
    Flags,
    CurrentRequirements,
    'Application'
  >
  const internals = runtimeInternals.get(program)

  if (internals === undefined) {
    throw new Error(
      '[foldkit] Application.provide expects an application created by Application.make.',
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
  return provided as unknown as Application<
    P,
    Flags,
    ResidualRequirements<
      CurrentRequirements,
      Provided,
      Needed,
      RuntimeServices
    >,
    RuntimeServices
  >
}
