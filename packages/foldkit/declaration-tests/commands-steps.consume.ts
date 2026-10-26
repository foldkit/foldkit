import { type Effect, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import type * as Block from 'foldkit/block'

import {
  ChildBinding,
  CommandsDefinition,
  Message,
  Model,
  Save,
  combinedStep,
  commands,
  saveStep,
  withChildCommandsStep,
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
export const saveCurrentCountStep = CommandsDefinition.makeCommandsStep(
  model => [SaveCount({ count: model.count })],
)
export type ModelDependentArgs = Expect<
  Equal<
    ReturnType<typeof saveCurrentCountStep>['commands'][number]['args'],
    Readonly<{ count: number }>
  >
>
export type ModelDependentRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof saveCurrentCountStep>,
    Command.HandlerOf<typeof SaveCount>
  >
>

export type ExactCommands = Expect<
  Equal<
    ReturnType<typeof saveStep>['commands'],
    ReadonlyArray<(typeof commands)[number]>
  >
>
export type Requirements = Expect<
  Equal<
    Update.RequirementsOf<typeof combinedStep>,
    Command.HandlerOf<typeof Save>
  >
>
export type ExactModel = Expect<
  Equal<Parameters<typeof saveStep>, [model: typeof Model.Type]>
>
export type ExactMessage = Expect<
  Equal<
    Effect.Success<ReturnType<typeof saveStep>['commands'][number]['effect']>,
    typeof Message.CompletedSave.Type
  >
>
export type PreservedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof withChildCommandsStep>>
    >,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
// @ts-expect-error Emitted Steps retain the owning Model.
saveStep({ count: 'invalid' })
export type NoOutMessage = Expect<
  Equal<ReturnType<typeof saveStep>['outMessage'], undefined>
>

declare const childCommands: Parameters<typeof withChildCommandsStep>[0]
// @ts-expect-error Emission retains graph obligations on a Command collection.
withChildCommandsStep(childCommands)({ child: { count: 0 } })
