import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  RequestedIncrement: {},
  CompletedChildSave: {},
})
const ChildDefinition = Block.makeDefinition('CompositionUpdateChannelsChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const ChildSave = ChildDefinition.makeCommand('ChildSave', {
  messages: [ChildMessage.CompletedChildSave],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedChildSave())
  },
})
const ChildComposition = ChildDefinition.makeComposition()
type ChildUpdateReturn = Update.Return<
  typeof ChildModel.Type,
  typeof ChildMessage.Type,
  Command.HandlerOf<typeof ChildSave>
>
const childUpdate = ChildComposition.makeUpdate({
  RequestedIncrement: (model): ChildUpdateReturn => ({
    model: modifyFields(model, { count: count => count + 1 }),
    commands: [ChildSave()],
  }),
  CompletedChildSave: (model): ChildUpdateReturn => ({ model }),
})
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: childUpdate,
    operations: {
      requestIncrement: ChildMessage.RequestedIncrement,
    },
    EffectsLayer: ChildSave.layer,
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const ParentModel = Schema.Struct({ child: ChildModel })
const ParentMessage = defineMessageUnion({
  IgnoredRequest: {},
  RequestedChildIncrement: {},
  RequestedLocalSave: {},
  RequestedReport: {},
  CompletedLocalSave: {},
})
const ParentOutMessage = defineMessageUnion({ Reported: {} })
const ParentDefinition = Block.makeDefinition(
  'CompositionUpdateChannelsParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  },
)
const LocalSave = ParentDefinition.makeCommand('LocalSave', {
  messages: [ParentMessage.CompletedLocalSave],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedLocalSave())
  },
})
const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})

const localNoopStep = ParentDefinition.makeNoopStep()
const saveLocallyStep = ParentDefinition.makeCommandsStep(() => [LocalSave()])
const reportStep = ParentDefinition.makeOutMessageStep(() =>
  ParentOutMessage.Reported(),
)

const update = ParentComposition.makeUpdate({
  IgnoredRequest: model => localNoopStep(model),
  RequestedChildIncrement: model => ChildBinding.requestIncrement()(model),
  RequestedLocalSave: model => saveLocallyStep(model),
  RequestedReport: model => reportStep(model),
  CompletedLocalSave: model => localNoopStep(model),
})

type UpdateOutMessage =
  ReturnType<typeof update> extends Readonly<{
    outMessage?: infer OutMessage
  }>
    ? Exclude<OutMessage, undefined>
    : never

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
export type ExactOutMessage = Expect<
  Equal<UpdateOutMessage, typeof ParentOutMessage.Type>
>
export type ExactRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof update>,
    | Command.HandlerOf<typeof LocalSave>
    | Block.Scoped<'child', Command.HandlerOf<typeof ChildSave>>
  >
>
export type ExactRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof update>>,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
export {
  ParentModel,
  ParentMessage,
  ParentOutMessage,
  ParentDefinition,
  ParentComposition,
  ChildBinding,
  LocalSave,
  update,
}

export const connectedOnly = ParentComposition.makeUpdate({
  IgnoredRequest: localNoopStep,
  RequestedChildIncrement: ChildBinding.requestIncrement(),
  RequestedLocalSave: localNoopStep,
  RequestedReport: localNoopStep,
  CompletedLocalSave: localNoopStep,
})
export const rawOnly = ParentDefinition.makeComposition().makeUpdate({
  IgnoredRequest: model => ({ model }),
  RequestedChildIncrement: model => ({ model }),
  RequestedLocalSave: model => ({ model, commands: [LocalSave()] }),
  RequestedReport: model => ({
    model,
    outMessage: ParentOutMessage.Reported(),
  }),
  CompletedLocalSave: model => ({ model }),
})
export type RawOnlyRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof rawOnly>,
    Command.HandlerOf<typeof LocalSave>
  >
>
export type RawOnlyOutMessage = Expect<
  Equal<
    NonNullable<ReturnType<typeof rawOnly>['outMessage']>,
    typeof ParentOutMessage.Type
  >
>
export const initOnly = ParentComposition.makeUpdate({
  IgnoredRequest: localNoopStep,
  RequestedChildIncrement: model =>
    ChildBinding.init({
      args: [],
      toParentModel: child => modifyFields(model, { child: () => child }),
    }),
  RequestedLocalSave: localNoopStep,
  RequestedReport: localNoopStep,
  CompletedLocalSave: localNoopStep,
})
export const KeyedModel = Schema.Struct({
  children: Schema.Array(
    Schema.Struct({ id: Schema.String, counter: ChildModel }),
  ),
})
export const KeyedDefinition = Block.makeDefinition('CallbackGuardKeyed', {
  Model: KeyedModel,
  Message: ParentMessage,
})
export const KeyedBinding = KeyedDefinition.makeBinding(ChildBlock, {
  field: 'children',
  key: 'id',
  childField: 'counter',
})
export const KeyedComposition = KeyedDefinition.makeComposition({
  bindings: [KeyedBinding],
})
const keepKeyedStep = KeyedDefinition.makeNoopStep()
export const keyedUpdate = KeyedComposition.makeUpdate({
  IgnoredRequest: keepKeyedStep,
  RequestedChildIncrement: KeyedBinding.requestIncrement('current'),
  RequestedLocalSave: keepKeyedStep,
  RequestedReport: keepKeyedStep,
  CompletedLocalSave: keepKeyedStep,
})
export type KeyedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof keyedUpdate>>,
    Block.RequirementOfBinding<typeof KeyedBinding>
  >
>
export const makeGenericOwner = <Value>(Value: Schema.Schema<Value>) => {
  const Model = Schema.Struct({ child: ChildModel, value: Value })
  const Definition = Block.makeDefinition('CallbackGuardGeneric', {
    Model,
    Message: ParentMessage,
  })
  const Binding = Definition.makeBinding(ChildBlock, { field: 'child' })
  const Composition = Definition.makeComposition({ bindings: [Binding] })
  const keepStep = Definition.makeNoopStep()
  return Composition.makeUpdate({
    IgnoredRequest: keepStep,
    RequestedChildIncrement: Binding.requestIncrement(),
    RequestedLocalSave: keepStep,
    RequestedReport: keepStep,
    CompletedLocalSave: keepStep,
  })
}
type LocalReturn = Update.ReturnWithOutMessage<
  typeof ParentModel.Type,
  typeof ParentMessage.Type,
  typeof ParentOutMessage.Type,
  Command.HandlerOf<typeof LocalSave>
>
type ChildResult = ReturnType<ReturnType<typeof ChildBinding.requestIncrement>>
export const explicitUnion = ParentComposition.makeUpdate({
  IgnoredRequest: localNoopStep,
  RequestedChildIncrement: (model): LocalReturn | ChildResult =>
    ChildBinding.requestIncrement()(model),
  RequestedLocalSave: localNoopStep,
  RequestedReport: localNoopStep,
  CompletedLocalSave: localNoopStep,
})
