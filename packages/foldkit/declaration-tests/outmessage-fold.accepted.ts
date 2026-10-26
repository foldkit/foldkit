import { Context, Effect, Layer, Number, Schema } from 'effect'
import { Block, Command, Message, Program, Struct, Update } from 'foldkit'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const Choice = Schema.Literals(['Apple', 'Pear'])
export const ChildModel = Schema.Struct({ count: Schema.Number })
export const ChildMessage = Message.defineMessageUnion({
  RequestedChoose: { value: Choice },
  RequestedClose: {},
  CompletedObserveChoice: {},
})
export const ChildOutMessage = Message.defineMessageUnion({
  Chose: { value: Choice },
  Closed: {},
})
const DeclarationFoldChildDefinition = Block.makeDefinition(
  'DeclarationFoldChild',
  { Model: ChildModel, Message: ChildMessage, OutMessage: ChildOutMessage },
)
const DeclarationFoldChildComposition =
  DeclarationFoldChildDefinition.makeComposition()
export const ObserveChoice = DeclarationFoldChildDefinition.makeCommand(
  'ObserveChoice',
  {
    messages: [ChildMessage.CompletedObserveChoice],
    handler: function* () {
      return () => Effect.succeed(ChildMessage.CompletedObserveChoice())
    },
  },
)
const prepareChildBlock = () =>
  DeclarationFoldChildComposition.prepareBlock({
    init: DeclarationFoldChildComposition.makeInit(() => ({
      model: { count: 0 },
    })),
    update: DeclarationFoldChildComposition.makeUpdate({
      RequestedChoose: (model, { value }) => ({
        model: Struct.modifyFields(model, { count: Number.increment }),
        outMessage: ChildOutMessage.Chose({ value }),
      }),
      RequestedClose: model => ({
        model,
        outMessage: ChildOutMessage.Closed(),
      }),
      CompletedObserveChoice: model => ({ model }),
    }),
    operations: {
      requestChoose: ChildMessage.RequestedChoose,
      requestClose: ChildMessage.RequestedClose,
    },
    EffectsLayer: ObserveChoice.layer,
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

export const LiteralModel = Schema.Struct({
  phase: Schema.Literals(['Idle', 'Done']),
})
export const LiteralMessage = Message.defineMessageUnion({
  RequestedFinish: {},
  RequestedReset: {},
})
export const DeclarationLiteralFoldDefinition = Block.makeDefinition(
  'DeclarationLiteralFold',
  { Model: LiteralModel, Message: LiteralMessage },
)
const DeclarationLiteralFoldComposition =
  DeclarationLiteralFoldDefinition.makeComposition()
export const foldLiteralModel =
  DeclarationLiteralFoldDefinition.makeOutMessageFold(ChildBlock, {
    Chose: () => _model => ({ model: { phase: 'Done' } }),
    Closed: () => _model => ({ model: { phase: 'Idle' } }),
  })
export const literalModelUpdate = DeclarationLiteralFoldComposition.makeUpdate({
  RequestedFinish: () => ({ model: { phase: 'Done' } }),
  RequestedReset: () => ({ model: { phase: 'Idle' } }),
})
export const literalMatcherUpdate =
  DeclarationLiteralFoldComposition.makeUpdate({
    RequestedFinish: (
      _model,
    ): Update.Return<typeof LiteralModel.Type, typeof LiteralMessage.Type> => ({
      model: { phase: 'Done' },
    }),
    RequestedReset: (
      _model,
    ): Update.Return<typeof LiteralModel.Type, typeof LiteralMessage.Type> => ({
      model: { phase: 'Idle' },
    }),
  })
export type LiteralModelInference = Expect<
  Equal<
    ReturnType<typeof literalModelUpdate>['model']['phase'],
    'Idle' | 'Done'
  >
>

export const StoreInitError = Schema.TaggedStruct('StoreInitError', {
  reason: Schema.String,
})
export class ChoiceStore extends Context.Service<
  ChoiceStore,
  Readonly<{
    initialize: Effect.Effect<void, typeof StoreInitError.Type>
    record: (value: typeof Choice.Type) => Effect.Effect<void>
  }>
>()('DeclarationChoiceStore') {}

export const Model = Schema.Struct({
  child: ChildBlock.Model,
  sibling: ChildBlock.Model,
  choice: Choice,
})
export const ParentMessage = Message.defineMessageUnion({
  RequestedChoose: { value: Choice },
  CompletedRecordChoice: {},
})
export const ParentOutMessage = Message.defineMessageUnion({
  Chose: { value: Choice },
})
export const DeclarationFoldParentDefinition = Block.makeDefinition(
  'DeclarationFoldParent',
  { Model, Message: ParentMessage, OutMessage: ParentOutMessage },
)
export const RecordChoice = DeclarationFoldParentDefinition.makeCommand(
  'RecordChoice',
  {
    args: { value: Choice },
    messages: [ParentMessage.CompletedRecordChoice],
    handler: function* () {
      const store = yield* ChoiceStore
      yield* store.initialize
      return ({ value }) =>
        store
          .record(value)
          .pipe(Effect.as(ParentMessage.CompletedRecordChoice()))
    },
  },
)
export const foldChoice = DeclarationFoldParentDefinition.makeOutMessageFold(
  ChildBlock,
  {
    Chose:
      ({ value }) =>
      model => ({
        model: Struct.modifyFields(model, { choice: () => value }),
        commands: [RecordChoice({ value })],
        outMessage: ParentOutMessage.Chose({ value }),
      }),
    Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
  },
)
export const foldConditionalChoice =
  DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Chose:
      ({ value }) =>
      model =>
        value === 'Apple'
          ? { model }
          : {
              model,
              commands: [RecordChoice({ value })],
              outMessage: ParentOutMessage.Chose({ value }),
            },
    Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
  })
export const ChildBinding = DeclarationFoldParentDefinition.makeBinding(
  ChildBlock,
  { field: 'child' },
).withOutMessagePolicy({ fold: foldChoice })
export const SiblingBinding = DeclarationFoldParentDefinition.makeBinding(
  ChildBlock,
  {
    field: 'sibling',
  },
).withOutMessagePolicy({
  fold: DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Chose: () => DeclarationFoldParentDefinition.makeNoopStep(),
    Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
  }),
})
export const foldWithInit = DeclarationFoldParentDefinition.makeOutMessageFold(
  ChildBlock,
  {
    Chose: () =>
      DeclarationFoldParentDefinition.makeStep(model =>
        SiblingBinding.init({
          args: [],
          toParentModel: sibling =>
            Struct.modifyFields(model, {
              sibling: () => sibling,
            }),
        }),
      ),
    Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
  },
)
export const foldLiftedChildCommand =
  DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
    Chose:
      (_outMessage, { liftCommand, modelBeforeUpdate }) =>
      model => ({
        model: Struct.modifyFields(model, {
          choice: () => modelBeforeUpdate.choice,
        }),
        commands: [liftCommand(ObserveChoice())],
      }),
    Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
  })
export const foldToSibling = DeclarationFoldParentDefinition.makeOutMessageFold(
  ChildBlock,
  {
    Chose: ({ value }) => SiblingBinding.requestChoose({ value }),
    Closed: () => model => ({ model }),
  },
)
export const CoordinatedChildBinding =
  DeclarationFoldParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  }).withOutMessagePolicy({ fold: foldToSibling })
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture compares two graphs authored by one Definition.
export const DeclarationCoordinatedComposition =
  DeclarationFoldParentDefinition.makeComposition({
    bindings: [CoordinatedChildBinding, SiblingBinding],
  })
const DeclarationFoldParentComposition =
  DeclarationFoldParentDefinition.makeComposition({
    bindings: [ChildBinding, SiblingBinding],
  })
export const parentUpdate = DeclarationFoldParentComposition.makeUpdate({
  RequestedChoose: (model, { value }) =>
    ChildBinding.requestChoose({ value })(model),
  CompletedRecordChoice: model =>
    DeclarationFoldParentDefinition.makeNoopStep()(model),
})
export const conditionalParentUpdate =
  DeclarationFoldParentComposition.makeUpdate({
    RequestedChoose: (model, message) => ({
      model,
      commands: [RecordChoice({ value: message.value })],
    }),
    CompletedRecordChoice: model => ({ model }),
  })
const prepareParentBlock = () =>
  DeclarationFoldParentComposition.prepareBlock({
    init: DeclarationFoldParentComposition.makeInit(() => ({
      model: { choice: 'Apple' },
    })),
    update: parentUpdate,
    EffectsLayer: RecordChoice.layer,
  })
export const ParentBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

export const RootModel = Schema.Struct({
  child: ChildBlock.Model,
  choice: Choice,
})
export const RootMessage = Message.defineMessageUnion({ CompletedRecord: {} })
export const DeclarationFoldRootDefinition = Block.makeDefinition(
  'DeclarationFoldRoot',
  { Model: RootModel, Message: RootMessage },
)
export const RootRecord = DeclarationFoldRootDefinition.makeCommand('Record', {
  messages: [RootMessage.CompletedRecord],
  handler: function* () {
    const store = yield* ChoiceStore
    yield* store.initialize
    return () =>
      store.record('Apple').pipe(Effect.as(RootMessage.CompletedRecord()))
  },
})
export const RootBinding = DeclarationFoldRootDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',
  },
).withOutMessagePolicy({
  fold: DeclarationFoldRootDefinition.makeOutMessageFold(ChildBlock, {
    Chose: () => model => ({ model, commands: [RootRecord()] }),
    Closed: () => DeclarationFoldRootDefinition.makeNoopStep(),
  }),
})
export const DeclarationFoldRootComposition =
  DeclarationFoldRootDefinition.makeComposition({ bindings: [RootBinding] })
export const rootInit = DeclarationFoldRootComposition.makeInit(() => ({
  model: { choice: 'Apple' },
}))
export const rootUpdate = DeclarationFoldRootComposition.makeUpdate({
  CompletedRecord: model => ({ model }),
})
export const rootView = DeclarationFoldRootComposition.makeView(() => ({
  title: 'Fold',
  body: null,
}))
const prepareRootBlock = () =>
  DeclarationFoldRootComposition.prepareBlock({
    init: rootInit,
    update: rootUpdate,
    view: rootView,
    EffectsLayer: RootRecord.layer,
  })
export const RootBlock: Block.FromAssemblyWithView<
  typeof RootModel,
  typeof prepareRootBlock
> = Block.assemble(prepareRootBlock)
export const program = Program.make({ block: RootBlock, container: null })
export const runnable = program.provide(
  Layer.succeed(ChoiceStore)({
    initialize: Effect.void,
    record: () => Effect.void,
  }),
)

export type Inference = readonly [
  Expect<Equal<Parameters<typeof foldChoice>[0], typeof ChildOutMessage.Type>>,
  Expect<
    Equal<
      Update.RequirementsOf<ReturnType<typeof foldChoice>>,
      Command.HandlerOf<typeof RecordChoice>
    >
  >,
  Expect<
    Equal<
      Update.RequirementsOf<ReturnType<typeof foldConditionalChoice>>,
      Command.HandlerOf<typeof RecordChoice>
    >
  >,
  Expect<
    Equal<
      Update.RequirementsOf<typeof conditionalParentUpdate>,
      Command.HandlerOf<typeof RecordChoice>
    >
  >,
  Expect<Equal<Layer.Services<typeof ParentBlock.EffectsLayer>, ChoiceStore>>,
  Expect<
    Equal<
      Layer.Error<typeof ParentBlock.EffectsLayer>,
      typeof StoreInitError.Type
    >
  >,
]
