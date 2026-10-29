import { Context, Effect, Layer, Number, Schema, pipe } from 'effect'
import { Block, Command, Message as MessageModule, Update } from 'foldkit'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const DialogModel = Schema.Struct({ count: Schema.Number })
const DialogMessage = MessageModule.defineMessageUnion({
  RequestedClose: {},
  CompletedRememberClose: {},
})
const DialogDefinition = Block.makeDefinition('CombinedOutMessageDialog', {
  Model: DialogModel,
  Message: DialogMessage,
})
export class Store extends Context.Service<
  Store,
  Readonly<{
    init: Effect.Effect<void, 'StoreUnavailable'>
    remember: (count: number) => Effect.Effect<void>
  }>
>()('CombinedOutMessage/Store') {}
export const RememberClose = DialogDefinition.makeCommand('RememberClose', {
  args: { count: Schema.Number },
  messages: [DialogMessage.CompletedRememberClose],
  handler: function* () {
    const store = yield* Store
    yield* store.init
    return ({ count }) =>
      store
        .remember(count)
        .pipe(Effect.as(DialogMessage.CompletedRememberClose()))
  },
})
const DialogComposition = DialogDefinition.makeComposition()
const prepareDialog = () =>
  DialogComposition.prepareBlock({
    init: DialogComposition.makeInit(() => ({
      model: DialogModel.make({ count: 0 }),
    })),
    update: DialogComposition.makeUpdate({
      RequestedClose: model =>
        Update.combineSteps(model, [
          DialogDefinition.makeFieldsStep(() => ({ count: Number.increment })),
          DialogDefinition.makeCommandsStep(({ count }) => [
            RememberClose({ count }),
          ]),
        ]),
      CompletedRememberClose: DialogDefinition.makeNoopStep(),
    }),
    operations: { requestClose: DialogMessage.RequestedClose },
    EffectsLayer: RememberClose.layer,
  })
export const DialogBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof DialogModel,
  typeof prepareDialog
> = Block.assemble(prepareDialog)

export const Model = Schema.Struct({
  dialog: DialogBlock.Model,
  count: Schema.Number,
})
export const Message = MessageModule.defineMessageUnion({
  SavedArray: {},
  SavedTuple: {},
  SavedCurriedArray: {},
  SavedCurriedTuple: {},
  SavedNestedArray: {},
  SavedNestedTuple: {},
  Plain: {},
})
export const OutMessage = MessageModule.defineMessageUnion({
  Saved: {},
  SavedTuple: {},
  SavedCurriedArray: {},
  SavedCurriedTuple: {},
  SavedNestedArray: {},
  SavedNestedTuple: {},
  Plain: {},
})
export const EditorDefinition = Block.makeDefinition(
  'CombinedOutMessageEditor',
  {
    Model,
    Message,
    OutMessage,
  },
)
export const DialogBinding = EditorDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
})
export const EditorComposition = EditorDefinition.makeComposition({
  bindings: [DialogBinding],
})
export const closeDialogStep = DialogBinding.requestClose()
export const steps: ReadonlyArray<typeof closeDialogStep> = [
  closeDialogStep,
  closeDialogStep,
]
const leaveStep = EditorDefinition.makeFieldsStep(() => ({
  count: Number.increment,
}))
type ConnectedModel = Parameters<typeof closeDialogStep>[0]

export const saveArray = (model: ConnectedModel) =>
  pipe(
    Update.combineSteps(model, steps),
    Update.withOutMessage(OutMessage.Saved()),
  )
export const saveTuple = (model: ConnectedModel) =>
  Update.withOutMessage(
    Update.combineSteps(model, [leaveStep, closeDialogStep]),
    OutMessage.Saved(),
  )
export const saveCurriedArray = (model: ConnectedModel) =>
  pipe(
    Update.combineSteps(steps)(model),
    Update.withOutMessage(OutMessage.Saved()),
  )
export const saveCurriedTuple = (model: ConnectedModel) =>
  Update.withOutMessage(
    Update.combineSteps([leaveStep, closeDialogStep])(model),
    OutMessage.Saved(),
  )
export const saveNestedArray = (model: ConnectedModel) =>
  pipe(
    Update.combineSteps(model, [leaveStep, Update.combineSteps(steps)]),
    Update.withOutMessage(OutMessage.Saved()),
  )
export const saveNestedTuple = (model: ConnectedModel) =>
  pipe(
    Update.combineSteps(model, [
      leaveStep,
      Update.combineSteps([leaveStep, closeDialogStep]),
    ]),
    Update.withOutMessage(OutMessage.Saved()),
  )
export const plainStep = EditorDefinition.makeOutMessageStep(() =>
  OutMessage.Plain(),
)

export const inlineRecordUpdate = EditorComposition.makeUpdate({
  SavedArray: model =>
    pipe(
      Update.combineSteps(model, steps),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  SavedTuple: model =>
    Update.withOutMessage(
      Update.combineSteps(model, [leaveStep, closeDialogStep]),
      OutMessage.SavedTuple(),
    ),
  SavedCurriedArray: model =>
    pipe(
      Update.combineSteps(steps)(model),
      Update.withOutMessage(OutMessage.SavedCurriedArray()),
    ),
  SavedCurriedTuple: model =>
    Update.withOutMessage(
      Update.combineSteps([leaveStep, closeDialogStep])(model),
      OutMessage.SavedCurriedTuple(),
    ),
  SavedNestedArray: model =>
    pipe(
      Update.combineSteps(model, [leaveStep, Update.combineSteps(steps)]),
      Update.withOutMessage(OutMessage.SavedNestedArray()),
    ),
  SavedNestedTuple: model =>
    pipe(
      Update.combineSteps(model, [
        leaveStep,
        Update.combineSteps([leaveStep, closeDialogStep]),
      ]),
      Update.withOutMessage(OutMessage.SavedNestedTuple()),
    ),
  Plain: model => plainStep(model),
})
export const recordUpdate = EditorComposition.makeUpdate({
  SavedArray: model =>
    pipe(
      Update.combineSteps(model, steps),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  SavedTuple: model =>
    Update.withOutMessage(
      Update.combineSteps(model, [leaveStep, closeDialogStep]),
      OutMessage.SavedTuple(),
    ),
  SavedCurriedArray: model =>
    pipe(
      Update.combineSteps(steps)(model),
      Update.withOutMessage(OutMessage.SavedCurriedArray()),
    ),
  SavedCurriedTuple: model =>
    Update.withOutMessage(
      Update.combineSteps([leaveStep, closeDialogStep])(model),
      OutMessage.SavedCurriedTuple(),
    ),
  SavedNestedArray: model =>
    pipe(
      Update.combineSteps(model, [leaveStep, Update.combineSteps(steps)]),
      Update.withOutMessage(OutMessage.SavedNestedArray()),
    ),
  SavedNestedTuple: model =>
    pipe(
      Update.combineSteps(model, [
        leaveStep,
        Update.combineSteps([leaveStep, closeDialogStep]),
      ]),
      Update.withOutMessage(OutMessage.SavedNestedTuple()),
    ),
  Plain: plainStep,
})
export const initialModel = Model.make({
  dialog: DialogModel.make({ count: 0 }),
  count: 0,
})
const prepareEditor = () =>
  EditorComposition.prepareBlock({
    init: EditorComposition.makeInit(() => ({ model: { count: 0 } })),
    update: inlineRecordUpdate,
    operations: { save: Message.SavedArray },
  })
export const EditorBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareEditor
> = Block.assemble(prepareEditor)

type AttachedOutput<Output> =
  Output extends Update.ResultRecipe<
    infer Model,
    infer Message,
    infer OutMessage,
    infer Requirements,
    infer Evidence
  >
    ? Update.ReturnWithRegistrationEvidence<
        Model,
        Message,
        OutMessage,
        Requirements,
        Evidence
      >
    : Output
type AttachedOutMessage<Output> =
  AttachedOutput<Output> extends Readonly<{ outMessage?: infer OutMessage }>
    ? NonNullable<OutMessage>
    : never
type MembersEqual<Actual, Expected> = [Actual] extends [never]
  ? false
  : 0 extends 1 & Actual
    ? false
    : Actual extends unknown
      ? Equal<Actual, Expected>
      : never
type SavedStepChannelsEqual<Step extends (model: ConnectedModel) => unknown> =
  | MembersEqual<
      AttachedOutMessage<ReturnType<Step>>,
      typeof OutMessage.Saved.Type
    >
  | MembersEqual<
      AttachedOutput<ReturnType<Step>> extends Readonly<{ model: infer Model }>
        ? Model
        : never,
      typeof Model.Type
    >
  | MembersEqual<
      Update.RequirementsOf<Step>,
      Block.Scoped<'dialog', Command.HandlerOf<typeof RememberClose>>
    >
  | MembersEqual<
      Update.RegistrationEvidenceOf<ReturnType<Step>>,
      Block.RequirementOfBinding<typeof DialogBinding>
    >

export type ExactArrayChannels = Expect<
  Equal<SavedStepChannelsEqual<typeof saveArray>, true>
>
export type ExactTupleChannels = Expect<
  Equal<SavedStepChannelsEqual<typeof saveTuple>, true>
>
export type ExactCurriedArrayChannels = Expect<
  Equal<SavedStepChannelsEqual<typeof saveCurriedArray>, true>
>
export type ExactCurriedTupleChannels = Expect<
  Equal<SavedStepChannelsEqual<typeof saveCurriedTuple>, true>
>
export type ExactNestedArrayChannels = Expect<
  Equal<SavedStepChannelsEqual<typeof saveNestedArray>, true>
>
export type ExactNestedTupleChannels = Expect<
  Equal<SavedStepChannelsEqual<typeof saveNestedTuple>, true>
>
export type ExactInlineRecordOutMessages = Expect<
  Equal<
    NonNullable<ReturnType<typeof inlineRecordUpdate>['outMessage']>,
    typeof OutMessage.Type
  >
>
export type ExactRecordOutMessages = Expect<
  Equal<
    NonNullable<ReturnType<typeof recordUpdate>['outMessage']>,
    typeof OutMessage.Type
  >
>
export type ExactRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof inlineRecordUpdate>,
    Block.Scoped<'dialog', Command.HandlerOf<typeof RememberClose>>
  >
>
export type ExactRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof inlineRecordUpdate>>,
    Block.RequirementOfBinding<typeof DialogBinding>
  >
>
export type ExactServices = Expect<
  Equal<Layer.Services<typeof EditorBlock.EffectsLayer>, Store>
>
export type ExactConstructorError = Expect<
  Equal<Layer.Error<typeof EditorBlock.EffectsLayer>, 'StoreUnavailable'>
>

export const ReportMessage = MessageModule.defineMessageUnion({
  Saved: {},
  Plain: {},
})
export const ReportOutMessage = MessageModule.defineMessageUnion({
  Saved: {},
  Plain: {},
})
export const ReportDefinition = Block.makeDefinition(
  'CombinedOutMessageReport',
  {
    Model,
    Message: ReportMessage,
    OutMessage: ReportOutMessage,
  },
)
export const ReportDialogBinding = ReportDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
})
export const ReportComposition = ReportDefinition.makeComposition({
  bindings: [ReportDialogBinding],
})
const reportCloseDialogStep = ReportDialogBinding.requestClose()
export const reportSteps: ReadonlyArray<typeof reportCloseDialogStep> = [
  reportCloseDialogStep,
]
export const reportUpdate = ReportComposition.makeUpdate({
  Saved: model =>
    pipe(
      Update.combineSteps(model, reportSteps),
      Update.withOutMessage(ReportOutMessage.Saved()),
    ),
  Plain: model =>
    ReportDefinition.makeOutMessageStep(() => ReportOutMessage.Plain())(model),
})
export type ExactReportedOutMessages = Expect<
  Equal<
    NonNullable<ReturnType<typeof reportUpdate>['outMessage']>,
    typeof ReportOutMessage.Type
  >
>

export const ParentModel = Schema.Struct({
  editor: EditorBlock.Model,
  count: Schema.Number,
})
export const ParentMessage = MessageModule.defineMessageUnion({
  RequestedSave: {},
})
export const ParentOutMessage = MessageModule.defineMessageUnion({
  ObservedSave: {},
})
export const ParentDefinition = Block.makeDefinition(
  'CombinedOutMessageParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  },
)
export const foldEditorOutMessage = ParentDefinition.makeOutMessageFold(
  EditorBlock,
  {
    Saved: () =>
      ParentDefinition.makeFieldsStep(() => ({ count: Number.increment })),
    SavedTuple: ParentDefinition.makeNoopStep,
    SavedCurriedArray: ParentDefinition.makeNoopStep,
    SavedCurriedTuple: ParentDefinition.makeNoopStep,
    SavedNestedArray: ParentDefinition.makeNoopStep,
    SavedNestedTuple: ParentDefinition.makeNoopStep,
    Plain: ParentDefinition.makeNoopStep,
  },
)
export const EditorBinding = ParentDefinition.makeBinding(EditorBlock, {
  field: 'editor',
}).withOutMessagePolicy({ fold: foldEditorOutMessage })
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [EditorBinding],
})
export const parentUpdate = ParentComposition.makeUpdate({
  RequestedSave: model => EditorBinding.save()(model),
})
export const ForwardingEditorBinding = ParentDefinition.makeBinding(
  EditorBlock,
  { field: 'editor' },
).withOutMessagePolicy({
  forward: ParentDefinition.makeOutMessageForward(EditorBlock, {
    Saved: () => ParentOutMessage.ObservedSave(),
    SavedTuple: () => undefined,
    SavedCurriedArray: () => undefined,
    SavedCurriedTuple: () => undefined,
    SavedNestedArray: () => undefined,
    SavedNestedTuple: () => undefined,
    Plain: () => undefined,
  }),
})
export const ForwardingComposition = ParentDefinition.makeComposition({
  bindings: [ForwardingEditorBinding],
})
