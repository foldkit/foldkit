import type { Layer } from 'effect'

import type { Ports } from '../port/index.js'
import type { ValidHandlerContracts } from './handlerContracts.js'
import type { Runnable } from './program.js'
import type {
  LayeredContract,
  LayeredRoot,
  RootConstructionRequirements,
  RootRuntimeServices,
} from './rootBlock.js'

type AnyLayer = Layer.Layer<never, any, any>

type GuaranteedLayerOutputs<Dependencies extends AnyLayer> = Extract<
  Layer.Success<Dependencies>,
  [Dependencies] extends [Layer.Layer<infer Outputs, any, any>]
    ? Outputs
    : never
>

/** Services shared by construction and execution, with optional late runtime providers. */
export interface ConstructionProviders {
  /** Providers shared by graph construction, runtime handlers and Flags. */
  readonly services: AnyLayer
  /** Optional providers built after the Runtime allocates resource handles. */
  readonly runtime?: AnyLayer
}

type RuntimeLayer<Providers extends ConstructionProviders> =
  Providers extends unknown
    ? Extract<Providers[Extract<'runtime', keyof Providers>], AnyLayer>
    : never

type RuntimeOutputs<Providers extends ConstructionProviders> = [
  Providers,
] extends [Readonly<{ runtime: infer Selected extends AnyLayer }>]
  ? GuaranteedLayerOutputs<Selected>
  : never

type ProviderKeys<Providers> = Providers extends unknown
  ? keyof Providers
  : never

type ExactProviders<Providers> = Readonly<{
  [Key in Exclude<ProviderKeys<Providers>, keyof ConstructionProviders>]: never
}>

type RuntimeRequirements<Current, Provided, Needed, Shared, RuntimeServices> =
  Exclude<Exclude<Current, Provided> | Needed, Shared | RuntimeServices>

/** A Layer-owned Program awaiting construction or runtime Service providers. */
export interface ConstructionPending<
  P extends Ports | undefined,
  Flags,
  ConstructionRequirements,
  ExecutionRequirements,
  RuntimeServices,
  ProvidedServices,
  SharedServices,
  Kind extends 'Application' | 'Element',
> {
  /** @internal Preserves distinct construction and runtime requirement channels. */
  readonly '~foldkit/ProgramConstruction'?: Readonly<{
    construction: (
      services: ConstructionRequirements,
    ) => ConstructionRequirements
    runtime: (services: ExecutionRequirements) => ExecutionRequirements
    shared: (services: SharedServices) => SharedServices
  }>
  /** @internal Retains the ordinary Program provisioning projection. */
  readonly '~foldkit/ProgramProvision'?: Readonly<{
    Requirements: (
      requirements: ConstructionRequirements | ExecutionRequirements,
    ) => ConstructionRequirements | ExecutionRequirements
    RuntimeServices: (services: RuntimeServices) => RuntimeServices
    ProvidedServices: (services: ProvidedServices) => ProvidedServices
  }>
  /** Port declarations supplied to this Program. */
  readonly ports: P
  /** Supplies runtime providers after construction and ManagedResource handle allocation. */
  provide<const Dependencies extends AnyLayer>(
    layer: Dependencies &
      ValidHandlerContracts<
        | NoInfer<ExecutionRequirements>
        | NoInfer<ProvidedServices>
        | Layer.Success<NoInfer<Dependencies>>
        | Layer.Services<NoInfer<Dependencies>>
      >,
  ): ConstructionProgram<
    P,
    Flags,
    ConstructionRequirements,
    RuntimeRequirements<
      ExecutionRequirements,
      GuaranteedLayerOutputs<Dependencies>,
      Layer.Services<Dependencies>,
      SharedServices,
      RuntimeServices
    >,
    RuntimeServices,
    ProvidedServices | GuaranteedLayerOutputs<Dependencies>,
    SharedServices,
    Kind
  >
  /**
   * Supplies shared Services before constructing the graph and optional runtime
   * providers after ManagedResource handles exist. Shared providers build once
   * per host and remain available to construction, handlers, and Flags. Runtime
   * outputs cannot satisfy construction requirements. Later calls supply the
   * dependencies of providers selected by earlier calls. Conditional providers
   * promise only outputs present in every alternative and retain all possible
   * input requirements.
   */
  provide<const Providers extends ConstructionProviders>(
    providers: Providers &
      ExactProviders<Providers> &
      ValidHandlerContracts<
        | NoInfer<ConstructionRequirements>
        | NoInfer<ExecutionRequirements>
        | NoInfer<ProvidedServices>
        | Layer.Success<NoInfer<Providers>['services']>
        | Layer.Services<NoInfer<Providers>['services']>
        | Layer.Success<RuntimeLayer<NoInfer<Providers>>>
        | Layer.Services<RuntimeLayer<NoInfer<Providers>>>
      >,
  ): ConstructionProgram<
    P,
    Flags,
    | Exclude<
        ConstructionRequirements,
        GuaranteedLayerOutputs<Providers['services']>
      >
    | Layer.Services<Providers['services']>,
    RuntimeRequirements<
      ExecutionRequirements,
      RuntimeOutputs<Providers>,
      Layer.Services<RuntimeLayer<Providers>>,
      SharedServices | GuaranteedLayerOutputs<Providers['services']>,
      RuntimeServices
    >,
    RuntimeServices,
    | ProvidedServices
    | GuaranteedLayerOutputs<Providers['services']>
    | RuntimeOutputs<Providers>,
    SharedServices | GuaranteedLayerOutputs<Providers['services']>,
    Kind
  >
}

/** A Program runnable after both construction and runtime requirements are provided. */
export type ConstructionProgram<
  P extends Ports | undefined,
  Flags,
  ConstructionRequirements,
  ExecutionRequirements,
  RuntimeServices,
  ProvidedServices,
  SharedServices = never,
  Kind extends 'Application' | 'Element' = 'Application',
> = ConstructionPending<
  P,
  Flags,
  ConstructionRequirements,
  ExecutionRequirements,
  RuntimeServices,
  ProvidedServices,
  SharedServices,
  Kind
> &
  ([ConstructionRequirements | ExecutionRequirements] extends [never]
    ? Runnable<P, Flags, ProvidedServices, Kind>
    : unknown)

/** @internal Translates flat Layer-owned root evidence into a pending Program. */
export type ConstructionProgramFromRoot<
  BlockValue extends LayeredRoot,
  P extends Ports | undefined,
  Flags,
  ExecutionRequirements,
  Kind extends 'Application' | 'Element',
> = ConstructionProgram<
  P,
  Flags,
  RootConstructionRequirements<BlockValue>,
  ExecutionRequirements,
  RootRuntimeServices<BlockValue>,
  Layer.Success<LayeredContract<BlockValue>['EffectsLayer']>,
  never,
  Kind
>
