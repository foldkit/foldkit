import { type Effect, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import type * as Block from 'foldkit/block'

import {
  ChildBinding,
  CommandsDefinition,
  Message,
  Model,
  Save,
  combined,
  commands,
  save,
  withChildCommands,
} from './commands-steps.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

const SaveCount = CommandsDefinition.makeCommand('SaveCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedSave],
})
export const saveCurrentCount = CommandsDefinition.makeCommandsStep(model => [
  SaveCount({ count: model.count }),
])
export type ModelDependentArgs = Expect<
  Equal<
    ReturnType<typeof saveCurrentCount>['commands'][number]['args'],
    Readonly<{ count: number }>
  >
>
export type ModelDependentRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof saveCurrentCount>,
    Command.HandlerOf<typeof SaveCount>
  >
>

export type ExactCommands = Expect<
  Equal<
    ReturnType<typeof save>['commands'],
    ReadonlyArray<(typeof commands)[number]>
  >
>
export type Requirements = Expect<
  Equal<Update.RequirementsOf<typeof combined>, Command.HandlerOf<typeof Save>>
>
export type ExactModel = Expect<
  Equal<Parameters<typeof save>, [model: typeof Model.Type]>
>
export type ExactMessage = Expect<
  Equal<
    Effect.Success<ReturnType<typeof save>['commands'][number]['effect']>,
    typeof Message.CompletedSave.Type
  >
>
export type PreservedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof withChildCommands>>
    >,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
// @ts-expect-error Emitted Steps retain the owning Model.
save({ count: 'invalid' })
export type NoOutMessage = Expect<
  Equal<ReturnType<typeof save>['outMessage'], undefined>
>

declare const childCommands: Parameters<typeof withChildCommands>[0]
// @ts-expect-error Emission retains graph obligations on a Command collection.
withChildCommands(childCommands)({ child: { count: 0 } })
