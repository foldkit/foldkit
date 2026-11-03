import { Block, type Command, Runtime, Update } from 'foldkit'

import {
  ChildBinding,
  type DetailService,
  type DraftService,
  PolicyOutMessage,
  type PolicyOutStep,
  type PolicyStep,
  ReadValue,
  type Store,
  applyCombinedPolicy,
  applyPolicy,
  completedProgram,
  connected,
  connectedProgram,
  enteredOut,
  exitedOut,
  selectConnected,
} from './route-step-program.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Expect<Value extends true> = Value
type RequirementsOfProgram<ProgramValue> =
  ProgramValue extends Readonly<{
    '~foldkit/ProgramProvision'?: Readonly<{
      Requirements: (requirements: infer Requirements) => unknown
    }>
  }>
    ? Requirements
    : never

export type ExactCombinedStep = Expect<
  Equal<typeof applyCombinedPolicy, PolicyStep>
>
export type ExactEnteredStep = Expect<Equal<typeof enteredOut, PolicyOutStep>>
export type ExactExitedStep = Expect<Equal<typeof exitedOut, PolicyOutStep>>

export type ExactPolicyRequirements = Expect<
  Equal<Update.RequirementsOf<typeof applyPolicy>, DetailService | DraftService>
>
export type ExactCombinedRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof applyCombinedPolicy>,
    DetailService | DraftService
  >
>
export type ExactEnteredOutMessage = Expect<
  Equal<
    ReturnType<typeof enteredOut>['outMessage'],
    typeof PolicyOutMessage.Type | undefined
  >
>
export type ExactExitedOutMessage = Expect<
  Equal<
    ReturnType<typeof exitedOut>['outMessage'],
    typeof PolicyOutMessage.Type | undefined
  >
>
export type ExactConnectedRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof connected>,
    Block.Scoped<'child', Command.HandlerOf<typeof ReadValue>>
  >
>
export type ExactSelectedConnectedRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof selectConnected>>,
    Block.Scoped<'child', Command.HandlerOf<typeof ReadValue>>
  >
>
export type ExactConnectedEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof connected>>,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
export type ExactProgramRequirements = Expect<
  Equal<RequirementsOfProgram<typeof connectedProgram>, Store>
>
export type ExactCompletedProgramRequirements = Expect<
  Equal<RequirementsOfProgram<typeof completedProgram>, never>
>

Runtime.run(completedProgram)
