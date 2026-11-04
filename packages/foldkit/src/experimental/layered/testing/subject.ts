import { type Layer, Predicate, Schema } from 'effect'

import type {
  DeclaredRootBlock,
  LayeredRoot,
  SelectedLayeredRoot,
  ValidateSelectedLayer,
} from '../../../runtime/rootBlock.js'
import type { FactsOf } from '../../constructed/contract.js'
import type { InitStep } from './initialState.js'
import type {
  BlockLayerSubject,
  BlockSubject,
  TestBlock,
  TestContract,
  ValidateTestBlock,
} from './withBlock.js'

/** @internal The exact parent Model used by the test steps. */
export type TestModel<Block extends BlockSubject> =
  TestContract<Block>['Model']['Type']

/** @internal Includes the completed graph's generated child envelopes. */
export type TestMessage<Block extends BlockSubject> =
  TestBlock<Block>['Message'] extends Schema.Top
    ? TestBlock<Block>['Message']['Type']
    : never

/** @internal Assertions use the declared OutMessage contract. */
export type TestOutMessage<Block extends BlockSubject> = Schema.Schema.Type<
  Extract<TestContract<Block>['OutMessage'], Schema.Top>
>

/** @internal Exact startup arguments, including optional and rest parameters. */
export type TestInit<Block extends BlockSubject> = InitStep<
  FactsOf<TestContract<Block>>['initArgs']
>

/** @internal The separate decoded input accepted by the selected Block. */
export type TestInMessage<Block extends BlockSubject> =
  FactsOf<TestContract<Block>> extends Readonly<{
    inMessage: Readonly<{ Schema: infer InputSchema extends Schema.Top }>
  }>
    ? InputSchema['Type']
    : never

type InMessageContext<Block extends BlockSubject> =
  FactsOf<TestContract<Block>> extends Readonly<{
    inMessage: Readonly<{
      context: infer Context extends ReadonlyArray<unknown>
    }>
  }>
    ? Context
    : readonly []

/** @internal A direct subject needs no required per-dispatch context. */
export type DirectSubject<Block extends BlockSubject> = Block &
  ValidateTestBlock<Block> &
  ([] extends FactsOf<TestContract<Block>>['updateContext']
    ? unknown
    : Readonly<{
        'Supply the Block updateContext in the test config': never
      }>) &
  ([] extends InMessageContext<Block>
    ? unknown
    : Readonly<{
        'Supply the Block inMessageContext in the test config': never
      }>)

/** @internal Each dispatch path requires only its own declared Context tuple. */
export type TestConfig<Block extends BlockSubject> = Readonly<{
  block: Block & ValidateTestBlock<Block>
  layer?: never
  update?: never
  view?: never
}> &
  ([] extends FactsOf<TestContract<Block>>['updateContext']
    ? Readonly<{
        updateContext?: FactsOf<TestContract<Block>>['updateContext'] &
          ReadonlyArray<unknown>
      }>
    : Readonly<{
        updateContext: FactsOf<TestContract<Block>>['updateContext'] &
          ReadonlyArray<unknown>
      }>) &
  ([] extends InMessageContext<Block>
    ? Readonly<{ inMessageContext?: InMessageContext<Block> }>
    : Readonly<{ inMessageContext: InMessageContext<Block> }>)

/** @internal Erased runtime shape behind the checked subject overloads. */
export type TestSubject =
  | Exclude<
      BlockSubject,
      | LayeredRoot
      | BlockLayerSubject<DeclaredRootBlock, Layer.Layer<any, any, any>>
    >
  | SelectedTestConfig<DeclaredRootBlock, Layer.Layer<any, any, any>>
  | Readonly<{
      block: Exclude<
        BlockSubject,
        BlockLayerSubject<DeclaredRootBlock, Layer.Layer<any, any, any>>
      >
      updateContext?: ReadonlyArray<unknown>
      inMessageContext?: ReadonlyArray<unknown>
    }>

/** @internal A selected Layer plus the optional per-dispatch test context. */
export type SelectedTestConfig<
  Block extends DeclaredRootBlock,
  LayerValue extends Layer.Layer<any, any, any>,
> = BlockLayerSubject<Block, LayerValue> &
  Readonly<{
    layer: NoInfer<ValidateSelectedLayer<Block, LayerValue>>
  }> &
  Omit<TestConfig<SelectedLayeredRoot<Block, LayerValue>>, 'block' | 'layer'> &
  Readonly<{
    viewInputs?: unknown
    routing?: unknown
  }>

/** @internal Reads the subject without acquiring its graph. */
export const subjectBlock = (
  subject: TestSubject,
):
  | BlockSubject
  | BlockLayerSubject<DeclaredRootBlock, Layer.Layer<any, any, any>> => {
  if ('layer' in subject) {
    return subject
  }

  return 'block' in subject ? subject.block : subject
}

/** @internal Adapts explicit dispatch context to the synchronous test runner. */
export const subjectUpdate = (subject: TestSubject, block: object) => {
  const update = Reflect.get(block, 'update')

  if (!Predicate.isFunction(update)) {
    throw new Error('[foldkit] A Block test requires an acquired update.')
  }

  const context = 'block' in subject ? (subject.updateContext ?? []) : []

  return (model: unknown, message: unknown): unknown =>
    Reflect.apply(update, undefined, [model, message, ...context])
}

/** @internal Keeps InMessage inputs and context separate from ordinary Message dispatch. */
export const subjectInMessageUpdate =
  (subject: TestSubject, block: object) =>
  (model: unknown, input: unknown): unknown => {
    const schema = Reflect.get(block, 'InMessage')
    const inMessageUpdate = Reflect.get(block, 'inMessageUpdate')

    if (!Schema.isSchema(schema) || !Predicate.isFunction(inMessageUpdate)) {
      throw new Error(
        '[foldkit] inMessage requires a Block with an InMessage Schema and inMessageUpdate function.',
      )
    }

    if (!Schema.is(schema)(input)) {
      throw new Error(
        '[foldkit] A test InMessage must satisfy the selected Block InMessage Schema.',
      )
    }

    const context = 'block' in subject ? (subject.inMessageContext ?? []) : []

    if (!globalThis.Array.isArray(context)) {
      throw new Error(
        '[foldkit] A test inMessageContext must be an argument tuple.',
      )
    }

    return Reflect.apply(inMessageUpdate, undefined, [model, input, ...context])
  }

/** @internal Resolves deferred init inside the acquired graph's lifetime. */
export const initialStep = (
  block: object,
  initial: unknown,
  givenInit: (...args: ReadonlyArray<never>) => unknown,
): unknown => {
  if (Predicate.isFunction(initial) && Reflect.has(initial, '_phantomModel')) {
    return initial
  }

  if (!Predicate.isTagged(initial, 'BlockInitStep')) {
    throw new Error(
      '[foldkit] A Block test starts with init(...) or given(model).',
    )
  }

  const args: unknown = Reflect.get(initial, 'args')
  const initialize = Reflect.get(block, 'init')

  if (!globalThis.Array.isArray(args) || !Predicate.isFunction(initialize)) {
    throw new Error(
      '[foldkit] A Block test requires valid initializer arguments.',
    )
  }

  const initialized: unknown = Reflect.apply(initialize, undefined, args)

  return Reflect.apply(givenInit, undefined, [initialized])
}
