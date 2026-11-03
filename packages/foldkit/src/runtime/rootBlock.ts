import { Effect, Layer, Predicate, type Scope } from 'effect'

import { assertCompletedBlock } from '../block/assemblyState.js'
import type { AnyBlock } from '../block/definition.js'
import type {
  RequirementsOfBlock,
  RuntimeServicesOfBlock,
} from '../block/requirements.js'
/** @internal Flat host evidence, independent of experimental authoring machinery. */
export declare const LayeredRootTypeId: unique symbol

/** @internal A Layer-owned root whose exact host contracts were inferred during completion. */
export interface LayeredRoot {
  readonly [LayeredRootTypeId]: Readonly<{
    contract: AnyBlock
    requirements: unknown
    runtimeServices: unknown
  }>
  readonly layer: Layer.Any
  readonly get: Effect.Effect<object, any, any>
}

/** @internal Roots accepted by browser and server hosts. */
export type RootBlock = AnyBlock | LayeredRoot

/** @internal Projects an already-known Layer-owned root without union dispatch. */
export type LayeredContract<Value extends LayeredRoot> =
  Value[typeof LayeredRootTypeId]['contract']

/** @internal Projects host contracts without constructing a completed facade. */
export type RootContract<Value extends RootBlock> = Value extends AnyBlock
  ? Value
  : Value extends LayeredRoot
    ? Value[typeof LayeredRootTypeId]['contract']
    : never

/** @internal Ordinary Services retained by the completed executable graph. */
export type RootRequirements<Value extends RootBlock> =
  Value extends LayeredRoot
    ? Value[typeof LayeredRootTypeId]['requirements']
    : RequirementsOfBlock<Value>

/** @internal ManagedResource handles supplied by the runtime after graph construction. */
export type RootRuntimeServices<Value extends RootBlock> =
  Value extends LayeredRoot
    ? Value[typeof LayeredRootTypeId]['runtimeServices']
    : RuntimeServicesOfBlock<Value>

/** @internal Failure of the graph Layer, separate from handler construction. */
export type RootConstructionError<Value extends RootBlock> =
  Value extends LayeredRoot ? Layer.Error<Value['layer']> : never

/** @internal Ordinary Services needed before the executable graph is available. */
export type RootConstructionRequirements<Value extends RootBlock> =
  Value extends LayeredRoot ? Layer.Services<Value['layer']> : never

/** @internal A registered construction recipe and private reader for its genuine core Block. */
export interface RootConstruction {
  readonly layer: Layer.Layer<any, any, any>
  readonly read: Effect.Effect<AnyBlock, never, any>
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
