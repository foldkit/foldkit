import { Schema } from 'effect'
import { Block as BlockValue, Message } from 'foldkit'
import type * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

import {
  ChildBlock as DirectChildBlock,
  DeclarationParentOwnedParentDefinition as DirectParent,
  ParentMessage as DirectParentMessage,
  KeyedChildBinding,
  KeyedChildWithoutOutMessageBinding,
  OptionalChildBinding,
  TaggedChildBinding,
} from './parent-owned-binding.accepted.js'
import {
  Choice,
  ChoiceId,
  DeclarationWrappedKeyedFieldParentDefinition,
  LiteralChoicesBinding,
  ParentMessage,
  PlainChoicesBinding,
  TextEntriesBinding,
} from './wrapped-keyed-field.accepted.js'

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
type ModelOnlyReturn = Readonly<{ model: ParentModel }>

const wrongModelPolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (_model: ParentModel) => ({
      model: Choice.block.Model.make({ value: 'One' }),
    }),
}
export const WrongModelBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeCustomKeyedBinding(
    Choice.block,
    {
      readAll: model => model.choices,
      key: item => item.id,
      keySchema: ChoiceId,
      read: item => item.choice,
      writeAt: model => model,
    },
  ).withOutMessagePolicy(wrongModelPolicy)

export const foreignMessagePolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (model: ParentModel) => ({
      model,
      commands: [Choice.ReadChoice()],
    }),
}
export const ForeignMessageBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeCustomKeyedBinding(
    Choice.block,
    {
      readAll: model => model.choices,
      key: item => item.id,
      keySchema: ChoiceId,
      read: item => item.choice,
      writeAt: model => model,
    },
  ).withOutMessagePolicy(foreignMessagePolicy)

const undeclaredOutMessagePolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (model: ParentModel) => ({
      model,
      outMessage: Choice.OutMessage.SelectedValue({ value: 'One' }),
    }),
}
export const UndeclaredOutMessageBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeCustomKeyedBinding(
    Choice.block,
    {
      readAll: model => model.choices,
      key: item => item.id,
      keySchema: ChoiceId,
      read: item => item.choice,
      writeAt: model => model,
    },
  ).withOutMessagePolicy(undeclaredOutMessagePolicy)

const ForeignMessage = Message.defineMessageUnion({ CompletedForeign: {} })
declare const foreignCommand: Command.Command<
  typeof ForeignMessage.Type,
  never,
  never
>
type UnionForeignReturn =
  | ModelOnlyReturn
  | Readonly<{
      model: ParentModel
      commands: Update.Commands<typeof ForeignMessage.Type>
    }>
export const unionForeignMessagePolicy: Readonly<{
  fold: (
    key: typeof ChoiceId.Type,
    outMessage: typeof Choice.OutMessage.Type,
  ) => (model: ParentModel) => UnionForeignReturn
}> = {
  fold: (_key, _outMessage) => model => ({
    model,
    commands: [foreignCommand],
  }),
}
export const UnionForeignBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeCustomKeyedBinding(
    Choice.block,
    {
      readAll: model => model.choices,
      key: item => item.id,
      keySchema: ChoiceId,
      read: item => item.choice,
      writeAt: model => model,
    },
  ).withOutMessagePolicy(unionForeignMessagePolicy)

export const optionalForeignMessagePolicy: Readonly<{
  fold: (
    key: typeof ChoiceId.Type,
    outMessage: typeof Choice.OutMessage.Type,
  ) => Update.Step<
    ParentModel,
    typeof Choice.Message.Type,
    Command.HandlerOf<typeof Choice.ReadChoice>
  >
}> = {
  fold: (_key, _outMessage) => model => ({
    model,
    commands: [Choice.ReadChoice()],
  }),
}
export const OptionalForeignBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeCustomKeyedBinding(
    Choice.block,
    {
      readAll: model => model.choices,
      key: item => item.id,
      keySchema: ChoiceId,
      read: item => item.choice,
      writeAt: model => model,
    },
  ).withOutMessagePolicy(optionalForeignMessagePolicy)

type RegisteredReturn = ModelOnlyReturn &
  Update.RegistrationEvidence<'SiblingBinding'>
export const registeredPolicy: Readonly<{
  fold: (
    key: typeof ChoiceId.Type,
    outMessage: typeof Choice.OutMessage.Type,
  ) => (model: ParentModel) => ModelOnlyReturn | RegisteredReturn
}> = {
  fold: (_key, _outMessage) => model => ({ model }),
}
export const RegisteredPolicyBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeCustomKeyedBinding(
    Choice.block,
    {
      readAll: model => model.choices,
      key: item => item.id,
      keySchema: ChoiceId,
      read: item => item.choice,
      writeAt: model => model,
    },
  ).withOutMessagePolicy(registeredPolicy)

const ForwardOutMessage = Message.defineMessageUnion({
  ForwardedChoice: { value: Schema.String },
})
export const DeclarationPolicyForwardDefinition = BlockValue.makeDefinition(
  'DeclarationPolicyForward',
  {
    Model: DeclarationWrappedKeyedFieldParentDefinition.Model,
    Message: Schema.Never,
    OutMessage: ForwardOutMessage,
  },
)
const wrongForwardPolicy = {
  forward: (
    _key: typeof ChoiceId.Type,
    outMessage: typeof Choice.OutMessage.Type,
  ) => outMessage,
}
export const WrongForwardBinding =
  DeclarationPolicyForwardDefinition.makeCustomKeyedBinding(Choice.block, {
    readAll: model => model.choices,
    key: item => item.id,
    keySchema: ChoiceId,
    read: item => item.choice,
    writeAt: model => model,
  }).withOutMessagePolicy(wrongForwardPolicy)

export const PolicyCompanionBindings = [
  LiteralChoicesBinding,
  TextEntriesBinding,
] as const
export const DirectPolicyCompanionBindings = [
  OptionalChildBinding,
  TaggedChildBinding,
  KeyedChildBinding,
  KeyedChildWithoutOutMessageBinding,
] as const

export const PureComposition =
  DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
    bindings: [PlainChoicesBinding, ...PolicyCompanionBindings],
  })

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

export type BindingPolicyAssertions = [
  UnionRequirementsAreExact,
  OptionalRequirementsAreExact,
  RegistrationIsExact,
]

export {
  Choice,
  DeclarationWrappedKeyedFieldParentDefinition as Parent,
  ParentMessage,
}

export const DirectDomainBinding = DirectParent.makeRequiredFieldBinding(
  DirectChildBlock,
  {
    field: 'child',
  },
).withOutMessagePolicy({
  fold: (_outMessage: typeof DirectChildBlock.OutMessage.Type) =>
    DirectParent.makeStep(model => ({ model })),
})
export const DirectDomainComposition = DirectParent.makeComposition({
  bindings: [DirectDomainBinding, ...DirectPolicyCompanionBindings],
})

export const KeyedDomainBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeKeyedArrayBinding(
    Choice.block,
    {
      field: 'literalChoices',
      key: 'kind',
      childField: 'choice',
    },
  ).withOutMessagePolicy({
    fold: (
      _key: 'Primary' | 'Secondary',
      _outMessage: typeof Choice.OutMessage.Type,
    ) =>
      DeclarationWrappedKeyedFieldParentDefinition.makeStep(model => ({
        model,
      })),
  })
export const KeyedDomainComposition =
  DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
    bindings: [KeyedDomainBinding, PlainChoicesBinding, TextEntriesBinding],
  })

const retainedUnionEvidence: Block.BindingPolicyEvidence<
  typeof unionForeignMessagePolicy
> = UnionForeignBinding
void retainedUnionEvidence

export {
  DirectChildBlock,
  DirectParent,
  DirectParentMessage,
  PlainChoicesBinding,
  TextEntriesBinding,
}
