import type * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

import {
  Choice,
  DeclarationPolicyForwardDefinition,
  Parent as DeclarationWrappedKeyedFieldParentDefinition,
  DirectChildBlock,
  DirectDomainBinding,
  DirectParent,
  DirectPolicyCompanionBindings,
  ForeignMessageBinding,
  KeyedDomainBinding,
  OptionalForeignBinding,
  ParentMessage,
  PlainChoicesBinding,
  PolicyCompanionBindings,
  RegisteredPolicyBinding,
  TextEntriesBinding,
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

// @ts-expect-error Emitted policy must return the parent Model.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [WrongModelBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Emitted policy cannot return foreign Command Messages.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [ForeignMessageBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Emitted policy cannot return undeclared parent OutMessages.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [UndeclaredOutMessageBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Emitted union members must return parent Command Messages.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [UnionForeignBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Emitted optional Commands must return parent Messages.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [OptionalForeignBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Emitted policy registrations must belong to this Composition.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [RegisteredPolicyBinding, ...PolicyCompanionBindings],
})
// @ts-expect-error Emitted forwarded OutMessages must belong to the parent.
DeclarationPolicyForwardDefinition.makeComposition({
  bindings: [WrongForwardBinding],
})

type ErasedBinding = Block.AnyBinding &
  Block.ParentBindingContract<ParentModel, typeof ParentMessage.Type, never>
const erasedWrongModelBinding: ErasedBinding = WrongModelBinding
// @ts-expect-error AnyBinding cannot erase emitted policy validation.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [erasedWrongModelBinding, ...PolicyCompanionBindings],
})

// @ts-expect-error Emitted inferred Command channels cannot be erased.
const inferredCommandsErased: WidenedBinding<
  ModelOnlyPolicy<typeof foreignMessagePolicy>
> = ForeignMessageBinding
// @ts-expect-error Emitted union Command channels cannot be erased.
const unionCommandsErased: WidenedBinding<
  ModelOnlyPolicy<typeof unionForeignMessagePolicy>
> = UnionForeignBinding
// @ts-expect-error Emitted optional Command channels cannot be erased.
const optionalCommandsErased: WidenedBinding<
  ModelOnlyPolicy<typeof optionalForeignMessagePolicy>
> = OptionalForeignBinding
// @ts-expect-error Emitted optional registration channels cannot be erased.
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

export type EmittedBindingPolicyAssertions = [
  UnionRequirementsAreExact,
  OptionalRequirementsAreExact,
  RegistrationIsExact,
]

const impossibleOutMessagePolicy = {
  fold: (_outMessage: never) => DirectParent.makeStep(model => ({ model })),
}
// @ts-expect-error A direct policy must accept every child OutMessage.
// oxfmt-ignore
DirectParent.makeRequiredFieldBinding(DirectChildBlock, { field: 'child', }).withOutMessagePolicy(impossibleOutMessagePolicy)

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

DirectParent.makeComposition({
  bindings: [DirectDomainBinding, ...DirectPolicyCompanionBindings],
})
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [KeyedDomainBinding, PlainChoicesBinding, TextEntriesBinding],
})
const retainedUnionEvidence: Block.BindingPolicyEvidence<
  typeof unionForeignMessagePolicy
> = UnionForeignBinding
void retainedUnionEvidence
