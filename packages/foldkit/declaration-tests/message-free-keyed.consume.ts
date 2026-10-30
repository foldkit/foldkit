import { Block, Update } from 'foldkit'

import {
  DirectFieldBinding,
  FieldParentComposition,
  FieldParentModel,
  GeneralKeyedBinding,
  OptionalFieldBinding,
  ParentBlock,
  ParentComposition,
  ParentMessage,
  ParentModel,
  WrappedFieldBinding,
  initFields,
  initGeneral,
} from './message-free-keyed.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

const operation = initGeneral
export type ExactKey = Expect<
  Equal<
    Parameters<typeof initGeneral> extends [unknown, ...infer Args]
      ? Args
      : never,
    [key: string]
  >
>
export type ParentModelIsPreserved = Expect<
  Equal<
    Pick<Parameters<typeof initGeneral>[0], keyof typeof ParentModel.Type>,
    typeof ParentModel.Type
  >
>
// @ts-expect-error A connected initializer requires the registering graph's Model capability.
initGeneral(ParentModel.make({ entries: [] }), 'unregistered')
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
export type KeyedFieldMessagesStayNever = Expect<
  Equal<
    | Parameters<typeof DirectFieldBinding.fold>[2]
    | Parameters<typeof WrappedFieldBinding.fold>[2]
    | Parameters<typeof OptionalFieldBinding.fold>[2],
    never
  >
>
export type KeyedFieldCompositionStaysRouteless = Expect<
  Equal<typeof FieldParentComposition.Message.Type, never>
>
export type KeyedFieldInitializationPreservesModel = Expect<
  Equal<ReturnType<typeof initFields>['model'], FieldParentModel>
>
void ParentModel
void ParentBlock
