import { Predicate, type Schema } from 'effect'

import {
  type AssemblyDraft,
  type AssemblyDraftTypeId,
  type CompletionProof,
  completeAssemblyDraft,
} from './assemblyState.js'
import type { DefaultViewTypeId } from './defaultView.js'
import type {
  AnyBlock,
  LocalEffectsLayerTypeId,
  LocalMountsTypeId,
} from './definition.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnyProducer = (...args: ReadonlyArray<never>) => unknown
type IsAny<Value> = 0 extends 1 & Value ? true : false
type IsUnion<Value, Whole = Value> = Value extends Whole
  ? [Whole] extends [Value]
    ? false
    : true
  : never
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false

type IsPlainProducer<Producer extends AnyProducer> = [Producer] extends [never]
  ? true
  : Equal<Producer, () => ReturnType<Producer>>

declare const InvalidAssemblyProducerTypeId: unique symbol

type PlainProducerConstraint<Producer extends AnyProducer> = {
  readonly [
    Key in IsPlainProducer<Producer> extends true
      ? never
      : typeof InvalidAssemblyProducerTypeId
  ]: never
}

type FixedKeys = Exclude<
  keyof AnyBlock,
  'OutMessage' | typeof DefaultViewTypeId
>
type FixedContract = Required<Pick<AnyBlock, FixedKeys>>

type CheckedCompleted<ModelSchema extends AnySchema, Completed> =
  IsAny<ModelSchema> extends true
    ? never
    : IsAny<Completed> extends true
      ? never
      : [Completed] extends [never]
        ? never
        : true extends IsUnion<Completed>
          ? never
          : [Completed] extends [FixedContract]
            ? Equal<keyof Completed, keyof AnyBlock> extends true
              ? Equal<Completed, Readonly<Completed>> extends true
                ? Equal<ModelSchema, Completed['Model']> extends true
                  ? Completed
                  : never
                : never
              : never
            : never

type CheckedProduced<ModelSchema extends AnySchema, Draft> =
  IsAny<Draft> extends true
    ? never
    : [Draft] extends [never]
      ? never
      : true extends IsUnion<Draft>
        ? never
        : [Draft] extends [AssemblyDraft<object>]
          ? Equal<keyof Draft, keyof AssemblyDraft<object>> extends true
            ? Equal<Draft, Readonly<Draft>> extends true
              ? AssemblyDraft<
                  CheckedCompleted<
                    ModelSchema,
                    Draft[typeof AssemblyDraftTypeId]
                  >
                >
              : never
            : never
          : never

type AssemblyProducer<
  ModelSchema extends AnySchema,
  Producer extends AnyProducer,
> = ((
  ...args: ReadonlyArray<never>
) => CheckedProduced<ModelSchema, ReturnType<Producer>>) &
  PlainProducerConstraint<Producer>

type ProducedBlock<Producer extends AnyProducer> =
  ReturnType<Producer> extends AssemblyDraft<object>
    ? ReturnType<Producer>[typeof AssemblyDraftTypeId]
    : never

type MissingAssemblyAnnotation = Readonly<{
  'Block.assemble requires a FromAssembly annotation with typeof Model and typeof prepare': never
}>

type CompleteAssemblyArguments<
  ModelSchema extends AnySchema,
  Producer extends AnyProducer,
  Capabilities,
> =
  IsAny<ModelSchema> extends true
    ? readonly [error: never]
    : [ModelSchema] extends [never]
      ? readonly [missingFromAssemblyAnnotation: MissingAssemblyAnnotation]
      : IsAny<Producer> extends true
        ? readonly [error: never]
        : [Producer] extends [never]
          ? readonly [error: never]
          : [ProducedBlock<Producer>] extends [never]
            ? readonly [error: never]
            : [ProducedBlock<Producer>] extends [Capabilities]
              ? readonly []
              : readonly [error: never]

type InvalidBlockProducer = Readonly<{
  'Block producer must return one original assembly draft with the supplied exact Model Schema': never
}>

type ProducedMember<Producer, Key extends PropertyKey> =
  IsAny<Producer> extends true
    ? InvalidBlockProducer
    : [Producer] extends [never]
      ? InvalidBlockProducer
      : Producer extends AnyProducer
        ? IsAny<ReturnType<Producer>> extends true
          ? InvalidBlockProducer
          : [ProducedBlock<Producer>] extends [never]
            ? InvalidBlockProducer
            : Key extends keyof ProducedBlock<Producer>
              ? ProducedBlock<Producer>[Key]
              : InvalidBlockProducer
        : InvalidBlockProducer

interface AssemblyFields<
  ModelSchema extends AnySchema,
  Producer,
> extends CompletionProof {
  readonly Model: ModelSchema
  readonly owner: ProducedMember<Producer, 'owner'>
  readonly Message: ProducedMember<Producer, 'Message'>
  readonly mounts: ProducedMember<Producer, 'mounts'>
  readonly [LocalMountsTypeId]: ProducedMember<
    Producer,
    typeof LocalMountsTypeId
  >
  readonly bindings: ProducedMember<Producer, 'bindings'>
  readonly init: ProducedMember<Producer, 'init'>
  readonly update: ProducedMember<Producer, 'update'>
  readonly operations: ProducedMember<Producer, 'operations'>
  readonly subscriptions: ProducedMember<Producer, 'subscriptions'>
  readonly managedResources: ProducedMember<Producer, 'managedResources'>
  readonly EffectsLayer: ProducedMember<Producer, 'EffectsLayer'>
  readonly [LocalEffectsLayerTypeId]: ProducedMember<
    Producer,
    typeof LocalEffectsLayerTypeId
  >
  readonly __blockHandlerRequirements: ProducedMember<
    Producer,
    '__blockHandlerRequirements'
  >
  readonly hostHandlers: ProducedMember<Producer, 'hostHandlers'>
  readonly makeView: ProducedMember<Producer, 'makeView'>
  readonly replaceEffectsLayer: ProducedMember<Producer, 'replaceEffectsLayer'>
  readonly provideHandlers: ProducedMember<Producer, 'provideHandlers'>
}

/**
 * Gives emitted declarations a public name for an assembly with a default view and an OutMessage Schema.
 *
 * Use {@link FromAssemblyWithViewAndOutMessage} for application annotations. That checked
 * alias also rejects a producer typed as `any`; this interface supports inferred
 * declarations that refer to the completed Block.
 *
 * @typeParam ModelSchema - `typeof Model` for the canonical Schema used by the
 * producer's Definition, with its exact decoded, encoded, and service types.
 * @typeParam Producer - A plain zero-argument function with no overloads or added
 * properties, returning one assembly draft from `Composition.prepareBlock`.
 * Its completed contract must have readonly members, no extra fields, and a
 * Model Schema type exactly matching `ModelSchema`.
 */
export interface AssemblyWithViewAndOutMessage<
  ModelSchema extends AnySchema,
  Producer extends AssemblyProducer<ModelSchema, Producer>,
> extends AssemblyFields<ModelSchema, Producer> {
  readonly OutMessage: ProducedMember<Producer, 'OutMessage'>
  readonly [DefaultViewTypeId]: ProducedMember<
    Producer,
    typeof DefaultViewTypeId
  >
}

/**
 * Gives emitted declarations a public name for an assembly with a default view and no OutMessage Schema.
 *
 * Use {@link FromAssemblyWithView} for application annotations. That checked
 * alias also rejects a producer typed as `any`; this interface supports inferred
 * declarations that refer to the completed Block.
 *
 * @typeParam ModelSchema - `typeof Model` for the canonical Schema used by the
 * producer's Definition, with its exact decoded, encoded, and service types.
 * @typeParam Producer - A plain zero-argument function with no overloads or added
 * properties, returning one assembly draft from `Composition.prepareBlock`.
 * Its completed contract must have readonly members, no extra fields, and a
 * Model Schema type exactly matching `ModelSchema`.
 */
export interface AssemblyWithView<
  ModelSchema extends AnySchema,
  Producer extends AssemblyProducer<ModelSchema, Producer>,
> extends AssemblyFields<ModelSchema, Producer> {
  readonly OutMessage?: never
  readonly [DefaultViewTypeId]: ProducedMember<
    Producer,
    typeof DefaultViewTypeId
  >
}

/**
 * Gives emitted declarations a public name for an assembly with an OutMessage Schema and no default view.
 *
 * Use {@link FromAssemblyWithOutMessage} for application annotations. That checked
 * alias also rejects a producer typed as `any`; this interface supports inferred
 * declarations that refer to the completed Block.
 *
 * @typeParam ModelSchema - `typeof Model` for the canonical Schema used by the
 * producer's Definition, with its exact decoded, encoded, and service types.
 * @typeParam Producer - A plain zero-argument function with no overloads or added
 * properties, returning one assembly draft from `Composition.prepareBlock`.
 * Its completed contract must have readonly members, no extra fields, and a
 * Model Schema type exactly matching `ModelSchema`.
 */
export interface AssemblyWithOutMessage<
  ModelSchema extends AnySchema,
  Producer extends AssemblyProducer<ModelSchema, Producer>,
> extends AssemblyFields<ModelSchema, Producer> {
  readonly OutMessage: ProducedMember<Producer, 'OutMessage'>
  readonly [DefaultViewTypeId]?: never
}

/**
 * Gives emitted declarations a public name for an assembly with no default view or OutMessage Schema.
 *
 * Use {@link FromAssemblyWithoutViewOrOutMessage} for application annotations. That checked
 * alias also rejects a producer typed as `any`; this interface supports inferred
 * declarations that refer to the completed Block.
 *
 * @typeParam ModelSchema - `typeof Model` for the canonical Schema used by the
 * producer's Definition, with its exact decoded, encoded, and service types.
 * @typeParam Producer - A plain zero-argument function with no overloads or added
 * properties, returning one assembly draft from `Composition.prepareBlock`.
 * Its completed contract must have readonly members, no extra fields, and a
 * Model Schema type exactly matching `ModelSchema`.
 */
export interface AssemblyWithoutViewOrOutMessage<
  ModelSchema extends AnySchema,
  Producer extends AssemblyProducer<ModelSchema, Producer>,
> extends AssemblyFields<ModelSchema, Producer> {
  readonly OutMessage?: never
  readonly [DefaultViewTypeId]?: never
}

/**
 * Assembles a completed Block through its explicit Model and producer annotation.
 *
 * Initialize a {@link FromAssemblyWithView} annotation, or its matching
 * headless or OutMessage variant, with `Block.assemble(prepare)`. The producer
 * must be a plain zero-argument function returning the original opaque draft
 * from `Composition.prepareBlock`. Its Model Schema must exactly match the
 * annotation's canonical `typeof Model`.
 *
 * The named `prepare` function and explicit annotation establish a TypeScript
 * performance boundary. The annotation exposes the canonical Model Schema
 * directly, so a parent using `ChildBlock.Model` need not infer the child's
 * entire implementation to discover that Schema. The function lets the header
 * refer to the exact prepared contract while preserving its inferred channels.
 * This boundary reduces inference work; it does not eliminate all editor latency.
 *
 * Calls the producer once and returns the original Block behind its draft.
 * Completion builds no Layers and starts no lifecycle work. A copied draft,
 * a completed Block, or a structurally similar object is rejected at runtime.
 *
 * @param producer - The private, plain zero-argument `prepare` function. It is
 * invoked once during this call, not deferred until the Runtime starts.
 * @see FromAssemblyWithView for a complete assembly example and performance guidance.
 */
export function assemble<
  const ModelSchema extends AnySchema = never,
  Producer extends AssemblyProducer<ModelSchema, Producer> = never,
>(
  producer: Producer,
  ...validation: CompleteAssemblyArguments<
    ModelSchema,
    Producer,
    Readonly<{ OutMessage: AnySchema; [DefaultViewTypeId]: unknown }>
  >
): AssemblyWithViewAndOutMessage<ModelSchema, Producer>
export function assemble<
  const ModelSchema extends AnySchema = never,
  Producer extends AssemblyProducer<ModelSchema, Producer> = never,
>(
  producer: Producer,
  ...validation: CompleteAssemblyArguments<
    ModelSchema,
    Producer,
    Readonly<{ OutMessage?: never; [DefaultViewTypeId]: unknown }>
  >
): AssemblyWithView<ModelSchema, Producer>
export function assemble<
  const ModelSchema extends AnySchema = never,
  Producer extends AssemblyProducer<ModelSchema, Producer> = never,
>(
  producer: Producer,
  ...validation: CompleteAssemblyArguments<
    ModelSchema,
    Producer,
    Readonly<{ OutMessage: AnySchema; [DefaultViewTypeId]?: never }>
  >
): AssemblyWithOutMessage<ModelSchema, Producer>
export function assemble<
  const ModelSchema extends AnySchema = never,
  Producer extends AssemblyProducer<ModelSchema, Producer> = never,
>(
  producer: Producer,
  ...validation: CompleteAssemblyArguments<
    ModelSchema,
    Producer,
    Readonly<{ OutMessage?: never; [DefaultViewTypeId]?: never }>
  >
): AssemblyWithoutViewOrOutMessage<ModelSchema, Producer>
export function assemble(producer: AnyProducer): unknown {
  if (!Predicate.isFunction(producer)) {
    throw new Error(
      '[foldkit] Block.assemble requires a plain assembly producer.',
    )
  }

  return completeAssemblyDraft(producer())
}

/**
 * Annotates a completed Block with a default view and an OutMessage Schema.
 *
 * Choose this helper when `prepareBlock` receives a view and the Definition
 * declares an OutMessage Schema. Initialize the annotation with
 * `Block.assemble(prepare)`. Completion preserves the original Model Schema
 * object and every other member without building Layers or starting lifecycle
 * work.
 *
 * The explicit Model Schema and named producer provide the same TypeScript
 * performance boundary as {@link FromAssemblyWithView}.
 *
 * A producer typed as `any`, or returning `any`, is rejected. A never-returning
 * producer cannot provide a usable Block. Union returns, mutable members, and
 * extra fields are unsupported.
 *
 * @typeParam ModelSchema - `typeof Model` for the canonical Schema used by the
 * producer's Definition, with its exact decoded, encoded, and service types.
 * @typeParam Producer - `typeof prepare` for a plain zero-argument function
 * with no overloads or added properties, returning an original assembly draft.
 * @see FromAssemblyWithView for an example keeping Model local to its module.
 */
export type FromAssemblyWithViewAndOutMessage<
  ModelSchema extends AnySchema,
  Producer extends AssemblyProducer<ModelSchema, Producer>,
> =
  IsAny<Producer> extends true
    ? never
    : AssemblyWithViewAndOutMessage<ModelSchema, Producer>

/**
 * Annotates a completed Block with a default view and no OutMessage Schema.
 *
 * Choose this helper when `prepareBlock` receives a view and the Definition
 * omits OutMessage. Initialize the annotation with `Block.assemble(prepare)`.
 * Completion preserves the original Model Schema object and every other member
 * without building Layers or starting lifecycle work. Model can stay local to
 * its module while consumers read the completed Block's `Model` member.
 *
 * Keep the private `prepare` function and explicit annotation together. The
 * annotation exposes the canonical Model Schema directly instead of making a
 * parent Schema infer it through the child's update, view, Bindings, and effects.
 * The function supplies the exact prepared contract for the remaining members,
 * preserving their arguments and requirements. This is a TypeScript performance
 * boundary, not an extra Runtime phase or a guarantee of instantaneous editing.
 * An unannotated `Block.assemble(() => ...)` call is rejected. Use the named
 * producer pattern below so lint can also recognize the checked boundary.
 *
 * Packages that emit declarations should give public completed Blocks a named
 * interface extending this checked type, then annotate the same-named value
 * with that interface. This keeps parent declarations from repeatedly expanding
 * the child's inferred implementation. Applications that only bundle JavaScript
 * may keep the direct checked annotation. Neither form guarantees that arbitrary
 * composition graphs can be serialized without TypeScript size limits.
 *
 * A producer typed as `any`, or returning `any`, is rejected. A never-returning
 * producer cannot provide a usable Block. Union returns, mutable members, and
 * extra fields are unsupported.
 *
 * @typeParam ModelSchema - `typeof Model` for the canonical Schema used by the
 * producer's Definition, with its exact decoded, encoded, and service types.
 * @typeParam Producer - `typeof prepare` for a plain zero-argument function
 * with no overloads or added properties, returning an original assembly draft.
 *
 * @example
 * ```ts
 * import { Schema } from 'effect'
 * import { Block } from 'foldkit'
 *
 * const Model = Schema.Struct({ count: Schema.Number })
 * const CounterDefinition = Block.makeDefinition('Counter', {
 *   Model,
 *   Message: Schema.Never,
 * })
 * const CounterComposition = CounterDefinition.makeComposition()
 * const prepare = () =>
 *   CounterComposition.prepareBlock({
 *     init: CounterComposition.makeInit(() => ({
 *       model: Model.make({ count: 0 }),
 *     })),
 *     update: CounterComposition.makeUpdate({}),
 *     view: CounterComposition.makeView((model, h) =>
 *       h.div([], [globalThis.String(model.count)]),
 *     ),
 *   })
 * export interface CounterBlock extends Block.FromAssemblyWithView<
 *   typeof Model,
 *   typeof prepare
 * > {}
 * export const CounterBlock: CounterBlock = Block.assemble(prepare)
 * ```
 */
export type FromAssemblyWithView<
  ModelSchema extends AnySchema,
  Producer extends AssemblyProducer<ModelSchema, Producer>,
> =
  IsAny<Producer> extends true ? never : AssemblyWithView<ModelSchema, Producer>

/**
 * Annotates a completed Block with an OutMessage Schema and no default view.
 *
 * Choose this helper when the Definition declares an OutMessage Schema and
 * `prepareBlock` omits the view. Initialize the annotation with
 * `Block.assemble(prepare)`. Completion preserves the original Model Schema
 * object and every other member without building Layers or starting lifecycle
 * work.
 *
 * The explicit Model Schema and named producer provide the same TypeScript
 * performance boundary as {@link FromAssemblyWithView}.
 *
 * A producer typed as `any`, or returning `any`, is rejected. A never-returning
 * producer cannot provide a usable Block. Union returns, mutable members, and
 * extra fields are unsupported.
 *
 * @typeParam ModelSchema - `typeof Model` for the canonical Schema used by the
 * producer's Definition, with its exact decoded, encoded, and service types.
 * @typeParam Producer - `typeof prepare` for a plain zero-argument function
 * with no overloads or added properties, returning an original assembly draft.
 * @see FromAssemblyWithView for an example keeping Model local to its module.
 */
export type FromAssemblyWithOutMessage<
  ModelSchema extends AnySchema,
  Producer extends AssemblyProducer<ModelSchema, Producer>,
> =
  IsAny<Producer> extends true
    ? never
    : AssemblyWithOutMessage<ModelSchema, Producer>

/**
 * Annotates a completed Block with no default view or OutMessage Schema.
 *
 * Choose this helper when the Definition omits OutMessage and `prepareBlock`
 * omits the view. Initialize the annotation with `Block.assemble(prepare)`.
 * Completion preserves the original Model Schema object and every other member
 * without building Layers or starting lifecycle work.
 *
 * The explicit Model Schema and named producer provide the same TypeScript
 * performance boundary as {@link FromAssemblyWithView}.
 *
 * A producer typed as `any`, or returning `any`, is rejected. A never-returning
 * producer cannot provide a usable Block. Union returns, mutable members, and
 * extra fields are unsupported.
 *
 * @typeParam ModelSchema - `typeof Model` for the canonical Schema used by the
 * producer's Definition, with its exact decoded, encoded, and service types.
 * @typeParam Producer - `typeof prepare` for a plain zero-argument function
 * with no overloads or added properties, returning an original assembly draft.
 * @see FromAssemblyWithView for an example keeping Model local to its module.
 */
export type FromAssemblyWithoutViewOrOutMessage<
  ModelSchema extends AnySchema,
  Producer extends AssemblyProducer<ModelSchema, Producer>,
> =
  IsAny<Producer> extends true
    ? never
    : AssemblyWithoutViewOrOutMessage<ModelSchema, Producer>
