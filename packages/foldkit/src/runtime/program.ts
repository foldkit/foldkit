import { Effect, Layer, Schema } from 'effect'

import type { AnyBlock, AnyProgramBlock } from '../block/definition.js'
import { lowerBlock } from '../block/lowering.js'
import type {
  EffectsLayerOfBlock,
  RequirementsOfBlock,
  RuntimeServicesOfBlock,
} from '../block/requirements.js'
import type { UrlRequest } from '../navigation/urlRequest.js'
import type { Ports } from '../port/index.js'
import type { Url } from '../url/index.js'
import {
  __makeElementFromConfig,
  __makeFromConfig,
  installBlock,
} from './application.js'
import {
  type RoutingConfig,
  type RoutingInputConfig,
  type RoutingMessageConstructor,
  normalizeRoutingInputConfig,
} from './browserListeners.js'
import type { CrashConfig, ElementCrashConfig } from './crashUI.js'
import type { DevToolsConfig, RuntimeDevToolsConfig } from './devToolsConfig.js'
import type { ValidHandlerContracts } from './handlerContracts.js'
import {
  type ValidateProgramBlock,
  assertDocument,
  assertElementHtml,
  assertProgramConfig,
} from './programRoot.js'
import type { SlowConfig } from './slowPhase.js'
import type { ViewTransitionConfig } from './viewTransition.js'

type AnyFlagsSchema = Schema.Codec<any, any, never, never>

type BlockModel<BlockValue extends AnyProgramBlock> =
  BlockValue['Model']['Type']
type BlockMessage<BlockValue extends AnyProgramBlock> =
  BlockValue['Message']['Type']
type BlockInit<BlockValue extends AnyProgramBlock> = BlockValue['init']

type BlocksRejectingMessage<
  BlockValue extends AnyProgramBlock,
  Message,
> = BlockValue extends unknown
  ? Message extends BlockMessage<BlockValue>
    ? never
    : BlockValue
  : never

type MessageAcceptedByEveryBlock<
  BlockValue extends AnyProgramBlock,
  Message,
> = Message extends unknown
  ? [BlocksRejectingMessage<BlockValue, Message>] extends [never]
    ? Message
    : never
  : never

type CommonBlockMessage<BlockValue extends AnyProgramBlock> =
  MessageAcceptedByEveryBlock<BlockValue, BlockMessage<BlockValue>>

type AcceptsExactly<
  Function extends (...args: ReadonlyArray<any>) => any,
  Args,
> = [Parameters<Function>, Args] extends [Args, Parameters<Function>]
  ? true
  : false

type BlocksRejectingInit<
  BlockValue extends AnyProgramBlock,
  Args,
> = BlockValue extends unknown
  ? AcceptsExactly<BlockInit<BlockValue>, Args> extends true
    ? never
    : BlockValue
  : never

type EveryBlockAcceptsExactly<BlockValue extends AnyProgramBlock, Args> = [
  BlocksRejectingInit<BlockValue, Args>,
] extends [never]
  ? true
  : false

type CommonHostOptions<
  BlockValue extends AnyProgramBlock,
  PortsValue extends Ports | undefined,
> = Readonly<{
  /** The Model Schema belongs to the completed root Block. */
  Model?: never
  /** Block init belongs to the completed root Block. */
  init?: never
  /** Block update belongs to the completed root Block. */
  update?: never
  /** The default view belongs to the completed root Block. */
  view?: never
  /** Subscriptions belong to the completed root Block. */
  subscriptions?: never
  /** ManagedResources belong to the completed root Block. */
  managedResources?: never
  /** The EffectsLayer belongs to the completed root Block. */
  EffectsLayer?: never
  /** Host handlers must be resolved on the completed root Block. */
  hostHandlers?: never
  /** The DOM element owned by this Program. */
  container: HTMLElement | null
  /** Declared inbound and outbound Ports. */
  ports?: PortsValue
  /** Slow phase measurement and reporting policy. */
  slow?: SlowConfig<BlockModel<BlockValue>, BlockMessage<BlockValue>>
  /** Opt-in predicate for browser view transitions. */
  viewTransition?: ViewTransitionConfig<
    BlockModel<BlockValue>,
    BlockMessage<BlockValue>
  >
  /** Deep-freezes Models after init and update under Vite development mode. */
  freezeModel?: boolean
  /** DevTools recording and overlay policy. */
  devTools?: DevToolsConfig
}>

type PageHostOptions<
  BlockValue extends AnyProgramBlock,
  PortsValue extends Ports | undefined,
> = CommonHostOptions<BlockValue, PortsValue> &
  Readonly<{
    /** Optional crash rendering and reporting policy. */
    crash?: CrashConfig<BlockModel<BlockValue>, BlockMessage<BlockValue>>
    /** Preserves window scroll across Vite development reloads. */
    preserveScroll?: boolean
  }>

type ElementHostOptions<
  BlockValue extends AnyProgramBlock,
  PortsValue extends Ports | undefined,
> = CommonHostOptions<BlockValue, PortsValue> &
  Readonly<{
    /** Optional crash rendering and reporting policy. */
    crash?: ElementCrashConfig<BlockModel<BlockValue>, BlockMessage<BlockValue>>
  }>

type PageWithoutRoutingModeFields<
  BlockValue extends AnyProgramBlock,
  FlagsSchema extends AnyFlagsSchema | undefined,
> = undefined extends FlagsSchema
  ? EveryBlockAcceptsExactly<BlockValue, []> extends true
    ? Readonly<{ Flags?: never; routing?: never }>
    : never
  : FlagsSchema extends AnyFlagsSchema
    ? EveryBlockAcceptsExactly<BlockValue, [FlagsSchema['Type']]> extends true
      ? Readonly<{ Flags: FlagsSchema; routing?: never }>
      : never
    : never

type PageWithRoutingModeFields<
  BlockValue extends AnyProgramBlock,
  FlagsSchema extends AnyFlagsSchema | undefined,
  Routing,
> = undefined extends FlagsSchema
  ? EveryBlockAcceptsExactly<BlockValue, [Url]> extends true
    ? Readonly<{ Flags?: never; routing: Routing }>
    : never
  : FlagsSchema extends AnyFlagsSchema
    ? EveryBlockAcceptsExactly<
        BlockValue,
        [FlagsSchema['Type'], Url]
      > extends true
      ? Readonly<{ Flags: FlagsSchema; routing: Routing }>
      : never
    : never

type RoutingRequestConstructor<Message> = RoutingMessageConstructor<
  'request',
  UrlRequest,
  Message
>

type RoutingUrlConstructor<Message> = RoutingMessageConstructor<
  'url',
  Url,
  Message
>

type ConstructorRoutingConfig<Message> = Readonly<{
  onUrlRequest: RoutingRequestConstructor<Message>
  onUrlChange: RoutingUrlConstructor<Message>
}>

type ConstructorRequestRoutingConfig<Message> = Readonly<{
  onUrlRequest: RoutingRequestConstructor<Message>
  onUrlChange: (url: Url) => Message
}>

type ConstructorUrlRoutingConfig<Message> = Readonly<{
  onUrlRequest: (request: UrlRequest) => Message
  onUrlChange: RoutingUrlConstructor<Message>
}>

type ElementWithoutFlagsModeFields<BlockValue extends AnyProgramBlock> =
  EveryBlockAcceptsExactly<BlockValue, []> extends true
    ? Readonly<{ Flags?: never; flags?: never }>
    : never

type ElementWithFlagsModeFields<
  BlockValue extends AnyProgramBlock,
  FlagsSchema extends AnyFlagsSchema,
  FlagsEffect extends Effect.Effect<FlagsSchema['Type'], never, any>,
> =
  EveryBlockAcceptsExactly<BlockValue, [FlagsSchema['Type']]> extends true
    ? Readonly<{ Flags: FlagsSchema; flags: FlagsEffect }>
    : never

type RootFlags<FlagsSchema> = undefined extends FlagsSchema
  ? void
  : FlagsSchema extends AnyFlagsSchema
    ? FlagsSchema['Type']
    : never

type RootPorts<PortsValue> = undefined extends PortsValue
  ? undefined
  : Exclude<PortsValue, undefined>

type FlagsRequirements<FlagsEffect> =
  FlagsEffect extends Effect.Effect<any, any, infer Requirements>
    ? Requirements
    : never

type DevToolsDispatchValue<Value> = Value extends object
  ? 'dispatch' extends keyof Value
    ? Value[Extract<'dispatch', keyof Value>]
    : never
  : never

type ProgramDispatchRequirements<
  BlockValue extends AnyProgramBlock,
  Config,
> = Config extends unknown
  ? 'devTools' extends keyof Config
    ? true extends DevToolsDispatchValue<
        Config[Extract<'devTools', keyof Config>]
      >
      ? BlockValue['Message']['DecodingServices']
      : never
    : never
  : never

type ResidualProgramDispatchRequirements<
  BlockValue extends AnyProgramBlock,
  Config,
> = BlockValue extends unknown
  ? Exclude<
      ProgramDispatchRequirements<BlockValue, Config>,
      | Layer.Success<EffectsLayerOfBlock<BlockValue>>
      | RuntimeServicesOfBlock<BlockValue>
    >
  : never

type ProgramRequirements<BlockValue extends AnyProgramBlock, Config> =
  | RequirementsOfBlock<BlockValue>
  | ResidualProgramDispatchRequirements<BlockValue, Config>

type ExactHostConfig<Config, AllowedKeys extends PropertyKey> = Readonly<{
  [Key in Exclude<keyof Config, AllowedKeys>]: never
}>

type ConfiguredDevToolsValue<Config> = Config extends unknown
  ? 'devTools' extends keyof Config
    ? Config[Extract<'devTools', keyof Config>]
    : never
  : never

type InvalidDevToolsKeys<Value> = Value extends object
  ? Exclude<keyof Value, keyof Exclude<DevToolsConfig, false>>
  : never

type ExactDevToolsConfig<Config> = [
  InvalidDevToolsKeys<ConfiguredDevToolsValue<Config>>,
] extends [never]
  ? unknown
  : Readonly<{
      devTools?:
        | false
        | (Exclude<DevToolsConfig, false> &
            Readonly<{
              [
                Key in InvalidDevToolsKeys<ConfiguredDevToolsValue<Config>>
              ]?: never
            }>)
    }>

type PageHostConfigKeys =
  | 'block'
  | 'Flags'
  | 'routing'
  | keyof PageHostOptions<AnyBlock, Ports | undefined>

type ElementHostConfigKeys =
  | 'block'
  | 'Flags'
  | 'flags'
  | keyof ElementHostOptions<AnyBlock, Ports | undefined>

type ExactPageHostConfig<Config> = ExactHostConfig<Config, PageHostConfigKeys> &
  ExactDevToolsConfig<Config>
type ExactElementHostConfig<Config> = ExactHostConfig<
  Config,
  ElementHostConfigKeys
> &
  ExactDevToolsConfig<Config>

type ResidualRequirements<Current, Provided, Needed, RuntimeServices> = Exclude<
  Exclude<Current, Provided> | Needed,
  RuntimeServices
>

/** @internal Derives the bridge-only dispatch Schema from the completed root Block. */
export const resolveProgramDevToolsConfig = <
  const DispatchSchema extends Schema.Codec<any, any, any, any>,
>(
  devTools: DevToolsConfig | undefined,
  dispatchSchema: DispatchSchema,
): RuntimeDevToolsConfig<DispatchSchema['DecodingServices']> | undefined => {
  if (
    devTools === undefined ||
    devTools === false ||
    devTools.dispatch !== true
  ) {
    return devTools
  }

  return { ...devTools, dispatchSchema }
}

/** A Program that is ready to be started by the Foldkit Runtime. */
export interface Runnable<
  P extends Ports | undefined,
  Flags,
  Resources,
  Kind extends 'Application' | 'Element' = 'Application',
> {
  readonly runtimeId: string
  readonly start: (preservedModel?: unknown) => Effect.Effect<void>
  readonly ports: P
  readonly '~foldkit/RuntimeBoot'?: Readonly<{
    Flags: (flags: Flags) => Flags
    Resources: (resources: Resources) => Resources
    Kind: Kind
  }>
}

/** A Program awaiting ordinary Service providers. */
export interface Pending<
  P extends Ports | undefined,
  Flags,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  Kind extends 'Application' | 'Element' = 'Application',
> {
  /** @internal Retains provisioning channels for public type inference. */
  readonly '~foldkit/ProgramProvision'?: Readonly<{
    Requirements: (requirements: Requirements) => Requirements
    RuntimeServices: (runtimeServices: RuntimeServices) => RuntimeServices
    ProvidedServices: (providedServices: ProvidedServices) => ProvidedServices
  }>
  /** Port declarations supplied to this Program. */
  readonly ports: P
  /** Supplies ordinary Services while preserving remaining requirements. */
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
}

type PublicProgram<
  P extends Ports | undefined,
  Flags,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  Kind extends 'Application' | 'Element',
> = Pending<P, Flags, Requirements, RuntimeServices, ProvidedServices, Kind> &
  ([Requirements] extends [never]
    ? Runnable<P, Flags, ProvidedServices, Kind>
    : unknown)

/** A page-owning Program produced from a completed root Block. */
export type Program<
  P extends Ports | undefined = undefined,
  Flags = void,
  Requirements = never,
  RuntimeServices = never,
  ProvidedServices = never,
> = PublicProgram<
  P,
  Flags,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  'Application'
>

/** A container-scoped Program produced from a completed root Block. */
export type Element<
  P extends Ports | undefined = undefined,
  Requirements = never,
  RuntimeServices = never,
  ProvidedServices = never,
> = PublicProgram<
  P,
  void,
  Requirements,
  RuntimeServices,
  ProvidedServices,
  'Element'
>

/** Creates a passive page-owning Program from a completed root Block. */
export function make<
  const Config extends object,
  const BlockValue extends AnyProgramBlock,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<BlockValue>, PortsValue> &
    PageWithoutRoutingModeFields<NoInfer<BlockValue>, FlagsSchema> &
    NoInfer<ValidateProgramBlock<BlockValue, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): Program<
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  ProgramRequirements<BlockValue, Config>,
  RuntimeServicesOfBlock<BlockValue>,
  Layer.Success<EffectsLayerOfBlock<BlockValue>>
>
export function make<
  const Config extends object,
  const BlockValue extends AnyProgramBlock,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<BlockValue>, PortsValue> &
    PageWithRoutingModeFields<
      NoInfer<BlockValue>,
      FlagsSchema,
      RoutingConfig<NoInfer<CommonBlockMessage<BlockValue>>>
    > &
    NoInfer<ValidateProgramBlock<BlockValue, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): Program<
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  ProgramRequirements<BlockValue, Config>,
  RuntimeServicesOfBlock<BlockValue>,
  Layer.Success<EffectsLayerOfBlock<BlockValue>>
>
export function make<
  const Config extends object,
  const BlockValue extends AnyProgramBlock,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<BlockValue>, PortsValue> &
    PageWithRoutingModeFields<
      NoInfer<BlockValue>,
      FlagsSchema,
      ConstructorRoutingConfig<NoInfer<CommonBlockMessage<BlockValue>>>
    > &
    NoInfer<ValidateProgramBlock<BlockValue, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): Program<
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  ProgramRequirements<BlockValue, Config>,
  RuntimeServicesOfBlock<BlockValue>,
  Layer.Success<EffectsLayerOfBlock<BlockValue>>
>
export function make<
  const Config extends object,
  const BlockValue extends AnyProgramBlock,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<BlockValue>, PortsValue> &
    PageWithRoutingModeFields<
      NoInfer<BlockValue>,
      FlagsSchema,
      ConstructorRequestRoutingConfig<NoInfer<CommonBlockMessage<BlockValue>>>
    > &
    NoInfer<ValidateProgramBlock<BlockValue, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): Program<
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  ProgramRequirements<BlockValue, Config>,
  RuntimeServicesOfBlock<BlockValue>,
  Layer.Success<EffectsLayerOfBlock<BlockValue>>
>
export function make<
  const Config extends object,
  const BlockValue extends AnyProgramBlock,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<BlockValue>, PortsValue> &
    PageWithRoutingModeFields<
      NoInfer<BlockValue>,
      FlagsSchema,
      ConstructorUrlRoutingConfig<NoInfer<CommonBlockMessage<BlockValue>>>
    > &
    NoInfer<ValidateProgramBlock<BlockValue, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): Program<
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  ProgramRequirements<BlockValue, Config>,
  RuntimeServicesOfBlock<BlockValue>,
  Layer.Success<EffectsLayerOfBlock<BlockValue>>
>
export function make(config: unknown): unknown {
  assertProgramConfig(config, 'Document')
  const { block, routing, devTools, ...hostOptions } = config
  const lowered = lowerBlock(block)
  const view = (model: unknown, h: unknown) => {
    const output = lowered.view(model, h)
    assertDocument(output)
    return output
  }
  const application = __makeFromConfig(
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    {
      ...hostOptions,
      devTools: resolveProgramDevToolsConfig(devTools, block.Message),
      ...(routing === undefined
        ? {}
        : {
            routing: normalizeRoutingInputConfig(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              routing as RoutingInputConfig<unknown>,
            ),
          }),
      ...lowered,
      view,
    } as never,
  )

  return installBlock(application, block)
}

/** Creates a passive container-scoped Program from a completed root Block. */
export function makeElement<
  const Config extends object,
  const BlockValue extends AnyProgramBlock,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    ElementHostOptions<NoInfer<BlockValue>, PortsValue> &
    ElementWithoutFlagsModeFields<NoInfer<BlockValue>> &
    NoInfer<ValidateProgramBlock<BlockValue, 'Element'>> &
    NoInfer<ExactElementHostConfig<Config>>,
): Element<
  RootPorts<PortsValue>,
  ProgramRequirements<BlockValue, Config>,
  RuntimeServicesOfBlock<BlockValue>,
  Layer.Success<EffectsLayerOfBlock<BlockValue>>
>
export function makeElement<
  const Config extends object,
  const BlockValue extends AnyProgramBlock,
  const FlagsSchema extends AnyFlagsSchema,
  const FlagsEffect extends Effect.Effect<FlagsSchema['Type'], never, any>,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    ElementHostOptions<NoInfer<BlockValue>, PortsValue> &
    ElementWithFlagsModeFields<NoInfer<BlockValue>, FlagsSchema, FlagsEffect> &
    NoInfer<ValidateProgramBlock<BlockValue, 'Element'>> &
    NoInfer<ExactElementHostConfig<Config>>,
): Element<
  RootPorts<PortsValue>,
  ProgramRequirements<BlockValue, Config> | FlagsRequirements<FlagsEffect>,
  RuntimeServicesOfBlock<BlockValue>,
  Layer.Success<EffectsLayerOfBlock<BlockValue>>
>
export function makeElement(config: unknown): unknown {
  assertProgramConfig(config, 'Element')
  const { block, devTools, ...hostOptions } = config
  const lowered = lowerBlock(block)
  const view = (model: unknown, h: unknown) => {
    const output = lowered.view(model, h)
    assertElementHtml(output)
    return output
  }
  const element = __makeElementFromConfig(
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    {
      ...hostOptions,
      devTools: resolveProgramDevToolsConfig(devTools, block.Message),
      ...lowered,
      view,
    } as never,
  )

  return installBlock(element, block)
}
