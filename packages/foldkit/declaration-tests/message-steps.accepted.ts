import { Number, Schema } from 'effect'
import { Block, Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import {
  CounterDefinition,
  Message,
  Model,
  OutMessage,
  Save,
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './message-steps.definition.js'
import {
  ChildBinding,
  ParentComposition,
  ParentDefinition,
  ParentMessage,
} from './record-update.accepted.js'

export { Message, Model, OutMessage, Save } from './message-steps.definition.js'
export { ParentMessage } from './record-update.accepted.js'

export const toIncrementAndSaveStep = ({
  amount,
}: typeof Message.RequestedIncrement.Type) =>
  Update.combineSteps([
    makeFieldsStep(() => ({ count: Number.sum(amount) })),
    makeCommandsStep(({ count }) => [Save({ count })]),
  ])
export const incrementAndSaveStep = makeStep.fromMessage(toIncrementAndSaveStep)
export const CounterComposition = CounterDefinition.makeComposition()
export const update = CounterComposition.makeUpdate({
  RequestedIncrement: makeStep.fromMessage(({ amount }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({ count: Number.sum(amount) })),
      makeCommandsStep(({ count }) => [Save({ count })]),
    ]),
  ),
  RequestedReport: makeStep.fromMessage(({ label }) =>
    CounterDefinition.makeOutMessageStep(({ count }) =>
      OutMessage.ReportedCount({ count, label }),
    ),
  ),
  CompletedSave: makeStep.fromMessage(makeNoopStep),
})
export const init = CounterComposition.makeInit(() => ({ model: { count: 0 } }))
const prepare = () =>
  CounterComposition.prepareBlock({ init, update, EffectsLayer: Save.layer })
export const CounterBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

export const contextualUpdate = CounterComposition.makeUpdate.withContext(
  (multiplier: number = 2, ...offsets: ReadonlyArray<number>) => ({
    RequestedIncrement: makeStep.fromMessage(({ amount }) =>
      makeFieldsStep(() => ({
        count: count => count + amount * multiplier + offsets.length,
      })),
    ),
    RequestedReport: makeStep.fromMessage(({ label }) =>
      CounterDefinition.makeOutMessageStep(({ count }) =>
        OutMessage.ReportedCount({ count, label }),
      ),
    ),
    CompletedSave: makeNoopStep(),
  }),
)

export const modelAwareUpdate = CounterComposition.makeUpdate({
  RequestedIncrement: makeStep((model, { amount }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({ count: () => model.count + amount })),
      makeCommandsStep(({ count }) => [Save({ count })]),
    ]),
  ),
  RequestedReport: makeStep((model, { label }) => ({
    model,
    outMessage: OutMessage.ReportedCount({ count: model.count, label }),
  })),
  CompletedSave: makeNoopStep(),
})

export const modelAwareContextualUpdate =
  CounterComposition.makeUpdate.withContext(
    (multiplier: number = 2, ...offsets: ReadonlyArray<number>) => ({
      RequestedIncrement: makeStep((model, { amount }) => ({
        model: { count: model.count + amount * multiplier + offsets.length },
        commands: [Save({ count: model.count })],
      })),
      RequestedReport: makeStep((model, { label }) => ({
        model,
        outMessage: OutMessage.ReportedCount({ count: model.count, label }),
      })),
      CompletedSave: makeNoopStep(),
    }),
  )

export const modelAwareIncrementStep = modelAwareUpdate(
  Message.RequestedIncrement({ amount: 1 }),
)

export const modelAwareReportStep = modelAwareUpdate(
  Message.RequestedReport({ label: 'current' }),
)
export const modelAwareContextualIncrementStep = modelAwareContextualUpdate(
  Message.RequestedIncrement({ amount: 1 }),
)
export const modelAwareContextualReportStep = modelAwareContextualUpdate(
  Message.RequestedReport({ label: 'current' }),
)

const prepareModelAware = () =>
  CounterComposition.prepareBlock({
    init,
    update: modelAwareUpdate,
    operations: {
      increment: Message.RequestedIncrement,
      report: Message.RequestedReport,
    },
    EffectsLayer: Save.layer,
  })
export const ModelAwareCounterBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareModelAware
> = Block.assemble(prepareModelAware)
const prepareModelAwareContextual = () =>
  CounterComposition.prepareBlock({
    init,
    update: modelAwareContextualUpdate,
    operations: {
      increment: Message.RequestedIncrement,
      report: Message.RequestedReport,
    },
    EffectsLayer: Save.layer,
  })
export const ModelAwareContextualCounterBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareModelAwareContextual
> = Block.assemble(prepareModelAwareContextual)

export const reportChildStep = ParentDefinition.makeStep.fromMessage(
  (_message: typeof ParentMessage.RequestedReport.Type) =>
    ChildBinding.report({ amount: 1 }),
)
export const connectedUpdate = ParentComposition.makeUpdate({
  RequestedQuiet: ParentDefinition.makeStep.fromMessage(() =>
    ChildBinding.quiet(),
  ),
  RequestedReport: reportChildStep,
  RequestedSave: ParentDefinition.makeStep.fromMessage(() =>
    ChildBinding.save(),
  ),
  CompletedSave: ParentDefinition.makeNoopStep(),
})

export const modelAwareConnectedUpdate = ParentComposition.makeUpdate({
  RequestedQuiet: ParentDefinition.makeStep((_model, _message) =>
    ChildBinding.quiet(),
  ),
  RequestedReport: ParentDefinition.makeStep((model, _message) =>
    ChildBinding.report({ amount: model.count }),
  ),
  RequestedSave: ParentDefinition.makeStep((_model, _message) =>
    ChildBinding.save(),
  ),
  CompletedSave: ParentDefinition.makeNoopStep(),
})
export const modelAwareChildReportStep = modelAwareConnectedUpdate(
  ParentMessage.RequestedReport(),
)
export const modelAwareContextualConnectedUpdate =
  ParentComposition.makeUpdate.withContext((offset: number = 1) => ({
    RequestedQuiet: ParentDefinition.makeNoopStep(),
    RequestedReport: ParentDefinition.makeStep((model, _message) =>
      ChildBinding.report({ amount: model.count + offset }),
    ),
    RequestedSave: ChildBinding.save(),
    CompletedSave: ParentDefinition.makeNoopStep(),
  }))
export const modelAwareContextualChildReportStep =
  modelAwareContextualConnectedUpdate(ParentMessage.RequestedReport())

export const makeGenericCounter = <Value>(Value: Schema.Schema<Value>) => {
  const Model = Schema.Struct({ value: Value })
  const Message = defineMessageUnion({ RequestedSet: { value: Value } })
  const Definition = Block.makeDefinition('MessageOnlyGeneric', {
    Model,
    Message,
  })
  const Composition = Definition.makeComposition()
  const update = Composition.makeUpdate({
    RequestedSet: Definition.makeStep.fromMessage(({ value }) =>
      Definition.makeFieldsStep(() => ({ value: () => value })),
    ),
  })
  return update
}
export const setString = makeGenericCounter(Schema.String)

export const makeModelAwareCounter = <Value>(Value: Schema.Schema<Value>) => {
  const Model = Schema.Struct({ value: Value })
  const Message = defineMessageUnion({ RequestedSet: { value: Value } })
  const Definition = Block.makeDefinition('ModelAwareGeneric', {
    Model,
    Message,
  })
  const Composition = Definition.makeComposition()

  return Composition.makeUpdate({
    RequestedSet: Definition.makeStep((model, { value }) => ({
      model: modifyFields(model, { value: () => value }),
    })),
  })
}
export const setModelAwareString = makeModelAwareCounter(Schema.String)

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
export type ExactArguments = Expect<
  Equal<
    Parameters<typeof incrementAndSaveStep>,
    [model: typeof Model.Type, message: typeof Message.RequestedIncrement.Type]
  >
>
export const ordinaryIncrementAndSaveStep = makeStep(
  (_model, message: typeof Message.RequestedIncrement.Type) =>
    toIncrementAndSaveStep(message),
)
export type ExactCommands = Expect<
  Equal<
    NonNullable<ReturnType<typeof incrementAndSaveStep>['commands']>[number],
    NonNullable<
      ReturnType<typeof ordinaryIncrementAndSaveStep>['commands']
    >[number]
  >
>
export type ExactRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof incrementAndSaveStep>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactOutMessage = Expect<
  Equal<
    Exclude<ReturnType<typeof update>['outMessage'], undefined>,
    typeof OutMessage.Type
  >
>
export type ExactRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof reportChildStep>>,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>

export type ExactModelAwareRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof modelAwareIncrementStep>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactModelAwareSilentRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof ModelAwareCounterBlock.operations.report>,
    never
  >
>
export type ExactModelAwareOutMessage = Expect<
  Equal<
    Exclude<ReturnType<typeof modelAwareReportStep>['outMessage'], undefined>,
    typeof OutMessage.Type
  >
>
export type ExactModelAwareRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof modelAwareChildReportStep>>,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
export type ExactContextualRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof modelAwareContextualIncrementStep>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactContextualOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<typeof modelAwareContextualReportStep>['outMessage'],
      undefined
    >,
    typeof OutMessage.Type
  >
>
export type ExactContextualSilentRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      typeof ModelAwareContextualCounterBlock.operations.report
    >,
    never
  >
>
export type ExactContextualRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof modelAwareContextualChildReportStep>
    >,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
