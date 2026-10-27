import { Number, Schema } from 'effect'
import { Block, Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

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
