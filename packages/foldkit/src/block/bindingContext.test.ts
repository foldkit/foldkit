import { Array, Layer, Option, Schema, Tuple } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import { makeDefinition } from './define.js'
import type { OutgoingMessageOfBinding } from './delivery.js'
import type { BindingInitRecipe } from './initRecipe.js'
import * as Block from './public.js'

const CounterModel = Schema.Struct({ count: Schema.Number })
const CounterMessage = defineMessageUnion({ ClickedReset: {} })
const CounterOutMessage = defineMessageUnion({ Reset: {} })
const ResetCounter = makeDefinition('ResetCounter', {
  Model: CounterModel,
  Message: CounterMessage,
  OutMessage: CounterOutMessage,
})
const resetStep = ResetCounter.makeStep(model => ({
  model: modifyFields(model, { count: () => 0 }),
  outMessage: CounterOutMessage.Reset(),
}))
const ResetCounterComposition = ResetCounter.makeComposition()
const prepareBlock = () =>
  ResetCounterComposition.prepareBlock({
    init: (count: number) => ({ model: CounterModel.make({ count }) }),
    update: ResetCounterComposition.makeUpdate({
      ClickedReset: (model, _message) => resetStep(model),
    }),
    operations: { reset: () => Tuple.make(CounterMessage.ClickedReset()) },
    EffectsLayer: Layer.empty,
  })
const block: Block.FromAssemblyWithOutMessage<
  typeof CounterModel,
  typeof prepareBlock
> = Block.assemble(prepareBlock)
const Model = Schema.Struct({
  counter: CounterModel,
  entries: Schema.Array(
    Schema.Struct({ id: Schema.Number, counter: CounterModel }),
  ),
  previousCount: Schema.Number,
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedResetCounter: {},
  RequestedResetEntry: { id: Schema.Number },
})
type Message = typeof Message.Type
const Parent = makeDefinition('BindingContextParent', {
  Model,
  Message,
})

const foldCounterOutMessage = (
  outMessage: typeof CounterOutMessage.Type,
  {
    modelBeforeUpdate,
  }: Update.FoldContext<typeof CounterMessage.Type, Message, Model>,
) =>
  CounterOutMessage.match<Update.Step<Model, Message>>(outMessage, {
    Reset: () => model => ({
      model: modifyFields(model, {
        previousCount: () => modelBeforeUpdate.counter.count,
      }),
    }),
  })
const BoundCounterBinding = Parent.makeBinding(block, {
  read: model => Option.some(model.counter),
  write: (model: Model, nextCounter: typeof CounterModel.Type) =>
    modifyFields(model, { counter: () => nextCounter }),
}).withOutMessagePolicy({ fold: foldCounterOutMessage })
const keyedPolicy = {
  fold: (
    id: number,
    outMessage: typeof CounterOutMessage.Type,
    {
      modelBeforeUpdate,
    }: Update.FoldContext<typeof CounterMessage.Type, Message, Model>,
  ) =>
    CounterOutMessage.match<Update.Step<Model, Message>>(outMessage, {
      Reset: () => model => ({
        model: modifyFields(model, {
          previousCount: () =>
            Option.match(
              Array.findFirst(
                modelBeforeUpdate.entries,
                entry => entry.id === id,
              ),
              {
                onNone: () => model.previousCount,
                onSome: entry => entry.counter.count,
              },
            ),
        }),
      }),
    }),
}
const entriesPlacement: 'entries' = 'entries'
const keyedBaseConfig = {
  placement: entriesPlacement,
  readAll: (model: Model) => model.entries,
  key: (entry: Model['entries'][number]) => entry.id,
  read: (entry: Model['entries'][number]) => entry.counter,
  writeAt: (
    model: Model,
    id: number,
    nextCounter: typeof CounterModel.Type,
  ): Model =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === id ? { ...entry, counter: nextCounter } : entry,
      ),
    }),
  keySchema: Schema.Number,
}
const EntriesBinding = Parent.makeBinding(block, {
  ...keyedBaseConfig,
}).withOutMessagePolicy(keyedPolicy)
const initialModel = Model.make({
  counter: { count: 3 },
  entries: [{ id: 1, counter: { count: 5 } }],
  previousCount: 0,
})
const toCounterParentModel = (counter: typeof CounterModel.Type): Model =>
  Model.make({ ...initialModel, counter })
const toEntryParentModel = (
  id: number,
  counter: typeof CounterModel.Type,
): Model => Model.make({ ...initialModel, entries: [{ id, counter }] })

const SequencedCounterModel = Schema.Struct({ count: Schema.Number })
const SequencedCounterMessage = defineMessageUnion({
  RequestedAdd: { amount: Schema.Number },
  RequestedRecord: {},
  RequestedMultiply: { factor: Schema.Number },
  CompletedRecordCount: {},
})
const SequencedCounter = makeDefinition('SequencedCounter', {
  Model: SequencedCounterModel,
  Message: SequencedCounterMessage,
})
const RecordCount = SequencedCounter.makeCommand('RecordCount', {
  args: { count: Schema.Number },
  messages: [SequencedCounterMessage.CompletedRecordCount],
})
const addStep = SequencedCounter.makeStep((model, amount: number) => ({
  model: modifyFields(model, { count: count => count + amount }),
}))
const recordStep = SequencedCounter.makeStep(model => ({
  model,
  commands: [RecordCount({ count: model.count })],
}))
const multiplyStep = SequencedCounter.makeStep((model, factor: number) => ({
  model: modifyFields(model, { count: count => count * factor }),
}))
const SequencedCounterComposition = SequencedCounter.makeComposition()
const prepareSequencedCounterBlock = () =>
  SequencedCounterComposition.prepareBlock({
    init: (count: number) => ({ model: { count } }),
    update: SequencedCounterComposition.makeUpdate({
      RequestedAdd: (model, { amount }) => addStep(model, amount),
      RequestedRecord: model => recordStep(model),
      RequestedMultiply: (model, { factor }) => multiplyStep(model, factor),
      CompletedRecordCount: model => ({ model }),
    }),
    operations: {
      add: (amount: number) =>
        Tuple.make(SequencedCounterMessage.RequestedAdd({ amount })),
      record: () => Tuple.make(SequencedCounterMessage.RequestedRecord()),
      multiply: (factor: number) =>
        Tuple.make(SequencedCounterMessage.RequestedMultiply({ factor })),
    },
    EffectsLayer: Layer.empty,
    hostHandlers: [RecordCount],
  })
const sequencedCounterBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof SequencedCounterModel,
  typeof prepareSequencedCounterBlock
> = Block.assemble(prepareSequencedCounterBlock)
const SequencedParentModel = Schema.Struct({ child: SequencedCounterModel })
const SequencedParentMessage = defineMessageUnion({
  RequestedSequence: {},
})
const SequencedParent = makeDefinition('SequencedCounterParent', {
  Model: SequencedParentModel,
  Message: SequencedParentMessage,
})
const SequencedCounterBinding = SequencedParent.makeBinding(
  sequencedCounterBlock,
  {
    read: model => Option.some(model.child),
    write: (model, nextChild) =>
      modifyFields(model, { child: () => nextChild }),
  },
)

type CommandMessageOf<Output> =
  Output extends Update.ResultRecipe<any, infer Message, any, any, any>
    ? Message
    : Output extends Readonly<{
          commands?: infer Commands
        }>
      ? NonNullable<Commands> extends Update.Commands<
          infer CommandMessage,
          infer _Requirements
        >
        ? CommandMessage
        : never
      : never

if (false) {
  const boundCounterInit = BoundCounterBinding.init({
    args: [1],
    toParentModel: toCounterParentModel,
  })
  // @ts-expect-error Passive child initialization does not expose a Model.
  boundCounterInit.model
  expectTypeOf<
    typeof boundCounterInit extends BindingInitRecipe<
      Model,
      OutgoingMessageOfBinding<typeof BoundCounterBinding>,
      never,
      infer Evidence
    >
      ? Evidence
      : never
  >().toEqualTypeOf<RequirementOfBinding<typeof BoundCounterBinding>>()
  expectTypeOf<
    Update.RequirementsOf<() => typeof boundCounterInit>
  >().toEqualTypeOf<never>()
  const forwardBoundInit = (count: number): Update.Return<Model, Message> => {
    const counterInit = BoundCounterBinding.init({
      args: [count],
      toParentModel: toCounterParentModel,
    })
    // @ts-expect-error An explicit Return cannot erase passive initialization.
    return counterInit
  }
  void forwardBoundInit
  expectTypeOf<
    CommandMessageOf<ReturnType<typeof BoundCounterBinding.fold>>
  >().toEqualTypeOf<OutgoingMessageOfBinding<typeof BoundCounterBinding>>()
  expectTypeOf<
    Update.GraphModelOf<typeof EntriesBinding.fold>
  >().toEqualTypeOf<Model>()
  expectTypeOf<
    Parameters<typeof EntriesBinding.fold>[1]
  >().toEqualTypeOf<number>()
  expectTypeOf<Parameters<typeof EntriesBinding.fold>[2]>().toEqualTypeOf<
    typeof CounterMessage.Type
  >()
  expectTypeOf(EntriesBinding.reset).parameters.toEqualTypeOf<[key: number]>()

  EntriesBinding.init({
    key: 1,
    args: [2],
    toParentModel: counter => toEntryParentModel(1, counter),
  })
  // @ts-expect-error A raw Model cannot execute an unregistered connected fold.
  EntriesBinding.fold(initialModel, 1, CounterMessage.ClickedReset())
  EntriesBinding.reset(1)

  // @ts-expect-error A keyed init requires its stable occurrence key.
  EntriesBinding.init({
    args: [2],
    toParentModel: counter => toEntryParentModel(1, counter),
  })
  EntriesBinding.init({
    key: 1,
    // @ts-expect-error A keyed init requires the complete child init argument tuple.
    args: [],
    toParentModel: counter => toEntryParentModel(1, counter),
  })
  // @ts-expect-error A keyed fold requires the key before the child Message.
  EntriesBinding.fold(initialModel, CounterMessage.ClickedReset())
  // @ts-expect-error A keyed exposed operation requires its key.
  EntriesBinding.reset()

  const MissingPolicyBinding = Parent.makeBinding(block, keyedBaseConfig)
  // @ts-expect-error A keyed child with OutMessages requires an explicit policy before Composition.
  Parent.makeComposition({ bindings: [MissingPolicyBinding] })

  Parent.makeBinding(block, {
    ...keyedBaseConfig,
  }).withOutMessagePolicy({
    // @ts-expect-error A keyed fold must accept the Binding's number key and parent Message context.
    fold:
      (
        _id: string,
        _outMessage: typeof CounterOutMessage.Type,
        _context: Update.FoldContext<
          typeof CounterMessage.Type,
          typeof CounterMessage.Type,
          Model
        >,
      ) =>
      (model: Model) => ({ model }),
  })

  Parent.makeBinding(block, {
    ...keyedBaseConfig,
  }).withOutMessagePolicy({
    // @ts-expect-error A forward policy must return the parent's OutMessage.
    forward: () => undefined,
  })

  Parent.makeBinding(block, {
    ...keyedBaseConfig,
  }).withOutMessagePolicy({
    // @ts-expect-error A forward policy cannot erase its output to unknown.
    forward: (): unknown => undefined,
  })

  Parent.makeBinding(block, {
    ...keyedBaseConfig,
    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    // @ts-expect-error OutMessage remains invalid inside makeBinding configuration, including when erased to any.
    outMessage: { forward: (): any => undefined },
  })
}

const StaticComposition = Parent.makeComposition({
  bindings: [BoundCounterBinding, EntriesBinding],
})
const prepareStaticParent = () =>
  StaticComposition.prepareBlock({
    init: () => ({ model: initialModel }),
    update: StaticComposition.makeUpdate({
      RequestedResetCounter: model => BoundCounterBinding.reset()(model),
      RequestedResetEntry: model => Parent.makeNoopStep()(model),
    }),
    operations: { reset: () => Tuple.make(Message.RequestedResetCounter()) },
  })
const staticParent: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareStaticParent
> = Block.assemble(prepareStaticParent)
const KeyedComposition = Parent.makeComposition({
  bindings: [BoundCounterBinding, EntriesBinding],
})
const prepareKeyedParent = () =>
  KeyedComposition.prepareBlock({
    init: () => ({ model: initialModel }),
    update: KeyedComposition.makeUpdate({
      RequestedResetCounter: model => Parent.makeNoopStep()(model),
      RequestedResetEntry: (model, { id }) => EntriesBinding.reset(id)(model),
    }),
    operations: {
      reset: (id: number) => Tuple.make(Message.RequestedResetEntry({ id })),
    },
  })
const keyedParent: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareKeyedParent
> = Block.assemble(prepareKeyedParent)

describe('bound OutMessage context', () => {
  it('preserves the previous parent Model for static folds and exposed operations', () => {
    const results = [
      staticParent.update(initialModel, {
        _tag: 'GotResetCounterMessage',
        placement: 'ResetCounter',
        generation: 0,
        message: CounterMessage.ClickedReset(),
      }),
      staticParent.operations.reset(initialModel),
    ]
    for (const result of results) {
      expect(result.model.counter.count).toBe(0)
      expect(result.model.previousCount).toBe(3)
    }
  })

  it('preserves the previous parent Model for keyed folds and exposed operations', () => {
    const results = [
      keyedParent.update(initialModel, {
        _tag: 'GotEntriesMessage',
        placement: 'entries',
        generation: 0,
        key: 1,
        message: CounterMessage.ClickedReset(),
      }),
      keyedParent.operations.reset(initialModel, 1),
    ]
    for (const result of results) {
      expect(result.model.entries).toEqual([{ id: 1, counter: { count: 0 } }])
      expect(result.model.previousCount).toBe(5)
    }
    expect(EntriesBinding).not.toHaveProperty('step')
    expectTypeOf(EntriesBinding.reset).parameters.toEqualTypeOf<[key: number]>()
    expectTypeOf<
      'step' extends keyof typeof EntriesBinding ? true : false
    >().toEqualTypeOf<false>()
  })
})

describe('bound Step sequencing', () => {
  it('threads each projected Step Model forward and retains Commands in order', () => {
    const SequencedComposition = SequencedParent.makeComposition({
      bindings: [SequencedCounterBinding],
    })
    const update = SequencedComposition.makeUpdate({
      RequestedSequence: model =>
        Update.combineSteps(model, [
          SequencedCounterBinding.add(2),
          SequencedCounterBinding.record(),
          SequencedCounterBinding.multiply(3),
          SequencedCounterBinding.record(),
        ]),
    })
    const result = update(
      SequencedParentModel.make({ child: { count: 3 } }),
      SequencedParentMessage.RequestedSequence(),
    )

    expect(result.model.child.count).toBe(15)
    expect(result.commands?.map(command => command.name)).toEqual([
      'SequencedCounter/RecordCount',
      'SequencedCounter/RecordCount',
    ])
    expect(result.commands?.map(command => command.args)).toEqual([
      { count: 5 },
      { count: 15 },
    ])
  })
})
