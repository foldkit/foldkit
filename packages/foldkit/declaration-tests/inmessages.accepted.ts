import { Context, Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { taggedStruct } from 'foldkit/schema'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
declare const assertExact: <Value extends true>() => Value

export const Model = Schema.Struct({
  count: Schema.Number,
  label: Schema.String,
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  UpdatedLabel: { label: Schema.String },
  CompletedSave: { count: Schema.Number },
})
export type Message = typeof Message.Type
export const InMessage = defineInMessageUnion({
  RequestedClear: {},
  RequestedSetCount: { count: Schema.Number },
  RequestedSave: { count: Schema.Number },
  RequestedReport: { label: Schema.String },
})
export type InMessage = typeof InMessage.Type
export const OutMessage = defineMessageUnion({
  Reported: { label: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
export const HandlerUnavailable = taggedStruct(
  'InMessagesHandlerUnavailable',
  {},
)
export type HandlerUnavailable = typeof HandlerUnavailable.Type
export const ConstructionUnavailable = taggedStruct(
  'InMessagesConstructionUnavailable',
  {},
)
export type ConstructionUnavailable = typeof ConstructionUnavailable.Type

export class Storage extends Context.Service<
  Storage,
  Readonly<{
    isAvailable: boolean
    save: (count: number) => Effect.Effect<void>
  }>
>()('InMessages/Storage') {}

export class ConstructionInput extends Context.Service<
  ConstructionInput,
  Readonly<{ isAvailable: boolean }>
>()('InMessages/ConstructionInput') {}

export const CounterKey = Symbol('InMessagesCounter')
export const CounterDefinition = Block.makeDefinition('InMessagesCounter', {
  key: CounterKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedReport: { outMessage: OutMessage.Reported },
  },
  operations: { informOfLabel: Message.UpdatedLabel },
  effects: { services: [Storage], Error: HandlerUnavailable },
})
export const CounterContract = CounterDefinition.contract
export const CounterComposition = CounterDefinition.makeComposition()
export const {
  makeStep,
  makeFieldsStep,
  makeCommandsStep,
  makeNoopStep,
  makeOutMessageStep,
} = CounterDefinition
export const { makeInMessageUpdate } = CounterComposition
export const Save = CounterDefinition.makeCommand('Save', {
  args: { count: Schema.Number },
  messages: [Message.CompletedSave],
  handler: function* () {
    const storage = yield* Storage

    if (!storage.isAvailable) {
      return yield* Effect.fail(HandlerUnavailable())
    }

    return ({ count }) =>
      Effect.as(storage.save(count), Message.CompletedSave({ count }))
  },
})
export const init = CounterComposition.makeInit(() => ({
  model: Model.make({ count: 0, label: '' }),
}))
export const update = CounterComposition.makeUpdate({
  UpdatedLabel: CounterDefinition.makeFieldsStep.fromMessage(({ label }) => ({
    label: () => label,
  })),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
export const inMessageUpdate = makeInMessageUpdate({
  RequestedClear: makeFieldsStep(() => ({ count: () => 0 })),
  RequestedSetCount: makeFieldsStep.fromMessage(input => {
    assertExact<Equal<typeof input, typeof InMessage.RequestedSetCount.Type>>()

    return { count: () => input.count }
  }),
  RequestedSave: makeCommandsStep((model, input) => {
    assertExact<Equal<typeof model, Model>>()
    assertExact<Equal<typeof input, typeof InMessage.RequestedSave.Type>>()

    return [Save({ count: input.count })]
  }),
  RequestedReport: makeOutMessageStep.fromMessage(({ label }) =>
    OutMessage.Reported({ label }),
  ),
})
export const CounterBlock = CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    inMessageUpdate,
    EffectsLayer: Save.layer,
  }),
)
export const FallibleCounterBlock = CounterDefinition.makeBlock(
  Effect.gen(function* () {
    const input = yield* ConstructionInput

    if (!input.isAvailable) {
      return yield* Effect.fail(ConstructionUnavailable())
    }

    return {
      children: [],
      init,
      update,
      inMessageUpdate,
      EffectsLayer: Save.layer,
    }
  }),
)
export const InlineCounterBlock = CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    inMessageUpdate: CounterComposition.makeInMessageUpdate({
      RequestedClear: CounterDefinition.makeFieldsStep(() => ({
        count: () => 0,
      })),
      RequestedSetCount: CounterDefinition.makeFieldsStep.fromMessage(
        ({ count }) => ({
          count: () => count,
        }),
      ),
      RequestedSave: CounterDefinition.makeCommandsStep.fromMessage(
        ({ count }) => [Save({ count })],
      ),
      RequestedReport: CounterDefinition.makeOutMessageStep.fromMessage(
        ({ label }) => OutMessage.Reported({ label }),
      ),
    }),
    EffectsLayer: Save.layer,
  }),
)

export const ParentModel = Schema.Struct({ counter: CounterContract.Model })
export type ParentModel = typeof ParentModel.Type
export const ParentMessage = defineMessageUnion({ ClickedClear: {} })
export type ParentMessage = typeof ParentMessage.Type
export const ParentInMessage = defineInMessageUnion({
  RequestedClearChild: {},
  RequestedReportChild: { label: Schema.String },
})
export type ParentInMessage = typeof ParentInMessage.Type
export const ParentOutMessage = defineMessageUnion({
  ChildReported: { label: Schema.String },
})
export type ParentOutMessage = typeof ParentOutMessage.Type
export const ParentKey = Symbol('InMessagesParent')
export const ParentDefinition = Block.makeDefinition('InMessagesParent', {
  key: ParentKey,
  Model: ParentModel,
  Message: ParentMessage,
  InMessage: ParentInMessage,
  OutMessage: ParentOutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedReportChild: { outMessage: ParentOutMessage.ChildReported },
  },
  effects: { services: [Storage], Error: HandlerUnavailable },
})
export const ParentContract = ParentDefinition.contract
export const CounterBinding = ParentDefinition.makeRequiredFieldBinding(
  CounterContract,
  {
    field: 'counter',
  },
).withOutMessagePolicy({
  forward: ParentDefinition.makeOutMessageForward(CounterContract, {
    Reported: ({ label }) => ParentOutMessage.ChildReported({ label }),
  }),
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [CounterBinding],
})
export const parentInit = ParentComposition.makeInit(() => ({ model: {} }))
export const parentUpdate = ParentComposition.makeUpdate({
  ClickedClear: CounterBinding.requestClear(),
})
export const parentInMessageUpdate = ParentComposition.makeInMessageUpdate({
  RequestedClearChild: CounterBinding.requestClear(),
  RequestedReportChild: ParentDefinition.makeStep.fromMessage(({ label }) =>
    CounterBinding.requestReport({ label }),
  ),
})
export const ParentBlock = ParentDefinition.makeBlock(
  Effect.gen(function* () {
    const counter = yield* CounterBinding

    return {
      children: [counter],
      init: parentInit,
      update: parentUpdate,
      inMessageUpdate: parentInMessageUpdate,
    }
  }),
).provide(CounterBlock.layer)

export const receiveResults = Effect.gen(function* () {
  const counter = yield* CounterContract.get
  const counterInit = counter.init()
  const clear = counter.inMessageUpdate(
    counterInit.model,
    InMessage.RequestedClear(),
  )
  const set = counter.inMessageUpdate(
    InMessage.RequestedSetCount({ count: 3 }),
  )(clear.model)
  const save = counter.inMessageUpdate(
    set.model,
    InMessage.RequestedSave({ count: 3 }),
  )
  const report = counter.inMessageUpdate(
    InMessage.RequestedReport({ label: 'Count' }),
  )(save.model)

  return { clear, set, save, report }
}).pipe(Effect.provide(CounterBlock.layer))
export const InputOnlyInMessage = defineInMessageUnion({
  RequestedClear: {},
  RequestedSetCount: {
    count: Schema.Number.pipe(Schema.withConstructorDefault(Effect.succeed(1))),
  },
})
export type InputOnlyInMessage = typeof InputOnlyInMessage.Type
export const InputOnlyKey = Symbol('InMessagesInputOnly')
export const InputOnlyDefinition = Block.makeDefinition('InMessagesInputOnly', {
  key: InputOnlyKey,
  Model,
  Message: Schema.Never,
  InMessage: InputOnlyInMessage,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
export const InputOnlyContract = InputOnlyDefinition.contract
export const InputOnlyComposition = InputOnlyDefinition.makeComposition()
export const InputOnlyBlock = InputOnlyDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: InputOnlyComposition.makeInit(() => ({
      model: Model.make({ count: 0, label: '' }),
    })),
    update: InputOnlyComposition.makeUpdate({}),
    inMessageUpdate: InputOnlyComposition.makeInMessageUpdate({
      RequestedClear: InputOnlyDefinition.makeFieldsStep(() => ({
        count: () => 0,
      })),
      RequestedSetCount: InputOnlyDefinition.makeFieldsStep.fromMessage(
        ({ count }) => ({
          count: () => count,
        }),
      ),
    }),
  }),
)
export const parentReceiveResults = Effect.gen(function* () {
  const parent = yield* ParentContract.get
  const parentInit = parent.init()
  const clear = parent.inMessageUpdate(
    parentInit.model,
    ParentInMessage.RequestedClearChild(),
  )
  const report = parent.inMessageUpdate(
    clear.model,
    ParentInMessage.RequestedReportChild({ label: 'Child' }),
  )

  return { clear, report }
}).pipe(Effect.provide(ParentBlock.layer))

export type ExactInputSchema = Assert<
  Equal<typeof CounterContract.InMessage, typeof InMessage>
>
export type ExactGeneratedOperationNames = Assert<
  Equal<
    keyof Block.FactsOf<typeof CounterContract>['operations'],
    | 'requestClear'
    | 'requestSetCount'
    | 'requestSave'
    | 'requestReport'
    | 'informOfLabel'
  >
>

export const InputFamilyKey = Symbol('InMessagesFamily')
export const makeInputFamily = <Value, Encoded>(
  Value: Schema.Codec<Value, Encoded>,
) => {
  const FamilyInMessage = defineInMessageUnion({
    RequestedSet: { value: Value },
    RequestedClear: {},
  })
  const FamilyOutMessage = defineMessageUnion({ Reported: { value: Value } })

  return Block.makeFamilyDefinition('InMessagesFamily', {
    key: InputFamilyKey,
    Model: Schema.Struct({ value: Value }),
    Message: Schema.Never,
    InMessage: FamilyInMessage,
    OutMessage: FamilyOutMessage,
    isMessageFree: true,
    InitArgs: Block.makeInputContract<readonly [value: Value]>(),
    inMessageOutputs: {
      RequestedSet: { outMessage: FamilyOutMessage.Reported },
    },
  })
}
export const StringInputFamily = makeInputFamily(Schema.String)
export const StringInputFamilyComposition = StringInputFamily.makeComposition()
export const stringInputFamilyRecipe = StringInputFamily.makeBlock(
  Effect.succeed({
    children: [],
    init: StringInputFamilyComposition.makeInit(value => ({
      model: { value },
    })),
    update: StringInputFamilyComposition.makeUpdate({}),
    inMessageUpdate: StringInputFamilyComposition.makeInMessageUpdate({
      RequestedSet: (model, { value }) => ({
        model: { value },
        outMessage: StringInputFamily.OutMessage.Reported({
          value: model.value,
        }),
      }),
      RequestedClear: StringInputFamily.makeNoopStep(),
    }),
  }),
)
