import { Array, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ value: Schema.String })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  RequestedReset: {},
  UpdatedValue: { value: Schema.String },
  CompletedRecordValue: { value: Schema.String },
})
type ChildMessage = typeof ChildMessage.Type
const ChildOutMessage = defineMessageUnion({
  ChangedValue: { value: Schema.String },
})
type ChildOutMessage = typeof ChildOutMessage.Type

const Child = makeDefinition('ExposedMessageRuntimeChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const RecordValue = Child.makeCommand('RecordValue', {
  args: { value: Schema.String },
  messages: [ChildMessage.CompletedRecordValue],
  handler: function* () {
    return ({ value }) =>
      Effect.succeed(ChildMessage.CompletedRecordValue({ value }))
  },
})
const ChildComposition = Child.makeComposition()
const childUpdate = ChildComposition.makeUpdate({
  RequestedReset: (
    model,
  ): Update.ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    Command.HandlerOf<typeof RecordValue>
  > => ({
    model: modifyFields(model, { value: () => '' }),
  }),
  UpdatedValue: (
    model,
    { value },
  ): Update.ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    Command.HandlerOf<typeof RecordValue>
  > => ({
    model: modifyFields(model, { value: () => value }),
    commands: [RecordValue({ value })],
    outMessage: ChildOutMessage.ChangedValue({ value }),
  }),
  CompletedRecordValue: (
    model,
  ): Update.ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    Command.HandlerOf<typeof RecordValue>
  > => ({ model }),
})
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ value: 'initial' }) }),
    update: childUpdate,
    operations: {
      reset: () => Tuple.make(ChildMessage.RequestedReset()),
      setValue: (value: string) =>
        Tuple.make(ChildMessage.UpdatedValue({ value })),
    },
    EffectsLayer: RecordValue.layer,
  })
const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ContextModel = Schema.Struct({ value: Schema.String })
type ContextModel = typeof ContextModel.Type
const ContextMessage = defineMessageUnion({
  UpdatedValue: { value: Schema.String },
})
type ContextMessage = typeof ContextMessage.Type
type DispatchContext = Readonly<{ source: string }>

const ContextComposition = makeDefinition('ExposedMessageRuntimeContextChild', {
  Model: ContextModel,
  Message: ContextMessage,
}).makeComposition()
const contextUpdate = ContextComposition.makeUpdate.withContext(
  (
    required: DispatchContext,
    maybeCount?: number,
    label = 'default',
    ...flags: ReadonlyArray<boolean>
  ) => ({
    UpdatedValue: (model, { value }) => ({
      model: modifyFields(model, {
        value: () =>
          `${required.source}:${value}:${maybeCount ?? 0}:${label}:${flags.length}`,
      }),
    }),
  }),
)
const prepareContextBlock = () =>
  ContextComposition.prepareBlock({
    init: () => ({ model: ContextModel.make({ value: '' }) }),
    update: contextUpdate,
    operations: {
      setAll: (
        value: string,
        required: DispatchContext,
        maybeCount: number | undefined,
        label: string | undefined,
        ...flags: ReadonlyArray<boolean>
      ) =>
        Tuple.make(
          ContextMessage.UpdatedValue({ value }),
          required,
          maybeCount,
          label,
          ...flags,
        ),
    },
  })
const ContextBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ContextModel,
  typeof prepareContextBlock
> = Block.assemble(prepareContextBlock)

const Entry = Schema.Struct({ id: Schema.String, child: ChildModel })
type Entry = typeof Entry.Type
const ParentModel = Schema.Struct({
  maybeChild: Schema.Option(ChildModel),
  entries: Schema.Array(Entry),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  RequestedNothing: {},
  RequestedSetChild: { value: Schema.String },
  RequestedSetEntry: { id: Schema.String, value: Schema.String },
})
type ParentMessage = typeof ParentMessage.Type
const Parent = makeDefinition('ExposedMessageRuntimeParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const foldChildOutMessage = ChildOutMessage.match<
  Update.Step<ParentModel, ParentMessage>
>({
  ChangedValue: () => model => ({ model }),
})
const ChildBinding = Parent.makeBinding(ChildBlock, {
  field: 'maybeChild',
}).withOutMessagePolicy({ fold: foldChildOutMessage })
const EntryBinding = Parent.makeBinding(ChildBlock, {
  placement: 'entries',
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: (model, id, nextChild) =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === id ? Entry.make({ id, child: nextChild }) : entry,
      ),
    }),
  keySchema: Schema.String,
}).withOutMessagePolicy({
  fold: (_id, outMessage) => foldChildOutMessage(outMessage),
})
const ParentComposition = Parent.makeComposition({
  bindings: [ChildBinding, EntryBinding],
})
const parentUpdate = ParentComposition.makeUpdate({
  RequestedNothing: model => Parent.makeNoopStep()(model),
  RequestedSetChild: (model, { value }) => ChildBinding.setValue(value)(model),
  RequestedSetEntry: (model, { id, value }) =>
    EntryBinding.setValue(id, value)(model),
})
const parentModel = ParentModel.make({
  maybeChild: Option.some(ChildModel.make({ value: 'direct' })),
  entries: [
    Entry.make({ id: 'first', child: ChildModel.make({ value: 'entry' }) }),
  ],
})
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: () => ({ model: parentModel }),
    update: parentUpdate,
    operations: {
      setChild: (value: string) =>
        Tuple.make(ParentMessage.RequestedSetChild({ value })),
      setEntry: (id: string, value: string) =>
        Tuple.make(ParentMessage.RequestedSetEntry({ id, value })),
    },
    EffectsLayer: Layer.empty,
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

describe('exposed Message operations', () => {
  it('dispatches through update with the exact required, optional, default, and rest Context', () => {
    const result = ContextBlock.operations.setAll(
      ContextModel.make({ value: '' }),
      'next',
      { source: 'test' },
      2,
      undefined,
      true,
      false,
    )

    expect(result.model.value).toBe('test:next:2:default:2')
    expectTypeOf(ContextBlock.operations.setAll).parameters.toEqualTypeOf<
      [
        model: ContextModel,
        value: string,
        required: DispatchContext,
        maybeCount: number | undefined,
        label: string | undefined,
        ...flags: ReadonlyArray<boolean>,
      ]
    >()
  })

  it('routes optional and keyed operations through their registered child dispatchers', () => {
    const direct = ParentBlock.operations.setChild(parentModel, 'direct-after')
    const keyed = ParentBlock.operations.setEntry(
      parentModel,
      'first',
      'entry-after',
    )
    const missingKey = ParentBlock.operations.setEntry(
      parentModel,
      'missing',
      'ignored',
    )
    const missingChild = ParentBlock.operations.setChild(
      modifyFields(parentModel, { maybeChild: () => Option.none() }),
      'ignored',
    )

    expect(Option.getOrThrow(direct.model.maybeChild).value).toBe(
      'direct-after',
    )
    expect(Option.getOrThrow(Array.head(keyed.model.entries)).child.value).toBe(
      'entry-after',
    )
    expect(missingKey.model).toBe(parentModel)
    expect(Option.isNone(missingChild.model.maybeChild)).toBe(true)
  })

  it('lifts completed child Command Messages once through the owning Binding', async () => {
    const direct = ParentBlock.operations.setChild(parentModel, 'record-direct')
    const keyed = ParentBlock.operations.setEntry(
      parentModel,
      'first',
      'record-entry',
    )
    const directCommand = Option.getOrThrow(Array.head(direct.commands ?? []))
    const keyedCommand = Option.getOrThrow(Array.head(keyed.commands ?? []))

    const directMessage = await Effect.runPromise(
      directCommand.effect.pipe(Effect.provide(ParentBlock.EffectsLayer)),
    )
    const keyedMessage = await Effect.runPromise(
      keyedCommand.effect.pipe(Effect.provide(ParentBlock.EffectsLayer)),
    )

    expect(directMessage).toEqual({
      _tag: 'GotMaybeChildMessage',
      placement: 'maybeChild',
      generation: 0,
      message: ChildMessage.CompletedRecordValue({ value: 'record-direct' }),
    })
    expect(keyedMessage).toEqual({
      _tag: 'GotEntriesMessage',
      placement: 'entries',
      generation: 0,
      key: 'first',
      message: ChildMessage.CompletedRecordValue({ value: 'record-entry' }),
    })
  })

  it('completes one producer-update pair once and keeps producer execution lazy', () => {
    let producerCalls = 0
    let firstUpdateCalls = 0
    let secondUpdateCalls = 0
    const sharedExpose = {
      apply: () => {
        producerCalls += 1
        return Tuple.make(ParentMessage.RequestedNothing())
      },
    }
    const firstUpdate = ParentComposition.makeUpdate({
      RequestedNothing: (model, _message) => {
        firstUpdateCalls += 1
        return { model }
      },
      RequestedSetChild: (model, _message) => {
        firstUpdateCalls += 1
        return { model }
      },
      RequestedSetEntry: (model, _message) => {
        firstUpdateCalls += 1
        return { model }
      },
    })
    const secondUpdate = ParentComposition.makeUpdate({
      RequestedNothing: (model, _message) => {
        secondUpdateCalls += 1
        return { model }
      },
      RequestedSetChild: (model, _message) => {
        secondUpdateCalls += 1
        return { model }
      },
      RequestedSetEntry: (model, _message) => {
        secondUpdateCalls += 1
        return { model }
      },
    })
    const makeBlock = (update: typeof firstUpdate) => {
      const prepare = () =>
        ParentComposition.prepareBlock({
          init: () => ({ model: parentModel }),
          update,
          operations: sharedExpose,
          EffectsLayer: Layer.empty,
        })
      const completedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
        typeof ParentModel,
        typeof prepare
      > = Block.assemble(prepare)
      return completedBlock
    }
    const FirstBlock = makeBlock(firstUpdate)
    const SamePairBlock = makeBlock(firstUpdate)
    const SecondBlock = makeBlock(secondUpdate)

    expect(producerCalls).toBe(0)
    expect(SamePairBlock.operations.apply).toBe(FirstBlock.operations.apply)
    expect(SecondBlock.operations.apply).not.toBe(FirstBlock.operations.apply)
    expect(FirstBlock.replaceEffectsLayer(Layer.empty).operations.apply).toBe(
      FirstBlock.operations.apply,
    )

    FirstBlock.operations.apply(parentModel)
    SecondBlock.operations.apply(parentModel)

    expect(producerCalls).toBe(2)
    expect(firstUpdateCalls).toBe(1)
    expect(secondUpdateCalls).toBe(1)
  })

  it('rejects malformed tuples and foreign Messages at the erased runtime boundary', () => {
    const prepareInvalidTupleBlock = () =>
      Reflect.apply(ParentComposition.prepareBlock, undefined, [
        {
          init: () => ({ model: parentModel }),
          update: parentUpdate,
          operations: { invalidTuple: () => ({ model: parentModel }) },
          EffectsLayer: Layer.empty,
        },
      ])
    const prepareInvalidMessageBlock = () =>
      Reflect.apply(ParentComposition.prepareBlock, undefined, [
        {
          init: () => ({ model: parentModel }),
          update: parentUpdate,
          operations: {
            invalidMessage: () => Tuple.make({ _tag: 'ForeignMessage' }),
          },
          EffectsLayer: Layer.empty,
        },
      ])

    const invalidTupleBlock = Reflect.apply(Block.assemble, undefined, [
      prepareInvalidTupleBlock,
    ])

    const invalidMessageBlock = Reflect.apply(Block.assemble, undefined, [
      prepareInvalidMessageBlock,
    ])

    expect(() =>
      invalidTupleBlock.operations.invalidTuple(parentModel),
    ).toThrow(/must return a nonempty \[Message, \.\.\.context\] tuple/)
    expect(() =>
      invalidMessageBlock.operations.invalidMessage(parentModel),
    ).toThrow(/returned a Message outside this Block's Message Schema/)
  })
})

if (false) {
  const ForeignMessage = defineMessageUnion({ ReceivedForeignMessage: {} })
  type ForeignMessage = typeof ForeignMessage.Type
  const foreignMessageConfig = {
    init: () => ({ model: ContextModel.make({ value: '' }) }),
    update: contextUpdate,
    operations: {
      sendForeignMessage: () =>
        Tuple.make(ForeignMessage.ReceivedForeignMessage()),
    },
    EffectsLayer: Layer.empty,
  }
  // @ts-expect-error Exposed tuples must begin with this Block's authored Message.
  ContextComposition.prepareBlock(foreignMessageConfig)

  const erasedExpose: any = {
    setValue: () => Tuple.make(ContextMessage.UpdatedValue({ value: '' })),
  }
  ContextComposition.prepareBlock({
    init: () => ({ model: ContextModel.make({ value: '' }) }),
    update: contextUpdate,
    // @ts-expect-error A whole operations record typed as any cannot bypass producer validation.
    operations: erasedExpose,
    EffectsLayer: Layer.empty,
  })
}
