import { Effect } from 'effect'
import { Runtime, type Update } from 'foldkit'

import {
  CommandsComposition,
  CommandsDefinition,
  Message,
  ParentDefinition,
  commands,
  init,
  program,
  save,
  update,
  withChildCommands,
} from './commands-steps.accepted.js'

// @ts-expect-error Command-only Steps still require attached handlers.
CommandsComposition.prepareBlock({ init, update })
// @ts-expect-error The Program still requires the handler's ordinary Store Service.
Runtime.run(program)
const other = {
  name: 'Other',
  effect: Effect.succeed({ _tag: 'CompletedOther' }),
}
// @ts-expect-error Command result Messages must match the owner.
CommandsDefinition.makeCommandsStep(() => [other])
// @ts-expect-error Command-only Steps take a producer rather than a collection.
CommandsDefinition.makeCommandsStep(commands)
// @ts-expect-error The callback must return Commands rather than an update result.
CommandsDefinition.makeCommandsStep(model => ({ model }))
// @ts-expect-error The callback receives the owning Model.
CommandsDefinition.makeCommandsStep((_model: { count: string }) => commands)
// @ts-expect-error The callback receives only the owning Model.
CommandsDefinition.makeCommandsStep((_model, _extra: string) => commands)
CommandsDefinition.makeCommandsStep(model => {
  // @ts-expect-error The contextually typed current count is a number.
  model.count.toUpperCase()
  return commands
})
// @ts-expect-error The produced Step checks its Model.
CommandsDefinition.makeCommandsStep(() => [])({ count: 'invalid' })
// @ts-expect-error The narrow helper does not take additional operation arguments.
CommandsDefinition.makeCommandsStep(() => [], 'extra')
// @ts-expect-error Compositions do not duplicate Definition-owned Step factories.
CommandsComposition.makeCommandsStep

declare const childCommands: Parameters<typeof withChildCommands>[0]
const childStep = withChildCommands(childCommands)
// @ts-expect-error Reading the Commands does not erase child registration evidence.
childStep({ child: { count: 0 } })
ParentDefinition.makeComposition().makeUpdate({
  // @ts-expect-error A Composition missing the child cannot interpret its Commands.
  RequestedSave: model => childStep(model),
  CompletedSave: ParentDefinition.makeNoopStep(),
})

declare const widenedCommands: Update.Commands<typeof Message.Type> &
  Update.RegistrationEvidence<unknown>
// @ts-expect-error Unknown registration evidence cannot be hidden in a Command collection.
CommandsDefinition.makeCommandsStep(() => widenedCommands)

declare const erasedCommands: Update.Commands<typeof Message.Type> &
  Update.RegistrationEvidence<any>
// @ts-expect-error Any registration evidence cannot be hidden in a Command producer.
CommandsDefinition.makeCommandsStep(() => erasedCommands)

const _outMessageStep: typeof save = model => ({
  model,
  commands,
  // @ts-expect-error A Command-only Step contract cannot hide an emitted OutMessage.
  outMessage: { _tag: 'Changed' },
})
