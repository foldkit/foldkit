import {
  extractedCommands,
  extractedFields,
  extractedOutMessage,
  extractedStep,
  modelAwareCases,
} from './helper-inputs.accepted.js'
import {
  InMessage,
  Message,
  Model,
  SendInput,
  makeCommandsStep,
  makeFieldsStep,
  makeOutMessageStep,
  makeStep,
} from './helper-inputs.definition.js'

const model = Model.make({ count: 0, label: '' })
// @ts-expect-error An input-only Message cannot be emitted by a Command.
makeCommandsStep(() => [SendInput()])
// @ts-expect-error A Message-only producer also emits only local Messages.
makeCommandsStep.fromMessage((_message: typeof InMessage.RequestClose.Type) => [
  SendInput(),
])
// @ts-expect-error General Steps must not emit an InMessage from a Command.
makeStep(model => ({ model, commands: [SendInput()] }))
// @ts-expect-error Message-only general Steps keep local Command outputs.
makeStep.fromMessage(() => ({ model, commands: [SendInput()] }))
// @ts-expect-error A deferred focused producer retains the same output constraint.
makeStep.fromMessage(() => makeCommandsStep(() => [SendInput()]))
// @ts-expect-error The overlapping local tag does not carry the input payload.
extractedFields(model, Message.Shared({ count: 1 }))
// @ts-expect-error Command producers preserve the selected complete input variant.
extractedCommands(model, Message.Shared({ count: 1 }))
// @ts-expect-error OutMessage producers preserve the selected complete input variant.
extractedOutMessage(model, Message.Shared({ count: 1 }))
// @ts-expect-error General producers preserve the selected complete input variant.
extractedStep(model, Message.Shared({ count: 1 }))
// @ts-expect-error Model-aware contextual input remains the exact input variant.
modelAwareCases.Shared(model, Message.Shared({ count: 1 }))
extractedFields(
  // @ts-expect-error The helper retains its owning Model.
  { count: 'wrong', label: '' },
  InMessage.Shared({ label: 'next' }),
)

const refinedShared = (
  _message: typeof InMessage.Shared.Type & { label: 'fixed' },
) => ({ label: () => 'fixed' })
// @ts-expect-error Selecting one same-tag union member cannot validate a narrowed payload.
makeFieldsStep.fromMessage(refinedShared)
// @ts-expect-error A Model-aware callback must accept the complete selected variant.
makeFieldsStep(
  (_model, _message: typeof InMessage.Shared.Type & { label: 'fixed' }) => ({
    label: () => 'fixed',
  }),
)
// @ts-expect-error Command inputs cannot require a narrower input payload.
makeCommandsStep.fromMessage(
  (_message: typeof InMessage.Shared.Type & { label: 'fixed' }) => [],
)
// @ts-expect-error OutMessage inputs cannot require a narrower input payload.
makeOutMessageStep.fromMessage(
  (_message: typeof InMessage.Shared.Type & { label: 'fixed' }) => ({
    _tag: 'Closed',
  }),
)
// @ts-expect-error General Step inputs cannot require a narrower input payload.
makeStep.fromMessage(
  (_message: typeof InMessage.Shared.Type & { label: 'fixed' }) =>
    (model: Model) => ({
      model,
    }),
)
// @ts-expect-error Erased inputs cannot select an owning input variant.
makeFieldsStep.fromMessage((_message: any) => ({ label: () => 'next' }))
