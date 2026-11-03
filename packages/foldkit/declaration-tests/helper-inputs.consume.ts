import { Effect } from 'effect'
import { Command, Update } from 'foldkit'

import {
  broadInputLocalUpdate,
  defaultUpdate,
  extractedCommands,
  extractedFields,
  extractedModelCommands,
  extractedModelFields,
  extractedModelOutMessage,
  extractedOutMessage,
  extractedStep,
  fixedCommands,
  fixedOutMessage,
  messageOnlyCases,
  modelAwareCases,
} from './helper-inputs.accepted.js'
import { InMessage, Message, Model, Save } from './helper-inputs.definition.js'

const model = Model.make({ count: 0, label: '' })
const shared = InMessage.Shared({ label: 'next' })
extractedFields(model, shared)
extractedCommands(model, shared)
extractedOutMessage(model, shared)
extractedStep(model, shared)
extractedModelFields(model, shared)
extractedModelCommands(model, shared)
extractedModelOutMessage(model, shared)
fixedCommands(model)
fixedOutMessage(model)
messageOnlyCases.Shared(model, shared)
modelAwareCases.Shared(model, shared)
messageOnlyCases.RequestSet(model, InMessage.RequestSet({ count: 2 }))
defaultUpdate(model, Message.Shared({ count: 2 }))
broadInputLocalUpdate(Message.Shared({ count: 2 }))(model)

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
export type RelocatedInputIsExact = Assert<
  Equal<Parameters<typeof extractedFields>[1], typeof InMessage.Shared.Type>
>
export type RelocatedCommandsAreLocal = Assert<
  Equal<
    Effect.Success<
      ReturnType<typeof extractedCommands>['commands'][number]['effect']
    >,
    typeof Message.CompletedSave.Type
  >
>
export type RelocatedRequirementsAreExact = Assert<
  Equal<
    Update.RequirementsOf<typeof extractedCommands>,
    Command.HandlerOf<typeof Save>
  >
>
