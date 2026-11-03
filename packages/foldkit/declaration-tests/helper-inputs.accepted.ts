import { Effect } from 'effect'
import { Command, Update } from 'foldkit'

import {
  HelperInputsDefinition,
  InMessage,
  Message,
  Model,
  OutMessage,
  Save,
  acceptInputCases,
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageStep,
  makeStep,
} from './helper-inputs.definition.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
declare const assertExact: <Value extends true>() => Value

const closed = () => OutMessage.Closed()
const saveZero = () => [Save({ count: 0 })]

export const messageOnlyCases = acceptInputCases({
  Shared: makeFieldsStep.fromMessage(message => {
    assertExact<Equal<typeof message, typeof InMessage.Shared.Type>>()
    return { label: () => message.label }
  }),
  RequestSave: makeCommandsStep.fromMessage(({ count }) => [Save({ count })]),
  RequestReport: makeOutMessageStep.fromMessage(({ label }) =>
    OutMessage.Reported({ label }),
  ),
  RequestSet: makeStep.fromMessage(({ count }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({ count: () => count })),
      makeCommandsStep(() => [Save({ count })]),
    ]),
  ),
  RequestClose: makeStep.fromMessage(makeNoopStep),
})

export const modelAwareCases = acceptInputCases({
  Shared: makeFieldsStep((model, message) => {
    assertExact<Equal<typeof message, typeof InMessage.Shared.Type>>()
    assertExact<Equal<typeof model, Model>>()
    return { label: () => message.label, count: () => model.count + 1 }
  }),
  RequestSave: makeCommandsStep((model, { count }) => [
    Save({ count: model.count + count }),
  ]),
  RequestReport: makeOutMessageStep((model, { label }) =>
    OutMessage.Reported({ label: model.label + label }),
  ),
  RequestSet: makeStep((model, message) => {
    assertExact<Equal<typeof message, typeof InMessage.RequestSet.Type>>()
    return { model, commands: [Save({ count: model.count + message.count })] }
  }),
  RequestClose: makeOutMessageStep(closed),
})

const fieldsForShared = ({ label }: typeof InMessage.Shared.Type) => ({
  label: () => label,
})
const commandsForShared = ({ label }: typeof InMessage.Shared.Type) => [
  Save({ count: label.length }),
]
const outForShared = ({ label }: typeof InMessage.Shared.Type) =>
  OutMessage.Reported({ label })
const stepForShared = ({ label }: typeof InMessage.Shared.Type) =>
  makeFieldsStep(() => ({ label: () => label }))

export const extractedFields = makeFieldsStep.fromMessage(fieldsForShared)
export const extractedCommands = makeCommandsStep.fromMessage(commandsForShared)
export const extractedOutMessage = makeOutMessageStep.fromMessage(outForShared)
export const extractedModelFields = makeFieldsStep(
  (_model, message: typeof InMessage.Shared.Type) => fieldsForShared(message),
)
export const extractedModelCommands = makeCommandsStep(
  (_model, message: typeof InMessage.Shared.Type) => commandsForShared(message),
)
export const extractedModelOutMessage = makeOutMessageStep(
  (_model, message: typeof InMessage.Shared.Type) => outForShared(message),
)
export const extractedStep = makeStep.fromMessage(stepForShared)
export const fixedCommands = makeCommandsStep(saveZero)
export const fixedOutMessage = makeOutMessageStep(closed)

const Composition = HelperInputsDefinition.makeComposition()
export const defaultUpdate = Composition.makeUpdate({
  Shared: HelperInputsDefinition.makeFieldsStep.fromMessage(message => {
    assertExact<Equal<typeof message, typeof Message.Shared.Type>>()
    return { count: () => message.count }
  }),
  CompletedSave: makeNoopStep(),
})

export type ExtractedSharedInputRemainsExact = Assert<
  Equal<Parameters<typeof extractedFields>[1], typeof InMessage.Shared.Type>
>
export type ResultCommandsRemainLocal = Assert<
  Equal<
    Effect.Success<
      ReturnType<typeof extractedCommands>['commands'][number]['effect']
    >,
    typeof Message.CompletedSave.Type
  >
>

export const broadInputLocalUpdate = Composition.makeUpdate({
  Shared: makeStep((model, { count }) => ({
    model,
    commands: [Save({ count })],
  })),
  CompletedSave: makeNoopStep(),
})
export type InlineSharedInputRemainsExact = Assert<
  Equal<
    Parameters<typeof messageOnlyCases.Shared>[1],
    typeof InMessage.Shared.Type
  >
>
export type ModelSharedInputRemainsExact = Assert<
  Equal<
    Parameters<typeof modelAwareCases.Shared>[1],
    typeof InMessage.Shared.Type
  >
>
export type ModelExtractedInputRemainsExact = Assert<
  Equal<
    Parameters<typeof extractedModelFields>[1],
    typeof InMessage.Shared.Type
  >
>
export type ExactCommandsRequirements = Assert<
  Equal<
    Update.RequirementsOf<typeof extractedCommands>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactReport = Assert<
  Equal<
    ReturnType<typeof extractedOutMessage>['outMessage'],
    typeof OutMessage.Reported.Type
  >
>
