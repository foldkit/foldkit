import { Block, Command, Update } from 'foldkit'

import {
  Message,
  Model,
  ModelAwareContextualCounterBlock,
  ModelAwareCounterBlock,
  OutMessage,
  Save,
  contextualUpdate,
  incrementAndSave,
  modelAwareChildReport,
  modelAwareContextualChildReport,
  modelAwareContextualIncrement,
  modelAwareContextualReport,
  modelAwareContextualUpdate,
  modelAwareIncrement,
  modelAwareReport,
  modelAwareUpdate,
  setModelAwareString,
  setString,
  update,
} from './message-steps.accepted.js'
import { ChildBinding } from './record-update.accepted.js'

const model = Model.make({ count: 1 })
incrementAndSave(model, Message.RequestedIncrement({ amount: 2 }))
update(model, Message.RequestedIncrement({ amount: 2 }))
update(Message.RequestedReport({ label: 'current' }))(model)
contextualUpdate(model, Message.RequestedIncrement({ amount: 2 }))
contextualUpdate(Message.RequestedIncrement({ amount: 2 }))(model, 3, 4, 5)
setString({ value: '' }, { _tag: 'RequestedSet', value: 'next' })
// @ts-expect-error Generic producer payloads stay precise after relocation.
setString({ value: '' }, { _tag: 'RequestedSet', value: 1 })
modelAwareUpdate(model, Message.RequestedIncrement({ amount: 2 }))
modelAwareUpdate(Message.RequestedReport({ label: 'current' }))(model)
ModelAwareCounterBlock.operations.increment(model, { amount: 2 })
ModelAwareCounterBlock.operations.report(model, { label: 'current' })
modelAwareContextualUpdate(model, Message.RequestedIncrement({ amount: 2 }))
modelAwareContextualUpdate(Message.RequestedIncrement({ amount: 2 }))(
  model,
  3,
  4,
  5,
)
setModelAwareString({ value: '' }, { _tag: 'RequestedSet', value: 'next' })
// @ts-expect-error Model-aware generic payloads remain exact after relocation.
setModelAwareString({ value: '' }, { _tag: 'RequestedSet', value: 1 })
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
export type ExactRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof incrementAndSave>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactOutMessage = Expect<
  Equal<
    Exclude<ReturnType<typeof update>['outMessage'], undefined>,
    typeof OutMessage.Type
  >
>
export type ExactModelAwareRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof modelAwareIncrement>,
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
    Exclude<ReturnType<typeof modelAwareReport>['outMessage'], undefined>,
    typeof OutMessage.Type
  >
>
export type ExactModelAwareRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof modelAwareChildReport>>,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
export type ExactContextualRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof modelAwareContextualIncrement>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactContextualOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<typeof modelAwareContextualReport>['outMessage'],
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
      ReturnType<typeof modelAwareContextualChildReport>
    >,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
