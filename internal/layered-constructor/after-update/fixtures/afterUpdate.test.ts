import { Effect, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import { toParentMessageFor } from '../../test/toParentMessageFor.js'
import * as Update from '../../update/index.js'
import { withBlock } from '../layered/testing/withBlock.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ ClickedIncrement: {}, ClickedReport: {} })
const OutMessage = defineMessageUnion({ Reported: { count: Schema.Number } })
const Key = Symbol('AfterUpdateCounter')
const Definition = Block.makeDefinition('AfterUpdateCounter', {
  key: Key,
  Model,
  Message,
  OutMessage,
  Init: Schema.Tuple([]),
  operations: {
    increment: Message.ClickedIncrement,
    report: { message: Message.ClickedReport, outMessage: OutMessage.Reported },
  },
})
const Composition = Definition.makeComposition()
const baseUpdate = Composition.makeUpdate({
  ClickedIncrement: Definition.makeFieldsStep(() => ({
    count: count => count + 1,
  })),
  ClickedReport: Definition.makeOutMessageStep(model =>
    OutMessage.Reported({ count: model.count }),
  ),
})
const observations: Array<
  Readonly<{ before: number; after: number; tag: string }>
> = []
const simpleAfter = (before: Model) =>
  Definition.makeFieldsStep(() => ({ count: () => before.count }))
const simpleUpdate = Composition.makeUpdate.withAfter(baseUpdate, simpleAfter)
void simpleUpdate
const afterMessage = (before: Model, message: typeof Message.Type) => {
  const tail = Definition.makeStep(model => {
    observations.push({
      before: before.count,
      after: model.count,
      tag: message._tag,
    })

    return Update.combineSteps([
      Definition.makeFieldsStep(() => ({ count: count => count * 2 })),
      Definition.makeFieldsStep(() => ({ count: count => count + 3 })),
    ])
  })

  return tail
}
const update = Composition.makeUpdate.withAfter(baseUpdate, afterMessage)
const CounterBlock = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init: Composition.makeInit(() => ({ model: { count: 0 } })),
    update,
  }),
)

describe('owned after-update transitions', () => {
  it('defers the tail, gives it the final Model, and preserves exact operation OutMessages', async () => {
    observations.splice(0)

    await Effect.runPromise(
      withBlock(CounterBlock, block => {
        expect(observations).toEqual([])
        const initial = block.init().model
        expect(observations).toEqual([])

        const incremented = block.operations.increment(initial)
        expectTypeOf(incremented.outMessage).toEqualTypeOf<undefined>()
        expect(incremented.model.count).toBe(5)

        const reported = block.operations.report(initial)
        expectTypeOf(reported.outMessage).toEqualTypeOf<
          typeof OutMessage.Reported.Type | undefined
        >()
        expect(reported.outMessage).toEqual(OutMessage.Reported({ count: 0 }))
        expect(reported.model.count).toBe(3)

        const curried = block.update(Message.ClickedIncrement())(initial)
        expect(curried.model.count).toBe(5)
        expect(observations).toEqual([
          { before: 0, after: 1, tag: 'ClickedIncrement' },
          { before: 0, after: 0, tag: 'ClickedReport' },
          { before: 0, after: 1, tag: 'ClickedIncrement' },
        ])
      }),
    )
  })

  it('runs once after routed child updates and their parent OutMessage fold', async () => {
    const ChildKey = Symbol('AfterUpdateChild')
    const ChildMessage = defineMessageUnion({
      ClickedSet: { count: Schema.Number },
    })
    const ChildDefinition = Block.makeDefinition('AfterUpdateChild', {
      key: ChildKey,
      Model,
      Message: ChildMessage,
      OutMessage,
      Init: Schema.Tuple([]),
    })
    const ChildComposition = ChildDefinition.makeComposition()
    const ChildBlock = ChildDefinition.makeBlock(
      Effect.succeed({
        children: [],
        init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
        update: ChildComposition.makeUpdate({
          ClickedSet: (model, { count }) => ({
            model: modifyFields(model, { count: () => count }),
            outMessage: OutMessage.Reported({ count }),
          }),
        }),
      }),
    )
    const ParentKey = Symbol('AfterUpdateRoutedParent')
    const ParentDefinition = Block.makeDefinition('AfterUpdateRoutedParent', {
      key: ParentKey,
      Model: Schema.Struct({ child: Model, count: Schema.Number }),
      Message: Schema.Never,
      Init: Schema.Tuple([]),
    })
    const ChildBinding = ParentDefinition.makeBinding(
      ChildDefinition.contract,
      { field: 'child' },
    ).withOutMessagePolicy({
      fold: ParentDefinition.makeOutMessageFold(ChildDefinition.contract, {
        Reported: ({ count }) =>
          ParentDefinition.makeFieldsStep(() => ({ count: () => count + 10 })),
      }),
    })
    const ParentComposition = ParentDefinition.makeComposition({
      bindings: [ChildBinding],
    })
    const seen: Array<readonly [number, number, number]> = []
    const afterChild = (before: typeof ParentDefinition.contract.Model.Type) =>
      ParentDefinition.makeStep(model => {
        seen.push([before.count, model.count, model.child.count])

        return { model: modifyFields(model, { count: count => count * 2 }) }
      })
    const ParentBlock = ParentDefinition.makeBlock(
      Effect.gen(function* () {
        const child = yield* ChildBinding

        return {
          children: [child],
          init: ParentComposition.makeInit(() => ({ model: { count: 0 } })),
          update: ParentComposition.makeUpdate.withAfter(
            ParentComposition.makeUpdate({}),
            afterChild,
          ),
        }
      }),
    ).provide(ChildBlock.layer)

    await Effect.runPromise(
      withBlock(ParentBlock, block => {
        const delivered = toParentMessageFor(block)(
          ChildBinding,
          ChildMessage.ClickedSet({ count: 4 }),
        )
        const result = block.update(block.init().model, delivered)
        expect(result.model).toEqual({ child: { count: 4 }, count: 28 })
        expect(seen).toEqual([[0, 14, 4]])
      }),
    )
  })

  it('rejects foreign plans and native functions without weakening completion identity', () => {
    const OtherComposition = Definition.makeComposition()
    const foreign = OtherComposition.makeUpdate({
      ClickedIncrement: Definition.makeNoopStep(),
      ClickedReport: Definition.makeNoopStep(),
    })
    expect(() =>
      Reflect.apply(Composition.makeUpdate.withAfter, undefined, [
        foreign,
        () => Definition.makeNoopStep(),
      ]),
    ).toThrow('must belong to this Composition')

    const Native = Block.makeDefinition('AfterNativeIdentity', {
      Model,
      Message,
    })
    const NativeComposition = Native.makeComposition()
    const nativeUpdate = NativeComposition.makeUpdate({
      ClickedIncrement: model => ({ model }),
      ClickedReport: model => ({ model }),
    })
    const wrapped = (model: Model, message: typeof Message.Type) =>
      nativeUpdate(model, message)

    expect(() =>
      Reflect.apply(NativeComposition.makeUpdate.withAfter, undefined, [
        wrapped,
        () => Native.makeNoopStep(),
      ]),
    ).toThrow('must belong to this Composition')
    expect(() =>
      Reflect.apply(NativeComposition.prepareBlock, undefined, [
        {
          init: NativeComposition.makeInit(() => ({ model: { count: 0 } })),
          update: wrapped,
        },
      ]),
    ).toThrow('must be authored with this Composition')
  })

  it('rejects an erased tail that emits a competing OutMessage', async () => {
    const invalid = Reflect.apply(Composition.makeUpdate.withAfter, undefined, [
      baseUpdate,
      () => (model: Model) => ({
        model,
        outMessage: OutMessage.Reported({ count: 99 }),
      }),
    ])
    const InvalidBlock = Reflect.apply(Definition.makeBlock, undefined, [
      Effect.succeed({
        children: [],
        init: Composition.makeInit(() => ({ model: { count: 0 } })),
        update: invalid,
      }),
    ])

    await expect(
      Effect.runPromise(
        Reflect.apply(withBlock, undefined, [
          InvalidBlock,
          (block: object) =>
            Reflect.apply(Reflect.get(block, 'update'), undefined, [
              { count: 0 },
              Message.ClickedIncrement(),
            ]),
        ]),
      ),
    ).rejects.toThrow('cannot emit an OutMessage')
  })
})
