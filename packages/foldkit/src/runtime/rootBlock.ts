import { Effect, Layer, Predicate, type Scope } from 'effect'
import type { Schema } from 'effect'

import { assertCompletedBlock } from '../block/assemblyState.js'
import type { AnyBlock } from '../block/definition.js'
import type { Owner } from '../block/owner.js'
import type {
  RequirementsOfBlock,
  RuntimeServicesOfBlock,
} from '../block/requirements.js'
import type {
  CoreContractFromFacts,
  DescriptorTypeId,
  PublicFacts,
} from '../experimental/constructed/contract.js'
import type { ContractGraph } from '../experimental/contracted/contract.js'
import type {
  ImplementationFacts,
  SelectedImplementationFacts,
} from '../experimental/contracted/implementationFacts.js'

type AnySchema = Schema.Codec<any, any, any, any>

export type DeclaredRootBlock = Readonly<{
  owner: Owner<string>
  Model: AnySchema
  Message: AnySchema
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
export type RootRuntimeServices<Value extends RootBlock> =
  Value extends LayeredRoot
    ? Value extends LayeredRoot<any, any, infer RuntimeServices, any>
      ? RuntimeServices
      : never
    : RuntimeServicesOfBlock<Value>

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

type MatchedImplementation<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> = Extract<
  Layer.Success<LayerValue>,
  SelectedImplementationFacts<SelectedResultOf<BlockValue>, any, any, any>
>

/** @internal Checks the complete selected public contract and correlated host readiness. */
export type ValidateSelectedLayer<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> = [Extract<Layer.Success<LayerValue>, SelectedResultOf<BlockValue>>] extends [
  never,
]
  ? Readonly<{
      'Selected Layer must implement the paired Block public contract': LayerValue
    }>
  : [MatchedImplementation<BlockValue, LayerValue>] extends [never]
    ? Readonly<{
        'Layer has no checked implementation Facts for the paired Block': LayerValue
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
      : never

/** @internal Projects only private facts associated with the paired public result. */
export type SelectedBlockLayerFacts<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Any,
> =
  MatchedImplementation<
    BlockValue,
    LayerValue
  > extends SelectedImplementationFacts<any, any, infer Facts, any>
    ? Facts extends PublicFacts
      ? Facts
      : never
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

/** @internal Types an explicit public Block and selected implementation Layer pair. */
export type SelectedLayeredRoot<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Layer<any, any, any>,
> = LayeredRoot<
  SelectedLayerContract<BlockValue, LayerValue>,
  SelectedBlockLayerFacts<BlockValue, LayerValue>['programRequirements'],
  SelectedBlockLayerFacts<BlockValue, LayerValue>['runtimeServices'],
  LayerValue
> &
  Readonly<{ block: BlockValue }>

type SelectedLayerContract<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Layer<any, any, any>,
> = CoreContractFromFacts<
  BlockValue['owner'],
  BlockValue['Model'],
  BlockValue['Message'],
  BlockValue['OutMessage'],
  SelectedBlockLayerFacts<BlockValue, LayerValue>
> &
  Readonly<{
    [DescriptorTypeId]: SelectedBlockLayerFacts<BlockValue, LayerValue>
  }>

/** @internal Makes the explicit public Block/Layer host selection consumable. */
export const selectLayeredRoot = <
  const BlockValue extends DeclaredRootBlock,
  const LayerValue extends Layer.Layer<any, any, any>,
>(
  block: BlockValue,
  layer: LayerValue,
  read: Effect.Effect<AnyBlock, never, any>,
): SelectedLayeredRoot<BlockValue, LayerValue> => {
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
