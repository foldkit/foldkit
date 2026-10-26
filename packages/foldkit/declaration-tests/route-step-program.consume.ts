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
  combinedPolicyStep,
  completedProgram,
  connectedProgram,
  connectedStep,
  enteredOutStep,
  exitedOutStep,
  policyStep,
  selectConnectedStep,
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
  Equal<typeof combinedPolicyStep, PolicyStep>
>
export type ExactEnteredStep = Expect<
  Equal<typeof enteredOutStep, PolicyOutStep>
>
export type ExactExitedStep = Expect<Equal<typeof exitedOutStep, PolicyOutStep>>

export type ExactPolicyRequirements = Expect<
  Equal<Update.RequirementsOf<typeof policyStep>, DetailService | DraftService>
>
export type ExactCombinedRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof combinedPolicyStep>,
    DetailService | DraftService
  >
>
export type ExactEnteredOutMessage = Expect<
  Equal<
    ReturnType<typeof enteredOutStep>['outMessage'],
    typeof PolicyOutMessage.Type | undefined
  >
>
export type ExactExitedOutMessage = Expect<
  Equal<
    ReturnType<typeof exitedOutStep>['outMessage'],
    typeof PolicyOutMessage.Type | undefined
  >
>
export type ExactConnectedRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof connectedStep>,
    Block.Scoped<'child', Command.HandlerOf<typeof ReadValue>>
  >
>
export type ExactSelectedConnectedRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof selectConnectedStep>>,
    Block.Scoped<'child', Command.HandlerOf<typeof ReadValue>>
  >
>
export type ExactConnectedEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof connectedStep>>,
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
