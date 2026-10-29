import { Array, Effect, Layer, Option, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import { makeDefinition } from './define.js'
import type { OperationPayload } from './operation.js'
import * as BlockApi from './public.js'

const constructorProbe = { defaultRuns: 0 }

const Model = Schema.Struct({ value: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  ResetValue: {},
  UpdatedValue: {
    value: Schema.String,
    source: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.sync(() => {
          constructorProbe.defaultRuns += 1
          return 'default'
        }),
      ),
    ),
  },
  CompletedRecordValue: { value: Schema.String },
})
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({
  ChangedValue: { value: Schema.String },
})
type OutMessage = typeof OutMessage.Type

const Definition = makeDefinition('OperationConstructorRuntimeChild', {
  Model,
  Message,
  OutMessage,
})
const RecordValue = Definition.makeCommand('RecordValue', {
  args: { value: Schema.String },
  messages: [Message.CompletedRecordValue],
  handler: function* () {
    return ({ value }) =>
      Effect.succeed(Message.CompletedRecordValue({ value }))
  },
})
const Composition = Definition.makeComposition()
const update = Composition.makeUpdate.withContext(
  (
    required: Readonly<{
      prefix: string
    }>,
    maybeSuffix?: string,
    separator: string = ':',
    ...indexes: ReadonlyArray<number>
  ) => ({
    ResetValue: (
      model,
    ): Update.ReturnWithOutMessage<
      Model,
      Message,
      OutMessage,
      Command.HandlerOf<typeof RecordValue>
    > => ({ model: modifyFields(model, { value: () => '' }) }),
    UpdatedValue: (
      model,
      { source, value },
    ): Update.ReturnWithOutMessage<
      Model,
      Message,
      OutMessage,
      Command.HandlerOf<typeof RecordValue>
    > => {
      const nextValue = `${required.prefix}${separator}${source}${separator}${value}${maybeSuffix ?? ''}${indexes.join('')}`
      return {
        model: modifyFields(model, { value: () => nextValue }),
        commands: [RecordValue({ value: nextValue })],
        outMessage: OutMessage.ChangedValue({ value: nextValue }),
      }
    },
    CompletedRecordValue: (
      model,
    ): Update.ReturnWithOutMessage<
      Model,
      Message,
      OutMessage,
      Command.HandlerOf<typeof RecordValue>
    > => ({ model }),
  }),
)
const resetValue = Message.ResetValue
const updateValue = Message.UpdatedValue
const operations = { resetValue, updateValue }

const makeBlock = (selectedUpdate: typeof update) => {
  const prepare = () =>
    Composition.prepareBlock({
      init: () => ({ model: Model.make({ value: '' }) }),
      update: selectedUpdate,
      operations,
      EffectsLayer: RecordValue.layer,
    })
  const completedBlock: BlockApi.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepare
  > = BlockApi.assemble(prepare)
  return completedBlock
}

const Block = makeBlock(update)

const Entry = Schema.Struct({ id: Schema.String, child: Model })
type Entry = typeof Entry.Type
const ParentModel = Schema.Struct({
  maybeChild: Schema.Option(Model),
  entries: Schema.Array(Entry),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  RequestedUpdateChild: { value: Schema.String },
  RequestedUpdateEntry: { id: Schema.String, value: Schema.String },
})
type ParentMessage = typeof ParentMessage.Type
const Parent = makeDefinition('OperationConstructorRuntimeParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ChildBinding = Parent.makeBinding(Block, {
  placement: 'child',
  read: model => model.maybeChild,
  write: (model, nextChild) =>
    modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
  delivery: {
    toUpdateContext: () => [{ prefix: 'routed' }],
  },
}).withOutMessagePolicy({
  fold: OutMessage.match<Update.Step<ParentModel, ParentMessage>>({
    ChangedValue: () => model => ({ model }),
  }),
})
const EntryBinding = Parent.makeBinding(Block, {
  placement: 'entries',
  readAll: model => model.entries,
  key: entry => entry.id,
  keySchema: Schema.String,
  read: entry => entry.child,
  writeAt: (model, id, nextChild) =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === id ? Entry.make({ id, child: nextChild }) : entry,
      ),
    }),
  delivery: {
    toUpdateContext: () => [{ prefix: 'routed' }],
  },
}).withOutMessagePolicy({
  fold: (_id, outMessage) =>
    OutMessage.match<Update.Step<ParentModel, ParentMessage>>(outMessage, {
      ChangedValue: () => model => ({ model }),
    }),
})
const ParentComposition = Parent.makeComposition({
  bindings: [ChildBinding, EntryBinding],
})
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: () => ({
      model: ParentModel.make({ maybeChild: Option.none(), entries: [] }),
    }),
    update: ParentComposition.makeUpdate({
      RequestedUpdateChild: (model, { value }) =>
        ChildBinding.updateValue({ value }, { prefix: 'binding' })(model),
      RequestedUpdateEntry: (model, { id, value }) =>
        EntryBinding.updateValue(id, { value }, { prefix: 'binding' })(model),
    }),
    operations: {
      updateChild: ParentMessage.RequestedUpdateChild,
      updateEntry: ParentMessage.RequestedUpdateEntry,
    },
    EffectsLayer: Layer.empty,
  })
const ParentBlock: BlockApi.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = BlockApi.assemble(prepareParentBlock)

const initialModel = Model.make({ value: '' })
const initialParent = ParentModel.make({
  maybeChild: Option.some(initialModel),
  entries: [Entry.make({ id: 'first', child: initialModel })],
})

describe('Message constructor operations', () => {
  it('completes one operations-update pair once without running constructor defaults', () => {
    const SamePair = makeBlock(update)
    const secondUpdate = Composition.makeUpdate.withContext(
      (
        required: Readonly<{
          prefix: string
        }>,
        maybeSuffix?: string,
        separator: string = ':',
        ...indexes: ReadonlyArray<number>
      ) => ({
        UpdatedValue: (model, message) =>
          update(model, message, required, maybeSuffix, separator, ...indexes),
        CompletedRecordValue: (model, message) =>
          update(model, message, required, maybeSuffix, separator, ...indexes),
        ResetValue: (model, message) =>
          update(model, message, required, maybeSuffix, separator, ...indexes),
      }),
    )
    const DifferentUpdate = makeBlock(secondUpdate)

    expect(constructorProbe.defaultRuns).toBe(0)
    expect(SamePair.operations.updateValue).toBe(Block.operations.updateValue)
    expect(DifferentUpdate.operations.updateValue).not.toBe(
      Block.operations.updateValue,
    )
    expect(
      Block.replaceEffectsLayer(RecordValue.layer).operations.updateValue,
    ).toBe(Block.operations.updateValue)
  })

  it('uses constructor input, produces the decoded Message, and appends update Context exactly', () => {
    const result = Block.operations.updateValue(
      initialModel,
      { value: 'next' },
      { prefix: 'test' },
      undefined,
      undefined,
      1,
      2,
    )

    expect(result.model.value).toBe('test:default:next12')
    expect(result.outMessage).toEqual(
      OutMessage.ChangedValue({ value: 'test:default:next12' }),
    )
    expect(constructorProbe.defaultRuns).toBe(1)
    expectTypeOf(Block.operations.updateValue).parameters.toEqualTypeOf<
      [
        model: Model,
        payload: OperationPayload<typeof Message.UpdatedValue>,
        required: Readonly<{ prefix: string }>,
        maybeSuffix?: string | undefined,
        separator?: string | undefined,
        ...indexes: ReadonlyArray<number>,
      ]
    >()
    expectTypeOf<
      Update.RequirementsOf<typeof Block.operations.updateValue>
    >().toEqualTypeOf<Command.HandlerOf<typeof RecordValue>>()
  })

  it('gives an empty constructor no payload argument', () => {
    const result = Block.operations.resetValue(initialModel, { prefix: 'test' })

    expect(result.model.value).toBe('')
    expectTypeOf(Block.operations.resetValue).parameters.toEqualTypeOf<
      [
        model: Model,
        required: Readonly<{ prefix: string }>,
        maybeSuffix?: string | undefined,
        separator?: string | undefined,
        ...indexes: ReadonlyArray<number>,
      ]
    >()
  })

  it('recognizes a symbol field as payload and keeps update Context after it', () => {
    const valueField = Symbol('value')
    const SymbolModel = Schema.Struct({ value: Schema.String })
    type SymbolModel = typeof SymbolModel.Type
    const SymbolMessage = defineMessageUnion({
      UpdatedValue: { [valueField]: Schema.String },
    })
    type SymbolMessage = typeof SymbolMessage.Type

    const SymbolComposition = makeDefinition(
      'OperationConstructorRuntimeSymbolField',
      {
        Model: SymbolModel,
        Message: SymbolMessage,
      },
    ).makeComposition()
    const prepareSymbolBlock = () =>
      SymbolComposition.prepareBlock({
        init: () => ({ model: SymbolModel.make({ value: '' }) }),
        update: SymbolComposition.makeUpdate.withContext((suffix: string) => ({
          UpdatedValue: (model, message) => ({
            model: modifyFields(model, {
              value: () => `${message[valueField]}${suffix}`,
            }),
          }),
        })),
        operations: { updateValue: SymbolMessage.UpdatedValue },
        EffectsLayer: Layer.empty,
      })
    const SymbolBlock: BlockApi.FromAssemblyWithoutViewOrOutMessage<
      typeof SymbolModel,
      typeof prepareSymbolBlock
    > = BlockApi.assemble(prepareSymbolBlock)

    const result = SymbolBlock.operations.updateValue(
      SymbolModel.make({ value: '' }),
      { [valueField]: 'payload' },
      ':context',
    )

    expect(result.model.value).toBe('payload:context')
  })

  it('prepends a key for keyed Bindings and preserves absent child behavior', () => {
    const direct = ParentBlock.operations.updateChild(initialParent, {
      value: 'direct',
    })
    const keyed = ParentBlock.operations.updateEntry(initialParent, {
      id: 'first',
      value: 'entry',
    })
    const missingKey = ParentBlock.operations.updateEntry(initialParent, {
      id: 'missing',
      value: 'ignored',
    })
    const missingChild = ParentBlock.operations.updateChild(
      modifyFields(initialParent, { maybeChild: () => Option.none() }),
      { value: 'ignored' },
    )

    expect(Option.getOrThrow(direct.model.maybeChild).value).toBe(
      'binding:default:direct',
    )
    expect(Option.getOrThrow(Array.head(keyed.model.entries)).child.value).toBe(
      'binding:default:entry',
    )
    expect(missingKey.model).toBe(initialParent)
    expect(Option.isNone(missingChild.model.maybeChild)).toBe(true)
    expectTypeOf(EntryBinding.updateValue).parameters.toEqualTypeOf<
      [
        key: string,
        payload: OperationPayload<typeof Message.UpdatedValue>,
        required: Readonly<{ prefix: string }>,
        maybeSuffix?: string | undefined,
        separator?: string | undefined,
        ...indexes: ReadonlyArray<number>,
      ]
    >()
    expectTypeOf<
      Update.RegistrationEvidenceOf<
        ReturnType<ReturnType<typeof EntryBinding.updateValue>>
      >
    >().toMatchTypeOf<RequirementOfBinding<typeof EntryBinding>>()
  })

  it('recognizes constructors declared directly or through nested Message unions', () => {
    const SingleComposition = makeDefinition('OperationConstructorSingle', {
      Model,
      Message: Message.ResetValue,
    }).makeComposition()
    const NestedComposition = makeDefinition('OperationConstructorNested', {
      Model,
      Message: Schema.Union([
        Message.ResetValue,
        Schema.Union([Message.UpdatedValue, Message.CompletedRecordValue]),
      ]),
    }).makeComposition()

    expect(() =>
      SingleComposition.prepareBlock({
        init: () => ({ model: initialModel }),
        update: SingleComposition.makeUpdate({
          ResetValue: model => ({ model }),
        }),
        operations: { resetValue: Message.ResetValue },
        EffectsLayer: Layer.empty,
      }),
    ).not.toThrow()
    expect(() =>
      NestedComposition.prepareBlock({
        init: () => ({ model: initialModel }),
        update: NestedComposition.makeUpdate({
          UpdatedValue: model => ({ model }),
          CompletedRecordValue: model => ({ model }),
          ResetValue: model => ({ model }),
        }),
        operations: { updateValue: Message.UpdatedValue },
        EffectsLayer: Layer.empty,
      }),
    ).not.toThrow()
  })

  it('accepts the same local constructor in multiple Definitions', () => {
    const FirstComposition = makeDefinition(
      'OperationConstructorRuntimeFirst',
      {
        Model,
        Message,
      },
    ).makeComposition()
    const SecondComposition = makeDefinition(
      'OperationConstructorRuntimeSecond',
      {
        Model,
        Message,
      },
    ).makeComposition()
    const prepareFirstBlock = () =>
      FirstComposition.prepareBlock({
        init: () => ({ model: initialModel }),
        update: FirstComposition.makeUpdate({
          UpdatedValue: model => ({ model }),
          CompletedRecordValue: model => ({ model }),
          ResetValue: model => ({ model }),
        }),
        operations: { resetValue: Message.ResetValue },
        EffectsLayer: Layer.empty,
      })
    const FirstBlock: BlockApi.FromAssemblyWithoutViewOrOutMessage<
      typeof Model,
      typeof prepareFirstBlock
    > = BlockApi.assemble(prepareFirstBlock)
    const prepareSecondBlock = () =>
      SecondComposition.prepareBlock({
        init: () => ({ model: initialModel }),
        update: SecondComposition.makeUpdate({
          UpdatedValue: model => ({ model }),
          CompletedRecordValue: model => ({ model }),
          ResetValue: model => ({ model }),
        }),
        operations: { resetValue: Message.ResetValue },
        EffectsLayer: Layer.empty,
      })
    const SecondBlock: BlockApi.FromAssemblyWithoutViewOrOutMessage<
      typeof Model,
      typeof prepareSecondBlock
    > = BlockApi.assemble(prepareSecondBlock)

    expect(FirstBlock.operations.resetValue(initialModel).model).toBe(
      initialModel,
    )
    expect(SecondBlock.operations.resetValue(initialModel).model).toBe(
      initialModel,
    )
  })

  it('rejects routed, foreign, reserved, and malformed operation sources', () => {
    const ForeignMessage = defineMessageUnion({ UpdatedForeignValue: {} })
    type ForeignMessage = typeof ForeignMessage.Type
    const dynamicReservedName: string = 'fold'
    const SameShapeMessage = defineMessageUnion({
      UpdatedValue: {
        value: Schema.String,
        source: Schema.String.pipe(
          Schema.withConstructorDefault(Effect.succeed('foreign')),
        ),
      },
    })
    type SameShapeMessage = typeof SameShapeMessage.Type

    expect(() =>
      Reflect.apply(Composition.prepareBlock, undefined, [
        {
          init: () => ({ model: initialModel }),
          update,
          operations: { foreign: ForeignMessage.UpdatedForeignValue },
          EffectsLayer: RecordValue.layer,
        },
      ]),
    ).toThrow(/declared Message Schema/)
    expect(() =>
      Reflect.apply(Composition.prepareBlock, undefined, [
        {
          init: () => ({ model: initialModel }),
          update,
          operations: { sameShape: SameShapeMessage.UpdatedValue },
          EffectsLayer: RecordValue.layer,
        },
      ]),
    ).toThrow(/same-shaped|declared Message Schema/)

    const preparePlainSchemaBlock = () =>
      Reflect.apply(Composition.prepareBlock, undefined, [
        {
          init: () => ({ model: initialModel }),
          update,
          operations: {
            plainSchema: Schema.TaggedStruct('UpdatedValue', {
              value: Schema.String,
            }),
          },
          EffectsLayer: RecordValue.layer,
        },
      ])

    const PlainSchemaBlock = Reflect.apply(BlockApi.assemble, undefined, [
      preparePlainSchemaBlock,
    ])

    expect(() =>
      PlainSchemaBlock.operations.plainSchema(initialModel, {
        value: 'invalid',
      }),
    ).toThrow(/nonempty \[Message, \.\.\.context\] tuple/)
    expect(() =>
      Reflect.apply(Composition.prepareBlock, undefined, [
        {
          init: () => ({ model: initialModel }),
          update,
          operations: { [dynamicReservedName]: updateValue },
          EffectsLayer: RecordValue.layer,
        },
      ]),
    ).toThrow(/operation name "fold"|collides/)
    expect(() =>
      Reflect.apply(Composition.prepareBlock, undefined, [
        {
          init: () => ({ model: initialModel }),
          update,
          operations: { malformed: {} },
          EffectsLayer: RecordValue.layer,
        },
      ]),
    ).toThrow(/operation|constructor|producer/)
    expect(() =>
      Reflect.apply(Composition.prepareBlock, undefined, [
        {
          init: () => ({ model: initialModel }),
          update,
          expose: { updateValue },
          EffectsLayer: RecordValue.layer,
        },
      ]),
    ).toThrow(/removed "expose" field.*"operations"/)

    expect(Reflect.get(Composition, 'makeOperation')).toBeUndefined()

    const prepareInvalidTupleBlock = () =>
      Reflect.apply(Composition.prepareBlock, undefined, [
        {
          init: () => ({ model: initialModel }),
          update,
          operations: { invalidTuple: () => ({}) },
          EffectsLayer: RecordValue.layer,
        },
      ])

    const InvalidTupleBlock = Reflect.apply(BlockApi.assemble, undefined, [
      prepareInvalidTupleBlock,
    ])

    expect(() =>
      InvalidTupleBlock.operations.invalidTuple(initialModel),
    ).toThrow(/nonempty \[Message, \.\.\.context\] tuple/)

    const prepareBypassBlock = () =>
      Reflect.apply(ParentComposition.prepareBlock, undefined, [
        {
          init: ParentBlock.init,
          update: ParentBlock.update,
          operations: {
            bypass: () => [
              {
                _tag: 'GotChildMessage',
                placement: 'child',
                generation: 0,
                message: Message.ResetValue(),
              },
            ],
          },
          EffectsLayer: Layer.empty,
        },
      ])

    const BypassBlock = Reflect.apply(BlockApi.assemble, undefined, [
      prepareBypassBlock,
    ])

    expect(() => BypassBlock.operations.bypass(initialParent)).toThrow(
      /outside this Block's Message Schema/,
    )
  })
})
