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
CommandsComposition.assembleBlock({ init, update })
// @ts-expect-error The Program still requires the handler's ordinary Store Service.
Runtime.run(program)
const other = {
  name: 'Other',
  effect: Effect.succeed({ _tag: 'CompletedOther' }),
}
// @ts-expect-error Command result Messages must match the owner.
CommandsDefinition.makeCommandsStep([other])
// @ts-expect-error Command-only Steps take a collection rather than a callback.
CommandsDefinition.makeCommandsStep(model => ({ model }))
// @ts-expect-error The produced Step checks its Model.
CommandsDefinition.makeCommandsStep([])({ count: 'invalid' })
// @ts-expect-error The narrow helper does not take additional operation arguments.
CommandsDefinition.makeCommandsStep([], 'extra')
// @ts-expect-error Compositions do not duplicate Definition-owned Step factories.
CommandsComposition.makeCommandsStep

declare const childCommands: Parameters<typeof withChildCommands>[0]
const childStep = withChildCommands(childCommands)
// @ts-expect-error Reading the Commands does not erase child registration evidence.
childStep({ child: { count: 0 } })
// @ts-expect-error A Composition missing the child cannot interpret its Commands.
ParentDefinition.makeComposition().makeUpdate(model => childStep(model))

declare const widenedCommands: Update.Commands<typeof Message.Type> &
  Update.RegistrationEvidence<unknown>
// @ts-expect-error Unknown registration evidence cannot be hidden in a Command collection.
CommandsDefinition.makeCommandsStep(widenedCommands)

const _outMessageStep: typeof save = model => ({
  model,
  commands,
  // @ts-expect-error A Command-only Step contract cannot hide an emitted OutMessage.
  outMessage: { _tag: 'Changed' },
})
