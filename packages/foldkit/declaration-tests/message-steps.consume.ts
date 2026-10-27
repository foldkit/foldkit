import { Command, Update } from 'foldkit'

import {
  Message,
  Model,
  OutMessage,
  Save,
  contextualUpdate,
  incrementAndSaveStep,
  setString,
  update,
} from './message-steps.accepted.js'

const model = Model.make({ count: 1 })
incrementAndSaveStep(model, Message.RequestedIncrement({ amount: 2 }))
update(model, Message.RequestedIncrement({ amount: 2 }))
update(Message.RequestedReport({ label: 'current' }))(model)
contextualUpdate(model, Message.RequestedIncrement({ amount: 2 }))
contextualUpdate(Message.RequestedIncrement({ amount: 2 }))(model, 3, 4, 5)
setString({ value: '' }, { _tag: 'RequestedSet', value: 'next' })
// @ts-expect-error Generic producer payloads stay precise after relocation.
setString({ value: '' }, { _tag: 'RequestedSet', value: 1 })
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
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
