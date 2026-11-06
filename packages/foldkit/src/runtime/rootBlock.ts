import { Effect, Layer, Predicate, type Scope } from 'effect'
import type { Schema } from 'effect'

import { assertCompletedBlock } from '../block/assemblyState.js'
import type { AnyBlock } from '../block/definition.js'
import type { LayerOutputs } from '../block/layerOutputs.js'
import type { Owner } from '../block/owner.js'
import type {
  RequirementsOfBlock,
  RuntimeServicesOfBlock,
} from '../block/requirements.js'
import type {
  CoreContractFromFacts,
  DescriptorTypeId,
  OperationContract,
  PublicFacts,
  ResultContract,
} from '../experimental/constructed/contract.js'
import type { ContractGraph } from '../experimental/contracted/contract.js'
import type {
  FixedRefinement,
  FixedRefinementProvider,
  ImplementationFacts,
  SelectedImplementationFacts,
} from '../experimental/contracted/implementationFacts.js'
import type {
  FamilySelection,
  ValidateReadableAdmission,
} from '../experimental/contracted/readableProvider.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>

export type DeclaredRootBlock = Readonly<{
  owner: Owner<string>
  Model: AnySelfContainedSchema
  Message: AnySelfContainedSchema
  OutMessage: AnySchema | undefined
  [DescriptorTypeId]: PublicFacts
}>
/** @internal Flat host evidence, independent of experimental authoring machinery. */
export declare const LayeredRootTypeId: unique symbol

/** @internal A Layer-owned root whose exact host contracts were inferred during completion. */
export interface LayeredRoot<
  Contract extends AnyBlock = AnyBlock,
  Requirements = unknown,
  RuntimeServices = unknown,
  LayerValue extends Layer.Layer<any, any, any> = Layer.Layer<any, any, any>,
> {
  readonly [LayeredRootTypeId]?: Readonly<{
    contract: Contract
    requirements: Requirements
    runtimeServices: RuntimeServices
  }>
  readonly layer: LayerValue
  readonly get: Effect.Effect<object, any, any>
}

/** A public Block paired with the exact ordinary implementation Layer selected by its host. */
export interface LayeredRootSelection<
  Contract extends AnyBlock,
  Requirements,
  RuntimeServices,
  LayerValue extends Layer.Layer<any, any, any>,
  BlockValue extends object = object,
> extends LayeredRoot<Contract, Requirements, RuntimeServices, LayerValue> {
  readonly block: BlockValue
}

/** @internal Roots accepted by browser and server hosts. */
export type RootBlock = AnyBlock | LayeredRoot

/** @internal Projects an already-known Layer-owned root without union dispatch. */
export type LayeredContract<Value extends LayeredRoot> =
  Value extends LayeredRoot<infer Contract, any, any, any> ? Contract : never

/** @internal Projects host contracts without constructing a completed facade. */
export type RootContract<Value extends RootBlock> = Value extends AnyBlock
  ? Value
  : Value extends LayeredRoot
    ? LayeredContract<Value>
    : never

/** @internal Ordinary Services retained by the completed executable graph. */
export type RootRequirements<Value extends RootBlock> =
  Value extends LayeredRoot
    ? Value extends LayeredRoot<any, infer Requirements, any, any>
      ? Requirements
      : never
    : RequirementsOfBlock<Value>

/** @internal ManagedResource handles supplied by the runtime after graph construction. */
type RootRuntimeServicesMember<Value extends RootBlock> =
  Value extends LayeredRoot
    ? Value extends LayeredRoot<any, any, infer RuntimeServices, any>
      ? RuntimeServices
      : never
    : RuntimeServicesOfBlock<Value>

type RootsMissingRuntimeService<
  Value extends RootBlock,
  Service,
> = Value extends unknown
  ? [Service] extends [RootRuntimeServicesMember<Value>]
    ? never
    : Value
  : never

type RuntimeServiceProvidedByEveryRoot<
  Value extends RootBlock,
  Service = RootRuntimeServicesMember<Value>,
> = Service extends unknown
  ? [RootsMissingRuntimeService<Value, Service>] extends [never]
    ? Service
    : never
  : never

/** @internal Runtime handles installed by every possible selected root. */
export type RootRuntimeServices<Value extends RootBlock> =
  RuntimeServiceProvidedByEveryRoot<Value>

/** @internal Failure of the graph Layer, separate from handler construction. */
export type RootConstructionError<Value extends RootBlock> =
  Value extends LayeredRoot ? Layer.Error<Value['layer']> : never

/** @internal Ordinary Services needed before the executable graph is available. */
export type RootConstructionRequirements<Value extends RootBlock> =
  Value extends LayeredRoot ? Layer.Services<Value['layer']> : never

type SelectedResultOf<BlockValue extends DeclaredRootBlock> = ContractGraph<
  BlockValue['owner'],
  BlockValue['Model'],
  BlockValue['Message'],
  BlockValue['OutMessage'],
  BlockValue[typeof DescriptorTypeId]
>

/** @internal Supplies declared Schema contracts to contextual host callbacks without completing a graph. */
export type DeclaredHostContract<BlockValue extends DeclaredRootBlock> =
  BlockValue extends unknown
    ? CoreContractFromFacts<
        BlockValue['owner'],
        BlockValue['Model'],
        BlockValue['Message'],
        BlockValue['OutMessage'],
        BlockValue[typeof DescriptorTypeId]
      >
    : never

type ExactImplementation<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> = [Extract<Layer.Success<LayerValue>, SelectedResultOf<BlockValue>>] extends [
  never,
]
  ? never
  : Extract<
      Layer.Success<LayerValue>,
      SelectedImplementationFacts<SelectedResultOf<BlockValue>, any, any, any>
    >
type FixedImplementation<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> =
  BlockValue extends FixedRefinement<
    infer Rule,
    infer Canonical,
    infer Admitted
  >
    ? unknown extends ValidateReadableAdmission<BlockValue>
      ? [Admitted] extends [SelectedResultOf<BlockValue>]
        ? Extract<
            Layer.Success<LayerValue>,
            FixedRefinementProvider<Rule, Canonical, any>
          > extends infer Proof
          ? Proof extends FixedRefinementProvider<
              Rule,
              Canonical,
              infer Implementation
            >
            ? Implementation extends SelectedImplementationFacts<
                Canonical,
                any,
                any,
                any
              >
              ? Implementation
              : never
            : never
          : never
        : never
      : never
    : never
type SharedFamilySelection<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> =
  BlockValue extends FamilySelection<
    infer Identifier,
    infer Selected,
    infer Error,
    infer Requirements,
    infer Pending
  >
    ? [Selected] extends [SelectedResultOf<BlockValue>]
      ? [SelectedResultOf<BlockValue>] extends [Selected]
        ? [Identifier] extends [LayerOutputs<LayerValue>]
          ? readonly [Error, Requirements, Pending]
          : never
        : never
      : never
    : never
type SharedFamilyImplementation<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> =
  SharedFamilySelection<BlockValue, LayerValue> extends infer Selection
    ? Selection extends readonly [unknown, unknown, infer Pending]
      ? SelectedImplementationFacts<
          SelectedResultOf<BlockValue>,
          BlockValue['owner'],
          BlockValue[typeof DescriptorTypeId],
          Pending
        >
      : never
    : never
type MatchedImplementation<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> =
  | ExactImplementation<BlockValue, LayerValue>
  | FixedImplementation<BlockValue, LayerValue>
  | SharedFamilyImplementation<BlockValue, LayerValue>
type ValidateSelectedLayerMember<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> = ValidateReadableAdmission<BlockValue> &
  ([MatchedImplementation<BlockValue, LayerValue>] extends [never]
    ? Readonly<{
        'Selected Layer must implement the paired Block public contract': LayerValue
      }>
    : MatchedImplementation<
          BlockValue,
          LayerValue
        > extends SelectedImplementationFacts<any, any, any, infer Pending>
      ? [Pending] extends [never]
        ? unknown
        : Readonly<{
            'Select this Block Layer’s host handlers before hosting it': Pending
          }>
      : never)

type SelectedLayerFailure<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> = LayerValue extends unknown
  ? unknown extends ValidateSelectedLayerMember<BlockValue, LayerValue>
    ? never
    : ValidateSelectedLayerMember<BlockValue, LayerValue>
  : never

/** @internal Checks every Layer alternative for exact or authenticated family admission. */
export type ValidateSelectedLayer<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> = [SelectedLayerFailure<BlockValue, LayerValue>] extends [never]
  ? unknown
  : SelectedLayerFailure<BlockValue, LayerValue>
type PrivateFacts<Implementation> =
  Implementation extends SelectedImplementationFacts<any, any, infer Facts, any>
    ? Facts extends PublicFacts
      ? Facts
      : never
    : never
type FixedFacts<
  Actual extends PublicFacts,
  Declared extends PublicFacts,
> = Omit<Actual, 'view' | 'update' | 'operations'> &
  Readonly<{
    view: Declared['view']
    update: ResultContract<
      Declared['update']['outMessage'],
      Actual['update']['requirements']
    >
    operations: {
      readonly [
        Key in keyof Actual['operations']
      ]: Key extends keyof Declared['operations']
        ? OperationContract<
            Declared['operations'][Key]['args'],
            Declared['operations'][Key]['outMessage'],
            Actual['operations'][Key]['requirements']
          >
        : Actual['operations'][Key]
    }
  }>
/** @internal Projects only implementation facts associated with this complete public selection. */
export type SelectedBlockLayerFacts<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> = LayerValue extends unknown
  ?
      | PrivateFacts<ExactImplementation<BlockValue, LayerValue>>
      | PrivateFacts<SharedFamilyImplementation<BlockValue, LayerValue>>
      | ([PrivateFacts<FixedImplementation<BlockValue, LayerValue>>] extends [
          never,
        ]
          ? never
          : PrivateFacts<
                FixedImplementation<BlockValue, LayerValue>
              > extends infer Facts extends PublicFacts
            ? FixedFacts<Facts, BlockValue[typeof DescriptorTypeId]>
            : never)
  : never

type FactsOfLayer<Value extends Layer.Layer<any, any, any>, OwnerValue> =
  Extract<
    Layer.Success<Value>,
    ImplementationFacts<OwnerValue, any, any>
  > extends ImplementationFacts<OwnerValue, infer Facts, any>
    ? Facts extends PublicFacts
      ? Facts
      : never
    : never

/** @internal Exact implementation facts carried by an ordinary selected Layer. */
export type SelectedLayerFacts<
  Value extends Layer.Layer<any, any, any>,
  OwnerValue,
> = FactsOfLayer<Value, OwnerValue>

type FactsMissingRuntimeService<
  Facts extends PublicFacts,
  Service,
> = Facts extends unknown
  ? [Service] extends [Facts['runtimeServices']]
    ? never
    : Facts
  : never

type GuaranteedRuntimeServices<
  Facts extends PublicFacts,
  Service = Facts['runtimeServices'],
> = Service extends unknown
  ? [FactsMissingRuntimeService<Facts, Service>] extends [never]
    ? Service
    : never
  : never

type WithGuaranteedRuntimeServices<
  Facts extends PublicFacts,
  Alternatives extends PublicFacts = Facts,
> = Facts extends unknown
  ? {
      readonly [Key in keyof Facts]: Key extends 'runtimeServices'
        ? GuaranteedRuntimeServices<Alternatives>
        : Facts[Key]
    }
  : never

type SelectedHostFacts<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> = WithGuaranteedRuntimeServices<
  SelectedBlockLayerFacts<BlockValue, LayerValue>
>

type SelectedConstructionLayer<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Layer<any, any, any>,
> = LayerValue extends unknown
  ? [SharedFamilySelection<BlockValue, LayerValue>] extends [never]
    ? LayerValue
    : SharedFamilySelection<BlockValue, LayerValue> extends readonly [
          infer Error,
          infer Requirements,
          unknown,
        ]
      ? Layer.Layer<
          Layer.Success<LayerValue>,
          Layer.Error<LayerValue> | Error,
          Layer.Services<LayerValue> | Requirements
        >
      : never
  : never
/** @internal Types an explicit public Block and selected implementation Layer pair. */
export type SelectedLayeredRoot<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Layer<any, any, any>,
> = LayeredRoot<
  SelectedLayerContract<BlockValue, LayerValue>,
  SelectedBlockLayerFacts<BlockValue, LayerValue>['programRequirements'],
  SelectedHostFacts<BlockValue, LayerValue>['runtimeServices'],
  SelectedConstructionLayer<BlockValue, LayerValue>
> &
  Readonly<{ block: BlockValue }>

/** @internal The original paired host selection, including correlated alternatives. */
export type SelectedRootOfConfig<Config> =
  Config extends Readonly<{
    block: infer BlockValue extends DeclaredRootBlock
    layer: infer LayerValue extends Layer.Layer<any, any, any>
  }>
    ? SelectedLayeredRoot<BlockValue, LayerValue>
    : never

type SelectedConfigFailure<Config> =
  Config extends Readonly<{
    block: infer BlockValue extends DeclaredRootBlock
    layer: infer LayerValue extends Layer.Layer<any, any, any>
  }>
    ? unknown extends ValidateSelectedLayer<BlockValue, LayerValue>
      ? never
      : ValidateSelectedLayer<BlockValue, LayerValue>
    : Readonly<{
        'Select a public Block together with its implementation Layer': never
      }>

/** @internal Validates every original pair without letting validation narrow inference. */
export type ValidateSelectedConfig<Config> = [
  SelectedConfigFailure<Config>,
] extends [never]
  ? unknown
  : SelectedConfigFailure<Config>

type SelectedLayerContract<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Layer<any, any, any>,
> =
  SelectedHostFacts<BlockValue, LayerValue> extends infer Facts extends
    PublicFacts
    ? CoreContractFromFacts<
        BlockValue['owner'],
        BlockValue['Model'],
        BlockValue['Message'],
        BlockValue['OutMessage'],
        Facts
      > &
        Readonly<{ [DescriptorTypeId]: Facts }>
    : never

/** @internal Makes the explicit public Block/Layer host selection consumable. */
export function selectLayeredRoot<
  const BlockValue extends DeclaredRootBlock,
  const LayerValue extends Layer.Layer<any, any, any>,
>(
  block: BlockValue,
  layer: LayerValue,
  read: Effect.Effect<AnyBlock, never, any>,
): SelectedLayeredRoot<BlockValue, LayerValue>
export function selectLayeredRoot(
  block: DeclaredRootBlock,
  layer: Layer.Layer<any, any, any>,
  read: Effect.Effect<AnyBlock, never, any>,
): object {
  const selected = Object.freeze({ block, layer, get: read })

  registerRootConstruction(selected, { layer, read })

  return selected
}

/** @internal A registered construction recipe and private reader for its genuine core Block. */
export interface RootConstruction {
  readonly layer: Layer.Layer<any, any, any>
  readonly read: Effect.Effect<AnyBlock, never, any>
  readonly readForTesting?: Effect.Effect<object, any, any>
}

const constructions = new WeakMap<object, RootConstruction>()

/** @internal Registers the original Layer-owned descriptor without exposing its output key. */
export const registerRootConstruction = (
  descriptor: object,
  construction: RootConstruction,
): void => {
  constructions.set(descriptor, Object.freeze({ ...construction }))
}

/** @internal Recognizes registered descriptors rather than caller-shaped records. */
export const rootConstructionOf = (
  block: unknown,
): RootConstruction | undefined =>
  Predicate.isObject(block) ? constructions.get(block) : undefined

/** @internal Narrows only original completed core Blocks after host validation. */
export function assertCompletedRoot(
  block: RootBlock,
): asserts block is AnyBlock {
  assertCompletedBlock(block)
}

/** @internal Acquires the executable in the caller's host Scope and retains its complete graph. */
export const resolveRootBlock = (
  block: RootBlock,
  memoMap?: Layer.MemoMap,
): Effect.Effect<AnyBlock, any, any> => {
  const construction = rootConstructionOf(block)

  if (construction === undefined) {
    assertCompletedBlock(block)

    return Effect.succeed(block)
  }

  const built =
    memoMap === undefined
      ? Layer.build(construction.layer)
      : Effect.flatMap(Effect.scope, scope =>
          Layer.buildWithMemoMap(construction.layer, memoMap, scope),
        )

  return Effect.flatMap(built, context =>
    Effect.provide(construction.read, context),
  )
}

/** @internal Acquires a root whose construction requirements are supplied by its Program providers. */
export function resolveProgramRoot(
  block: RootBlock,
  memoMap?: Layer.MemoMap,
): Effect.Effect<AnyBlock, any, Scope.Scope>
export function resolveProgramRoot(
  block: RootBlock,
  memoMap?: Layer.MemoMap,
): Effect.Effect<AnyBlock, any, any> {
  return resolveRootBlock(block, memoMap)
}
