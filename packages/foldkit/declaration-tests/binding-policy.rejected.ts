import type * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

import {
  Choice,
  DeclarationPolicyForwardDefinition,
  Parent as DeclarationWrappedKeyedFieldParentDefinition,
  DirectChildBlock,
  DirectParent,
  ForeignMessageBinding,
  OptionalForeignBinding,
  ParentMessage,
  PolicyCompanionBindings,
  RegisteredPolicyBinding,
  UndeclaredOutMessageBinding,
  UnionForeignBinding,
  WrongForwardBinding,
  WrongModelBinding,
  foreignMessagePolicy,
  optionalForeignMessagePolicy,
  registeredPolicy,
  unionForeignMessagePolicy,
} from './binding-policy.accepted.js'

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
type ParentModel =
  typeof DeclarationWrappedKeyedFieldParentDefinition.Model.Type
type ModelOnlyPolicy<
  Policy extends { fold: (...args: ReadonlyArray<never>) => unknown },
> = Readonly<{
  fold: (
    ...args: Parameters<Policy['fold']>
  ) => (model: ParentModel) => Readonly<{ model: ParentModel }>
}>
type WidenedBinding<Policy> = Block.AnyBinding &
  Block.ParentBindingContract<ParentModel, typeof ParentMessage.Type, never> &
  Block.BindingPolicyEvidence<Policy>

// @ts-expect-error A policy must return the parent Model.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [WrongModelBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error A policy cannot return foreign Command Messages.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [ForeignMessageBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error A policy cannot return undeclared parent OutMessages.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [UndeclaredOutMessageBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Every union member must return parent Command Messages.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [UnionForeignBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Optional Commands must return parent Messages.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [OptionalForeignBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Policy registration evidence must belong to this Composition.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [RegisteredPolicyBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Forwarded OutMessages must belong to the parent.
DeclarationPolicyForwardDefinition.makeComposition({
  bindings: [WrongForwardBinding],
})

type ErasedBinding = Block.AnyBinding &
  Block.ParentBindingContract<ParentModel, typeof ParentMessage.Type, never>
const erasedWrongModelBinding: ErasedBinding = WrongModelBinding
// @ts-expect-error AnyBinding cannot erase deferred policy validation.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [erasedWrongModelBinding, ...PolicyCompanionBindings],
})

// @ts-expect-error Inferred Command channels cannot be erased after binding.
const inferredCommandsErased: WidenedBinding<
  ModelOnlyPolicy<typeof foreignMessagePolicy>
> = ForeignMessageBinding
// @ts-expect-error Union Command channels cannot be erased after binding.
const unionCommandsErased: WidenedBinding<
  ModelOnlyPolicy<typeof unionForeignMessagePolicy>
> = UnionForeignBinding
// @ts-expect-error Optional Command channels cannot be erased after binding.
const optionalCommandsErased: WidenedBinding<
  ModelOnlyPolicy<typeof optionalForeignMessagePolicy>
> = OptionalForeignBinding
// @ts-expect-error Optional registration channels cannot be erased after binding.
const registrationErased: WidenedBinding<
  ModelOnlyPolicy<typeof registeredPolicy>
> = RegisteredPolicyBinding
void [
  inferredCommandsErased,
  unionCommandsErased,
  optionalCommandsErased,
  registrationErased,
]

type UnionRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof unionForeignMessagePolicy.fold>>,
    never
  >
>
type OptionalRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof optionalForeignMessagePolicy.fold>>,
    Command.HandlerOf<typeof Choice.ReadChoice>
  >
>
type RegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof registeredPolicy.fold>>
    >,
    'SiblingBinding'
  >
>

export type RejectedBindingPolicyAssertions = [
  UnionRequirementsAreExact,
  OptionalRequirementsAreExact,
  RegistrationIsExact,
]

const impossibleOutMessagePolicy = {
  fold: (_outMessage: never) => DirectParent.makeStep(model => ({ model })),
}
const ImpossiblePolicyBinding = DirectParent.makeRequiredFieldBinding(
  DirectChildBlock,
  {
    field: 'child',
  },
)
// @ts-expect-error A direct policy must accept every child OutMessage.
ImpossiblePolicyBinding.withOutMessagePolicy(impossibleOutMessagePolicy)

const narrowKeyPolicy = {
  fold: (_key: 'Primary', _outMessage: typeof Choice.OutMessage.Type) =>
    DeclarationWrappedKeyedFieldParentDefinition.makeStep(model => ({ model })),
}
const NarrowKeyPolicyBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeKeyedArrayBinding(
    Choice.block,
    {
      field: 'literalChoices',
      key: 'kind',
      childField: 'choice',
    },
  )
// @ts-expect-error A keyed shorthand policy must accept every collection key.
NarrowKeyPolicyBinding.withOutMessagePolicy(narrowKeyPolicy)

type UnionWithEmptyCommands =
  | Readonly<{ model: ParentModel }>
  | Readonly<{ model: ParentModel; commands: ReadonlyArray<never> }>
type EmptyUnionPolicy = Readonly<{
  fold: (
    ...args: Parameters<typeof unionForeignMessagePolicy.fold>
  ) => (model: ParentModel) => UnionWithEmptyCommands
}>
// @ts-expect-error A Command channel present in one union branch cannot be erased.
const unionFieldErased: Block.BindingPolicyEvidence<EmptyUnionPolicy> =
  UnionForeignBinding
void unionFieldErased
