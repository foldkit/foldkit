import { Effect, Layer, Schema } from 'effect'

import type { AnyBlock } from '../block/definition.js'
import { lowerBlock } from '../block/lowering.js'
import type {
  RequirementsOfBlock,
  RuntimeServicesOfBlock,
} from '../block/requirements.js'
import { selectLayer } from '../experimental/contracted/runtime.js'
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
import { makeConstructedProgram } from './programConstruction.js'
import type { ConstructionProgramFromRoot } from './programConstructionTypes.js'
import {
  type ProgramViewDiagnostic,
  type ValidateProgramBlock,
  assertDocument,
  assertElementHtml,
  assertProgramConfig,
} from './programRoot.js'
import {
  type DeclaredHostContract,
  type DeclaredRootBlock,
  type LayeredContract,
  type LayeredRoot,
  type RootRequirements,
  type SelectedRootOfConfig,
  type ValidateSelectedConfig,
  assertCompletedRoot,
  rootConstructionOf,
} from './rootBlock.js'
import type { SlowConfig } from './slowPhase.js'
import type { ViewTransitionConfig } from './viewTransition.js'

export type {
  ConstructionPending,
  ConstructionProgram,
  ConstructionProgramFromRoot,
  ConstructionProviders,
} from './programConstructionTypes.js'

type AnyFlagsSchema = Schema.Codec<any, any, never, never>

type BlockModel<BlockValue extends AnyBlock> = BlockValue['Model']['Type']
type BlockMessage<BlockValue extends AnyBlock> = BlockValue['Message']['Type']
type BlockInit<BlockValue extends AnyBlock> = BlockValue['init']

type BlocksRejectingMessage<
  BlockValue extends AnyBlock,
  Message,
> = BlockValue extends unknown
  ? Message extends BlockMessage<BlockValue>
    ? never
    : BlockValue
  : never

type MessageAcceptedByEveryBlock<
  BlockValue extends AnyBlock,
  Message,
> = Message extends unknown
  ? [BlocksRejectingMessage<BlockValue, Message>] extends [never]
    ? Message
    : never
  : never

type CommonBlockMessage<BlockValue extends AnyBlock> =
  MessageAcceptedByEveryBlock<BlockValue, BlockMessage<BlockValue>>

type AcceptsExactly<
  Function extends (...args: ReadonlyArray<any>) => any,
  Args,
> = [Parameters<Function>, Args] extends [Args, Parameters<Function>]
  ? true
  : false

type InitializersRejectingArguments<
  Init extends (...args: ReadonlyArray<any>) => any,
  Args,
> = Init extends unknown
  ? AcceptsExactly<Init, Args> extends true
    ? never
    : Init
  : never

type EveryBlockAcceptsExactly<BlockValue extends AnyBlock, Args> = [
  InitializersRejectingArguments<BlockInit<BlockValue>, Args>,
] extends [never]
  ? true
  : false

type CommonHostOptions<
  BlockValue extends AnyBlock,
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
  /** The DOM element owned by this Program. Set its unique, nonempty id before passing it here. */
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
  BlockValue extends AnyBlock,
  PortsValue extends Ports | undefined,
> = CommonHostOptions<BlockValue, PortsValue> &
  Readonly<{
    /** Optional crash rendering and reporting policy. */
    crash?: CrashConfig<BlockModel<BlockValue>, BlockMessage<BlockValue>>
    /** Preserves window scroll across Vite development reloads. */
    preserveScroll?: boolean
  }>

type ElementHostOptions<
  BlockValue extends AnyBlock,
  PortsValue extends Ports | undefined,
> = CommonHostOptions<BlockValue, PortsValue> &
  Readonly<{
    /** Optional crash rendering and reporting policy. */
    crash?: ElementCrashConfig<BlockModel<BlockValue>, BlockMessage<BlockValue>>
  }>

type PageWithoutRoutingModeFields<
  BlockValue extends AnyBlock,
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
  BlockValue extends AnyBlock,
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

type ElementWithoutFlagsModeFields<BlockValue extends AnyBlock> =
  EveryBlockAcceptsExactly<BlockValue, []> extends true
    ? Readonly<{ Flags?: never; flags?: never }>
    : never

type ElementWithFlagsModeFields<
  BlockValue extends AnyBlock,
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

type ProgramRequirements<BlockValue extends AnyBlock> = [BlockValue] extends [
  Readonly<{ __blockHandlerRequirements: unknown }>,
]
  ? RequirementsOfBlock<BlockValue>
  : never

type ProgramRuntimeServices<BlockValue extends AnyBlock> = [
  BlockValue,
] extends [Readonly<{ __blockHandlerRequirements: unknown }>]
  ? RuntimeServicesOfBlock<BlockValue>
  : never

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
  | 'layer'
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
  const DispatchSchema extends Schema.Codec<any, any, never, never>,
>(
  devTools: DevToolsConfig | undefined,
  dispatchSchema: DispatchSchema,
): RuntimeDevToolsConfig | undefined => {
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

type LayeredElementFromBlock<
  BlockValue extends LayeredRoot,
  PortsValue extends Ports | undefined,
> = ConstructionProgramFromRoot<
  BlockValue,
  RootPorts<PortsValue>,
  void,
  RootRequirements<BlockValue>,
  'Element'
>

type SelectedElementFromConfig<
  Config,
  PortsValue extends Ports | undefined,
> = ConstructionProgramFromRoot<
  SelectedRootOfConfig<Config>,
  RootPorts<PortsValue>,
  void,
  RootRequirements<SelectedRootOfConfig<Config>>,
  'Element'
>

type SelectedPageFromConfig<
  Config,
  PortsValue extends Ports | undefined,
  FlagsSchema extends AnyFlagsSchema | undefined = undefined,
> = ConstructionProgramFromRoot<
  SelectedRootOfConfig<Config>,
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  RootRequirements<SelectedRootOfConfig<Config>>,
  'Application'
>

/**
 * Creates a passive page-owning Program from a completed root Block whose view
 * returns a Document. Use `makeElement` for an Html view. Set a unique, nonempty
 * container id before calling this function.
 *
 * A Layer-owned root is acquired when the Program starts. Its pending Program
 * accepts `provide({ services, runtime })`: shared Services build before the
 * graph, and optional runtime providers build after ManagedResource handles
 * exist. Plain `provide(layer)` supplies runtime providers only.
 */
export function make<
  const Config extends Readonly<{
    block: DeclaredRootBlock
    layer: Layer.Layer<any, any, any>
  }>,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<Config> &
    NoInfer<ValidateSelectedConfig<Config>> &
    PageHostOptions<
      NoInfer<DeclaredHostContract<Config['block']>>,
      PortsValue
    > &
    PageWithoutRoutingModeFields<
      NoInfer<DeclaredHostContract<Config['block']>>,
      undefined
    > &
    NoInfer<
      ValidateProgramBlock<DeclaredHostContract<Config['block']>, 'Document'>
    > &
    NoInfer<ExactHostConfig<Config, PageHostConfigKeys | 'layer'>> &
    NoInfer<ExactDevToolsConfig<Config>>,
): SelectedPageFromConfig<Config, PortsValue>
export function make<
  const Config extends Readonly<{
    block: DeclaredRootBlock
    layer: Layer.Layer<any, any, any>
  }>,
  const FlagsSchema extends AnyFlagsSchema,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<Config> &
    NoInfer<ValidateSelectedConfig<Config>> &
    PageHostOptions<
      NoInfer<DeclaredHostContract<Config['block']>>,
      PortsValue
    > &
    PageWithoutRoutingModeFields<
      NoInfer<DeclaredHostContract<Config['block']>>,
      FlagsSchema
    > &
    NoInfer<
      ValidateProgramBlock<DeclaredHostContract<Config['block']>, 'Document'>
    > &
    NoInfer<ExactHostConfig<Config, PageHostConfigKeys | 'layer'>> &
    NoInfer<ExactDevToolsConfig<Config>>,
): ConstructionProgramFromRoot<
  SelectedRootOfConfig<Config>,
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  RootRequirements<SelectedRootOfConfig<Config>>,
  'Application'
>
export function make<
  const Config extends Readonly<{
    block: DeclaredRootBlock
    layer: Layer.Layer<any, any, any>
  }>,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<Config> &
    NoInfer<ValidateSelectedConfig<Config>> &
    PageHostOptions<
      NoInfer<DeclaredHostContract<Config['block']>>,
      PortsValue
    > &
    PageWithRoutingModeFields<
      NoInfer<DeclaredHostContract<Config['block']>>,
      FlagsSchema,
      RoutingConfig<
        NoInfer<CommonBlockMessage<DeclaredHostContract<Config['block']>>>
      >
    > &
    NoInfer<
      ValidateProgramBlock<DeclaredHostContract<Config['block']>, 'Document'>
    > &
    NoInfer<ExactHostConfig<Config, PageHostConfigKeys | 'layer'>> &
    NoInfer<ExactDevToolsConfig<Config>>,
): SelectedPageFromConfig<Config, PortsValue, FlagsSchema>
export function make<
  const Config extends Readonly<{
    block: DeclaredRootBlock
    layer: Layer.Layer<any, any, any>
  }>,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<Config> &
    NoInfer<ValidateSelectedConfig<Config>> &
    PageHostOptions<
      NoInfer<DeclaredHostContract<Config['block']>>,
      PortsValue
    > &
    PageWithRoutingModeFields<
      NoInfer<DeclaredHostContract<Config['block']>>,
      FlagsSchema,
      RoutingInputConfig<
        NoInfer<CommonBlockMessage<DeclaredHostContract<Config['block']>>>
      >
    > &
    NoInfer<
      ValidateProgramBlock<DeclaredHostContract<Config['block']>, 'Document'>
    > &
    NoInfer<ExactHostConfig<Config, PageHostConfigKeys | 'layer'>> &
    NoInfer<ExactDevToolsConfig<Config>>,
): SelectedPageFromConfig<Config, PortsValue, FlagsSchema>
export function make<
  const Config extends object,
  const BlockValue extends LayeredRoot,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<LayeredContract<BlockValue>>, PortsValue> &
    PageWithoutRoutingModeFields<
      NoInfer<LayeredContract<BlockValue>>,
      FlagsSchema
    > &
    NoInfer<ValidateProgramBlock<LayeredContract<BlockValue>, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): ConstructionProgramFromRoot<
  BlockValue,
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  RootRequirements<BlockValue>,
  'Application'
>
export function make<
  const Config extends object,
  const BlockValue extends LayeredRoot,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<LayeredContract<BlockValue>>, PortsValue> &
    PageWithRoutingModeFields<
      NoInfer<LayeredContract<BlockValue>>,
      FlagsSchema,
      RoutingConfig<NoInfer<CommonBlockMessage<LayeredContract<BlockValue>>>>
    > &
    NoInfer<ValidateProgramBlock<LayeredContract<BlockValue>, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): ConstructionProgramFromRoot<
  BlockValue,
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  RootRequirements<BlockValue>,
  'Application'
>
export function make<
  const Config extends object,
  const BlockValue extends LayeredRoot,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<LayeredContract<BlockValue>>, PortsValue> &
    PageWithRoutingModeFields<
      NoInfer<LayeredContract<BlockValue>>,
      FlagsSchema,
      ConstructorRoutingConfig<
        NoInfer<CommonBlockMessage<LayeredContract<BlockValue>>>
      >
    > &
    NoInfer<ValidateProgramBlock<LayeredContract<BlockValue>, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): ConstructionProgramFromRoot<
  BlockValue,
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  RootRequirements<BlockValue>,
  'Application'
>
export function make<
  const Config extends object,
  const BlockValue extends LayeredRoot,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    PageHostOptions<NoInfer<LayeredContract<BlockValue>>, PortsValue> &
    PageWithRoutingModeFields<
      NoInfer<LayeredContract<BlockValue>>,
      FlagsSchema,
      ConstructorRequestRoutingConfig<
        NoInfer<CommonBlockMessage<LayeredContract<BlockValue>>>
      >
    > &
    NoInfer<ValidateProgramBlock<LayeredContract<BlockValue>, 'Document'>> &
    NoInfer<ExactPageHostConfig<Config>>,
): ConstructionProgramFromRoot<
  BlockValue,
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  RootRequirements<BlockValue>,
  'Application'
>
export function make<
  const Config extends object,
  const BlockValue extends LayeredRoot,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    NoInfer<
      ProgramViewDiagnostic<
        LayeredContract<BlockValue>,
        PageHostOptions<NoInfer<LayeredContract<BlockValue>>, PortsValue> &
          PageWithRoutingModeFields<
            NoInfer<LayeredContract<BlockValue>>,
            FlagsSchema,
            ConstructorUrlRoutingConfig<
              CommonBlockMessage<LayeredContract<BlockValue>>
            >
          > &
          NoInfer<
            ValidateProgramBlock<LayeredContract<BlockValue>, 'Document'>
          > &
          NoInfer<ExactPageHostConfig<Config>>
      >
    > &
    Readonly<{ Flags?: FlagsSchema; ports?: PortsValue }>,
): ConstructionProgramFromRoot<
  BlockValue,
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  RootRequirements<BlockValue>,
  'Application'
>
export function make<
  const Config extends object,
  const BlockValue extends AnyBlock,
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
  ProgramRequirements<BlockValue>,
  ProgramRuntimeServices<BlockValue>,
  Layer.Success<BlockValue['EffectsLayer']>
>
export function make<
  const Config extends object,
  const BlockValue extends AnyBlock,
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
  ProgramRequirements<BlockValue>,
  ProgramRuntimeServices<BlockValue>,
  Layer.Success<BlockValue['EffectsLayer']>
>
export function make<
  const Config extends object,
  const BlockValue extends AnyBlock,
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
  ProgramRequirements<BlockValue>,
  ProgramRuntimeServices<BlockValue>,
  Layer.Success<BlockValue['EffectsLayer']>
>
export function make<
  const Config extends object,
  const BlockValue extends AnyBlock,
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
  ProgramRequirements<BlockValue>,
  ProgramRuntimeServices<BlockValue>,
  Layer.Success<BlockValue['EffectsLayer']>
>
export function make<
  const Config extends object,
  const BlockValue extends AnyBlock,
  const FlagsSchema extends AnyFlagsSchema | undefined,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    NoInfer<
      ProgramViewDiagnostic<
        BlockValue,
        PageHostOptions<NoInfer<BlockValue>, PortsValue> &
          PageWithRoutingModeFields<
            NoInfer<BlockValue>,
            FlagsSchema,
            ConstructorUrlRoutingConfig<CommonBlockMessage<BlockValue>>
          > &
          NoInfer<ValidateProgramBlock<BlockValue, 'Document'>> &
          NoInfer<ExactPageHostConfig<Config>>
      >
    > &
    Readonly<{ Flags?: FlagsSchema; ports?: PortsValue }>,
): Program<
  RootPorts<PortsValue>,
  RootFlags<FlagsSchema>,
  ProgramRequirements<BlockValue>,
  ProgramRuntimeServices<BlockValue>,
  Layer.Success<BlockValue['EffectsLayer']>
>
export function make(config: unknown): unknown {
  assertProgramConfig(config, 'Document')
  if ('layer' in config) {
    const { layer, ...hostOptions } = config

    if (!Layer.isLayer(layer)) {
      throw new Error('[foldkit] Program root layer must be an Effect Layer.')
    }

    return Reflect.apply(make, undefined, [
      {
        ...hostOptions,
        block: Reflect.apply(selectLayer, undefined, [config.block, layer]),
      },
    ])
  }

  if (rootConstructionOf(config.block) !== undefined) {
    const snapshot = { ...config }

    return makeConstructedProgram(snapshot, 'Application', block =>
      Reflect.apply(make, undefined, [{ ...snapshot, block }]),
    )
  }

  const { block, routing, devTools, ...hostOptions } = config
  assertCompletedRoot(block)
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

type ElementFromBlock<
  BlockValue extends AnyBlock,
  PortsValue extends Ports | undefined,
> = [ProgramRequirements<BlockValue>] extends [infer Requirements]
  ? Element<
      RootPorts<PortsValue>,
      Requirements,
      ProgramRuntimeServices<BlockValue>,
      Layer.Success<BlockValue['EffectsLayer']>
    >
  : never

/**
 * Creates a passive container-scoped Program from a completed root Block whose
 * view returns Html. Set a unique, nonempty container id before calling this
 * function. Supply a Flags Effect in this config when declaring Flags.
 *
 * A Layer-owned root accepts a shared and runtime provider plan through
 * `provide({ services, runtime })`. The graph is acquired under the host Scope
 * at startup. Plain `provide(layer)` remains runtime-only.
 */
export function makeElement<
  const Config extends Readonly<{
    block: DeclaredRootBlock
    layer: Layer.Layer<any, any, any>
  }>,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<Config> &
    NoInfer<ValidateSelectedConfig<Config>> &
    ElementHostOptions<
      NoInfer<DeclaredHostContract<Config['block']>>,
      PortsValue
    > &
    ElementWithoutFlagsModeFields<
      NoInfer<DeclaredHostContract<Config['block']>>
    > &
    NoInfer<
      ValidateProgramBlock<DeclaredHostContract<Config['block']>, 'Element'>
    > &
    NoInfer<ExactElementHostConfig<Config>>,
): SelectedElementFromConfig<Config, PortsValue>
export function makeElement<
  const Config extends Readonly<{
    block: DeclaredRootBlock
    layer: Layer.Layer<any, any, any>
  }>,
  const FlagsSchema extends AnyFlagsSchema,
  const FlagsEffect extends Effect.Effect<FlagsSchema['Type'], never, any>,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<Config> &
    NoInfer<ValidateSelectedConfig<Config>> &
    ElementHostOptions<
      NoInfer<DeclaredHostContract<Config['block']>>,
      PortsValue
    > &
    ElementWithFlagsModeFields<
      NoInfer<DeclaredHostContract<Config['block']>>,
      FlagsSchema,
      FlagsEffect
    > &
    NoInfer<
      ValidateProgramBlock<DeclaredHostContract<Config['block']>, 'Element'>
    > &
    NoInfer<ExactElementHostConfig<Config>>,
): ConstructionProgramFromRoot<
  SelectedRootOfConfig<Config>,
  RootPorts<PortsValue>,
  void,
  | RootRequirements<SelectedRootOfConfig<Config>>
  | FlagsRequirements<FlagsEffect>,
  'Element'
>
export function makeElement<
  const Config extends object,
  const BlockValue extends LayeredRoot,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    ElementHostOptions<NoInfer<LayeredContract<BlockValue>>, PortsValue> &
    ElementWithoutFlagsModeFields<NoInfer<LayeredContract<BlockValue>>> &
    NoInfer<ValidateProgramBlock<LayeredContract<BlockValue>, 'Element'>> &
    NoInfer<ExactElementHostConfig<Config>>,
): LayeredElementFromBlock<BlockValue, PortsValue>
export function makeElement<
  const Config extends object,
  const BlockValue extends LayeredRoot,
  const FlagsSchema extends AnyFlagsSchema,
  const FlagsEffect extends Effect.Effect<FlagsSchema['Type'], never, any>,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    ElementHostOptions<NoInfer<LayeredContract<BlockValue>>, PortsValue> &
    ElementWithFlagsModeFields<
      NoInfer<LayeredContract<BlockValue>>,
      FlagsSchema,
      FlagsEffect
    > &
    NoInfer<ValidateProgramBlock<LayeredContract<BlockValue>, 'Element'>> &
    NoInfer<ExactElementHostConfig<Config>>,
): ConstructionProgramFromRoot<
  BlockValue,
  RootPorts<PortsValue>,
  void,
  RootRequirements<BlockValue> | FlagsRequirements<FlagsEffect>,
  'Element'
>
export function makeElement<
  const Config extends object,
  const BlockValue extends AnyBlock,
  const PortsValue extends Ports | undefined = undefined,
>(
  config: Config &
    Readonly<{ block: BlockValue }> &
    ElementHostOptions<NoInfer<BlockValue>, PortsValue> &
    ElementWithoutFlagsModeFields<NoInfer<BlockValue>> &
    NoInfer<ValidateProgramBlock<BlockValue, 'Element'>> &
    NoInfer<ExactElementHostConfig<Config>>,
): ElementFromBlock<BlockValue, PortsValue>
export function makeElement<
  const Config extends object,
  const BlockValue extends AnyBlock,
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
  ProgramRequirements<BlockValue> | FlagsRequirements<FlagsEffect>,
  ProgramRuntimeServices<BlockValue>,
  Layer.Success<BlockValue['EffectsLayer']>
>
export function makeElement(config: unknown): unknown {
  assertProgramConfig(config, 'Element')
  if ('layer' in config) {
    const { layer, ...hostOptions } = config

    if (!Layer.isLayer(layer)) {
      throw new Error('[foldkit] Program root layer must be an Effect Layer.')
    }

    return Reflect.apply(makeElement, undefined, [
      {
        ...hostOptions,
        block: Reflect.apply(selectLayer, undefined, [config.block, layer]),
      },
    ])
  }

  if (rootConstructionOf(config.block) !== undefined) {
    const snapshot = { ...config }

    return makeConstructedProgram(snapshot, 'Element', block =>
      Reflect.apply(makeElement, undefined, [{ ...snapshot, block }]),
    )
  }

  const { block, devTools, ...hostOptions } = config
  assertCompletedRoot(block)
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
