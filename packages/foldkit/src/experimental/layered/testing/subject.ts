import { Predicate, Schema } from 'effect'

import type { FactsOf } from '../../constructed/contract.js'
import type { InitStep } from './initialState.js'
import type { BlockSubject, TestBlock, ValidateTestBlock } from './withBlock.js'

/** @internal The exact parent Model used by the test steps. */
export type TestModel<Block extends BlockSubject> = Block['Model']['Type']

/** @internal Includes the completed graph's generated child envelopes. */
export type TestMessage<Block extends BlockSubject> =
  TestBlock<Block>['Message'] extends Schema.Top
    ? TestBlock<Block>['Message']['Type']
    : never

/** @internal Assertions use the declared OutMessage contract. */
export type TestOutMessage<Block extends BlockSubject> = Schema.Schema.Type<
  Extract<Block['OutMessage'], Schema.Top>
>

/** @internal Exact startup arguments, including optional and rest parameters. */
export type TestInit<Block extends BlockSubject> = InitStep<
  FactsOf<Block>['initArgs']
>

/** @internal The separate decoded input accepted by the selected Block. */
export type TestInMessage<Block extends BlockSubject> =
  FactsOf<Block> extends Readonly<{
    inMessage: Readonly<{ Schema: infer InputSchema extends Schema.Top }>
  }>
    ? InputSchema['Type']
    : never

type InMessageContext<Block extends BlockSubject> =
  FactsOf<Block> extends Readonly<{
    inMessage: Readonly<{
      context: infer Context extends ReadonlyArray<unknown>
    }>
  }>
    ? Context
    : readonly []

/** @internal A direct subject needs no required per-dispatch context. */
export type DirectSubject<Block extends BlockSubject> = Block &
  ValidateTestBlock<Block> &
  ([] extends FactsOf<Block>['updateContext']
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
  update?: never
  view?: never
}> &
  ([] extends FactsOf<Block>['updateContext']
    ? Readonly<{
        updateContext?: FactsOf<Block>['updateContext'] & ReadonlyArray<unknown>
      }>
    : Readonly<{
        updateContext: FactsOf<Block>['updateContext'] & ReadonlyArray<unknown>
      }>) &
  ([] extends InMessageContext<Block>
    ? Readonly<{ inMessageContext?: InMessageContext<Block> }>
    : Readonly<{ inMessageContext: InMessageContext<Block> }>)

/** @internal Erased runtime shape behind the checked subject overloads. */
export type TestSubject =
  | BlockSubject
  | Readonly<{
      block: BlockSubject
      updateContext?: ReadonlyArray<unknown>
      inMessageContext?: ReadonlyArray<unknown>
    }>

/** @internal Reads the descriptor without acquiring its graph. */
export const subjectBlock = (subject: TestSubject): BlockSubject =>
  'block' in subject ? subject.block : subject

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

/** @internal Keeps receive inputs and context separate from ordinary Message dispatch. */
export const subjectReceive =
  (subject: TestSubject, block: object) =>
  (model: unknown, input: unknown): unknown => {
    const schema = Reflect.get(block, 'InMessage')
    const receive = Reflect.get(block, 'receive')

    if (!Schema.isSchema(schema) || !Predicate.isFunction(receive)) {
      throw new Error(
        '[foldkit] inMessage requires a Block with an InMessage Schema and receive function.',
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

    return Reflect.apply(receive, undefined, [model, input, ...context])
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
