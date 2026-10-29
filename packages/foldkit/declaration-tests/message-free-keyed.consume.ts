import { Block, Update } from 'foldkit'

import {
  GeneralKeyedBinding,
  ParentBlock,
  ParentComposition,
  ParentMessage,
  ParentModel,
  initGeneralStep,
} from './message-free-keyed.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

const operation = initGeneralStep
export type ExactKey = Expect<
  Equal<
    Parameters<typeof initGeneralStep> extends [unknown, ...infer Args]
      ? Args
      : never,
    [key: string]
  >
>
export type ParentModelIsPreserved = Expect<
  Equal<
    Pick<Parameters<typeof initGeneralStep>[0], keyof typeof ParentModel.Type>,
    typeof ParentModel.Type
  >
>
// @ts-expect-error A connected initializer requires the registering graph's Model capability.
initGeneralStep(ParentModel.make({ entries: [] }), 'unregistered')
export type ExactRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof operation>>,
    Block.RequirementOfBinding<typeof GeneralKeyedBinding>
  >
>
export type SilentDispatchStaysLocal = Expect<
  Equal<typeof ParentComposition.Message.Type, typeof ParentMessage.Type>
>
export type SilentRegistrationHasNoGeneratedSchema = Expect<
  Equal<
    ReturnType<
      Block.RequirementOfBinding<
        typeof GeneralKeyedBinding
      >['__blockBindingRequirement']['generatedSchema']
    >,
    never
  >
>
void ParentModel
void ParentBlock
