import type * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

import {
  Choice,
  DeclarationPolicyForward,
  DirectChildBlock,
  DirectDomainBinding,
  DirectParent,
  DirectParentMessage,
  ForeignMessageBinding,
  KeyedDomainBinding,
  OptionalForeignBinding,
  Parent,
  ParentMessage,
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
type ParentModel = typeof Parent.Model.Type
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
Parent.makeComposition({ childBindings: [WrongModelBinding] })
// @ts-expect-error Emitted policy cannot return foreign Command Messages.
Parent.makeComposition({ childBindings: [ForeignMessageBinding] })
// @ts-expect-error Emitted policy cannot return undeclared parent OutMessages.
Parent.makeComposition({ childBindings: [UndeclaredOutMessageBinding] })
// @ts-expect-error Emitted union members must return parent Command Messages.
Parent.makeComposition({ childBindings: [UnionForeignBinding] })
// @ts-expect-error Emitted optional Commands must return parent Messages.
Parent.makeComposition({ childBindings: [OptionalForeignBinding] })
// @ts-expect-error Emitted policy registrations must belong to this Composition.
Parent.makeComposition({ childBindings: [RegisteredPolicyBinding] })
// @ts-expect-error Emitted forwarded OutMessages must belong to the parent.
DeclarationPolicyForward.makeComposition({
  childBindings: [WrongForwardBinding],
})

type ErasedBinding = Block.AnyBinding &
  Block.ParentBindingContract<ParentModel, typeof ParentMessage.Type, never>
const erasedWrongModelBinding: ErasedBinding = WrongModelBinding
// @ts-expect-error AnyBinding cannot erase emitted policy validation.
Parent.makeComposition({ childBindings: [erasedWrongModelBinding] })

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
  fold: (_outMessage: never) => DirectParent.step(model => ({ model })),
}
// @ts-expect-error A direct policy must accept every child OutMessage.
// oxfmt-ignore
DirectParent.bindChild(DirectChildBlock, { field: 'child', parentMessage: DirectParentMessage.GotChildMessage, outMessage: impossibleOutMessagePolicy })

const narrowKeyPolicy = {
  fold: (_key: 'Primary', _outMessage: typeof Choice.OutMessage.Type) =>
    Parent.step(model => ({ model })),
}
// @ts-expect-error A keyed shorthand policy must accept every collection key.
// oxfmt-ignore
Parent.bindChild(Choice.block, { field: 'literalChoices', key: 'kind', childField: 'choice', toParentMessage: (kind, message) => ParentMessage.GotLiteralChoiceMessage({ kind, message }), fromParentMessage: false, outMessage: narrowKeyPolicy })

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

DirectParent.makeComposition({ childBindings: [DirectDomainBinding] })
Parent.makeComposition({ childBindings: [KeyedDomainBinding] })
const retainedUnionEvidence: Block.BindingPolicyEvidence<
  typeof unionForeignMessagePolicy
> = UnionForeignBinding
void retainedUnionEvidence
