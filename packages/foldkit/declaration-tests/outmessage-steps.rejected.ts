import { Effect } from 'effect'
import { Block, Update } from 'foldkit'

import {
  ChildBindingWithOutMessagePolicy,
  DefinitionWithoutOutMessage,
  Message,
  Model,
  OutMessage,
  OutMessageStepsComposition,
  OutMessageStepsDefinition,
  ParentComposition,
  ParentOutMessage,
  PrimitiveDefinition,
  emitClosedStep,
  emitPrimitiveStep,
} from './outmessage-steps.accepted.js'

// @ts-expect-error Old callback authoring cannot bypass the registered Binding policy guard.
ParentComposition.makeUpdate(model =>
  Update.combineSteps(model, [ChildBindingWithOutMessagePolicy.close()]),
)

// @ts-expect-error A Definition must declare its OutMessage contract.
DefinitionWithoutOutMessage.makeOutMessageStep(OutMessage.ClosedPicker())
// @ts-expect-error OutMessage Step authoring belongs to the Definition.
OutMessageStepsComposition.makeOutMessageStep
// @ts-expect-error A foreign OutMessage cannot escape the owning contract.
OutMessageStepsDefinition.makeOutMessageStep(ParentOutMessage.ObservedClosure())
// @ts-expect-error A callback's selected choice requires its payload.
OutMessageStepsDefinition.makeOutMessageStep(() => ({
  _tag: 'SelectedChoice',
}))
OutMessageStepsDefinition.makeOutMessageStep(() => ({
  _tag: 'SelectedChoice',
  // @ts-expect-error A selected choice retains its declared payload type.
  value: 1,
}))
// @ts-expect-error Step authoring requires a callback.
OutMessageStepsDefinition.makeOutMessageStep(undefined)
// @ts-expect-error Construction accepts only one callback.
OutMessageStepsDefinition.makeOutMessageStep(OutMessage.ClosedPicker(), 1)
// @ts-expect-error Primitive OutMessages retain their declared alternatives.
PrimitiveDefinition.makeOutMessageStep(() => 'Foreign')

declare const unknownOutMessage: unknown
declare const erasedOutMessage: any
declare const maybeOutMessage: typeof OutMessage.Type | undefined
// @ts-expect-error Unknown callback results require validation before Step construction.
OutMessageStepsDefinition.makeOutMessageStep(() => unknownOutMessage)
// @ts-expect-error An any callback result cannot erase the declared OutMessage contract.
OutMessageStepsDefinition.makeOutMessageStep(() => erasedOutMessage)
// @ts-expect-error Optional callback results are not definite OutMessages.
OutMessageStepsDefinition.makeOutMessageStep(() => maybeOutMessage)
// @ts-expect-error The Step checks the owning Model.
emitClosedStep({ count: 'invalid', status: 'Idle' })
// @ts-expect-error The Step accepts only its incoming Model.
emitClosedStep(Model.make({ count: 0, status: 'Idle' }), 1)
// @ts-expect-error Primitive Models retain their declared type.
emitPrimitiveStep(1)
// @ts-expect-error A plain Step combination cannot discard an OutMessage.
Update.combineSteps([emitClosedStep])
// @ts-expect-error A preceding Model-only Step cannot hide a later OutMessage.
Update.combineSteps([OutMessageStepsDefinition.makeNoopStep(), emitClosedStep])
// @ts-expect-error The data-first combination cannot discard an OutMessage.
Update.combineSteps(Model.make({ count: 0, status: 'Idle' }), [emitClosedStep])

const ObserveSelection = OutMessageStepsDefinition.makeCommand(
  'ObserveSelection',
  {
    messages: [Message.CompletedObserveSelection],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedObserveSelection())
    },
  },
)
const emitWithCommands = <Current extends typeof Model.Type>(
  model: Current,
) => ({
  model,
  outMessage: OutMessage.SelectedChoice({ value: 'Apple' }),
  commands: [ObserveSelection()],
})
// @ts-expect-error The public Step contract cannot hide actual Commands.
const erasedCommands: Block.OutMessageStep<
  typeof Model.Type,
  typeof OutMessage.SelectedChoice.Type
> = emitWithCommands
void erasedCommands

const preserveStep = OutMessageStepsDefinition.makeNoopStep()
const fieldsStep = OutMessageStepsDefinition.makeFieldsStep(() => ({}))
const noopAndOutMessage = [preserveStep, emitClosedStep]
const fieldsAndOutMessage = [fieldsStep, emitClosedStep]
// @ts-expect-error Extracted lists cannot erase an emitting Step behind a no-op.
Update.combineSteps(noopAndOutMessage)
// @ts-expect-error Extracted lists cannot erase an emitting Step behind field transforms.
Update.combineSteps(fieldsAndOutMessage)
// @ts-expect-error A later no-op cannot erase an earlier emitting Step.
Update.combineSteps([emitClosedStep, preserveStep])
// @ts-expect-error A no-op cannot be annotated to conceal an OutMessage.
const emittingNoopStep: typeof preserveStep = emitClosedStep
// @ts-expect-error A field Step cannot be annotated to conceal an OutMessage.
const emittingFieldsStep: typeof fieldsStep = emitClosedStep
void emittingNoopStep
void emittingFieldsStep

const commandsOnlyStep = <Current extends typeof Model.Type>(
  model: Current,
) => ({
  model,
  commands: [ObserveSelection()],
})
// @ts-expect-error A no-op cannot be annotated to conceal Commands.
const commandsNoopStep: typeof preserveStep = commandsOnlyStep
// @ts-expect-error A field Step cannot be annotated to conceal Commands.
const commandsFieldsStep: typeof fieldsStep = commandsOnlyStep
void commandsNoopStep
void commandsFieldsStep

OutMessageStepsComposition.makeInit(() => ({
  model: Model.make({ count: 0, status: 'Idle' }),
  // @ts-expect-error Initialization cannot discard a Step's OutMessage.
  steps: [emitClosedStep],
}))
