import { Layer, Option } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ChildBlock,
  ChildClock,
  DeclarationParentOwnedParent,
  DirectChildBinding,
  ForwardingChildBinding,
  InlineKeyedChildWithoutOutMessageBinding,
  KeyedChildBinding,
  KeyedChildWithoutOutMessageBinding,
  OptionalChildBinding,
  ParentMessage,
  ParentOutMessage,
  PlainChildBlock,
  ReadChildValue,
  TaggedChildBinding,
  directChildInspection,
  genericKeyedBinding,
  genericKeyedInspection,
} from './parent-owned-binding.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

type ParentModel = typeof DeclarationParentOwnedParent.Model.Type
type ChildMessage = typeof ChildBlock.Message.Type
type NamedEntry = Readonly<{
  id: string
  child: typeof PlainChildBlock.Model.Type
}>
type ChildEntry = Readonly<{
  id: number
  child: typeof ChildBlock.Model.Type
}>

type EmittedChildPolicy = Block.OutMessagePolicy<
  typeof DeclarationParentOwnedParent.Model.Type,
  typeof ChildBlock.Message.Type,
  typeof DeclarationParentOwnedParent.Message.Type,
  typeof ChildBlock.OutMessage.Type
>
type EmittedChildConfig = Block.BindingConfig<
  typeof ChildBlock,
  typeof DeclarationParentOwnedParent.Model.Type,
  typeof DeclarationParentOwnedParent.Message.Type,
  'emittedChild',
  EmittedChildPolicy
>
type EmittedPlainChildConfig = Block.BindingConfig<
  typeof PlainChildBlock,
  typeof DeclarationParentOwnedParent.Model.Type,
  typeof DeclarationParentOwnedParent.Message.Type,
  'emittedPlainChild'
>
const emittedChildPolicy: EmittedChildPolicy = {
  fold: () => model => ({ model }),
}
const acceptedEmittedChildConfig: EmittedChildConfig = {
  placement: 'emittedChild',
  read: model => Option.some(model.child),
  write: model => model,
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
  fromParentMessage: false,
  outMessage: emittedChildPolicy,
}
const acceptedEmittedPlainChildConfig: EmittedPlainChildConfig = {
  placement: 'emittedPlainChild',
  read: model => Option.some(model.child),
  write: model => model,
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
  fromParentMessage: false,
}
// @ts-expect-error Emitted OutMessage children require an OutMessage policy.
const missingEmittedChildPolicy: EmittedChildConfig = {
  placement: 'emittedChild',
  read: model => Option.some(model.child),
  write: model => model,
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
  fromParentMessage: false,
}
const forbiddenEmittedPlainChildPolicy: EmittedPlainChildConfig = {
  placement: 'emittedPlainChild',
  read: model => Option.some(model.child),
  write: model => model,
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
  fromParentMessage: false,
  // @ts-expect-error Emitted children without OutMessages forbid a policy.
  outMessage: emittedChildPolicy,
}
// @ts-expect-error An absent emitted OutMessage policy must be omitted.
const undefinedEmittedPlainChildPolicy: EmittedPlainChildConfig = {
  placement: 'emittedPlainChild',
  read: model => Option.some(model.child),
  write: model => model,
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
  fromParentMessage: false,
  outMessage: undefined,
}

void acceptedEmittedChildConfig
void acceptedEmittedPlainChildConfig
void missingEmittedChildPolicy
void forbiddenEmittedPlainChildPolicy
void undefinedEmittedPlainChildPolicy

export type DirectParentModel = Expect<
  Equal<
    Parameters<typeof DirectChildBinding.fold>[0],
    ParentModel &
      Update.GraphCapability<
        ParentModel,
        Block.BindingRequirement<'child', typeof ChildBlock>
      >
  >
>
export type DirectChildMessage = Expect<
  Equal<Parameters<typeof DirectChildBinding.fold>[1], ChildMessage>
>
export type OptionalParentModel = Expect<
  Equal<
    Parameters<typeof OptionalChildBinding.fold>[0],
    ParentModel &
      Update.GraphCapability<
        ParentModel,
        Block.BindingRequirement<'optionalChild', typeof ChildBlock>
      >
  >
>
export type TaggedParentModel = Expect<
  Equal<
    Parameters<typeof TaggedChildBinding.fold>[0],
    ParentModel &
      Update.GraphCapability<
        ParentModel,
        Block.BindingRequirement<'taggedChild', typeof ChildBlock>
      >
  >
>
export type KeyedKey = Expect<
  Equal<Parameters<typeof KeyedChildBinding.fold>[1], number>
>
export type KeyedPlacement = Expect<
  Equal<typeof KeyedChildBinding.placement, 'entries'>
>
export type KeyedChildMessage = Expect<
  Equal<Parameters<typeof KeyedChildBinding.fold>[2], ChildMessage>
>
export type KeyedWithoutOutMessageKey = Expect<
  Equal<Parameters<typeof KeyedChildWithoutOutMessageBinding.fold>[1], string>
>
export type KeyedWithoutOutMessageChildMessage = Expect<
  Equal<
    Parameters<typeof KeyedChildWithoutOutMessageBinding.fold>[2],
    ChildMessage
  >
>
export type InlineKeyedWithoutOutMessageKey = Expect<
  Equal<
    Parameters<typeof InlineKeyedChildWithoutOutMessageBinding.fold>[1],
    string
  >
>

const wrongEmittedSubscriptionKey = (
  _model: typeof DeclarationParentOwnedParent.Model.Type,
  _id: number,
) => true
type EmittedNamedKeyedConfig = Block.KeyedBindingConfig<
  typeof PlainChildBlock,
  typeof DeclarationParentOwnedParent.Model.Type,
  typeof DeclarationParentOwnedParent.Message.Type,
  NamedEntry,
  string,
  'emittedNamedEntries'
>
const acceptedEmittedNamedKeyedConfig: EmittedNamedKeyedConfig = {
  placement: 'emittedNamedEntries',
  readAll: model => model.namedEntries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (id, message) =>
    ParentMessage.GotNamedEntryMessage({ id, message }),
  fromParentMessage: false,
}
const emittedNamedKeyedConfig: EmittedNamedKeyedConfig = {
  placement: 'emittedNamedEntries',
  readAll: model => model.namedEntries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (id, message) =>
    ParentMessage.GotNamedEntryMessage({ id, message }),
  fromParentMessage: false,
  // @ts-expect-error Emitted keyed Subscription gates preserve the exact string key.
  subscriptions: { when: wrongEmittedSubscriptionKey },
}

type EmittedKeyedChildPolicy = Block.KeyedOutMessagePolicy<
  typeof DeclarationParentOwnedParent.Model.Type,
  typeof ChildBlock.Message.Type,
  typeof DeclarationParentOwnedParent.Message.Type,
  typeof ChildBlock.OutMessage.Type,
  number
>
type EmittedKeyedChildConfig = Block.KeyedBindingConfig<
  typeof ChildBlock,
  typeof DeclarationParentOwnedParent.Model.Type,
  typeof DeclarationParentOwnedParent.Message.Type,
  ChildEntry,
  number,
  'emittedEntries',
  EmittedKeyedChildPolicy
>
const emittedKeyedChildPolicy: EmittedKeyedChildPolicy = {
  fold: () => model => ({ model }),
}
const acceptedEmittedKeyedChildConfig: EmittedKeyedChildConfig = {
  placement: 'emittedEntries',
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (id, message) =>
    ParentMessage.GotEntryMessage({ id, message }),
  fromParentMessage: false,
  outMessage: emittedKeyedChildPolicy,
}
// @ts-expect-error Emitted keyed OutMessage children require a policy.
const missingEmittedKeyedChildPolicy: EmittedKeyedChildConfig = {
  placement: 'emittedEntries',
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (id, message) =>
    ParentMessage.GotEntryMessage({ id, message }),
  fromParentMessage: false,
}
const forbiddenEmittedPlainKeyedPolicy: EmittedNamedKeyedConfig = {
  placement: 'emittedNamedEntries',
  readAll: model => model.namedEntries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (id, message) =>
    ParentMessage.GotNamedEntryMessage({ id, message }),
  fromParentMessage: false,
  // @ts-expect-error Emitted keyed children without OutMessages forbid a policy.
  outMessage: emittedKeyedChildPolicy,
}
// @ts-expect-error An absent emitted keyed OutMessage policy must be omitted.
const undefinedEmittedPlainKeyedPolicy: EmittedNamedKeyedConfig = {
  placement: 'emittedNamedEntries',
  readAll: model => model.namedEntries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  toParentMessage: (id, message) =>
    ParentMessage.GotNamedEntryMessage({ id, message }),
  fromParentMessage: false,
  outMessage: undefined,
}

void acceptedEmittedKeyedChildConfig
void acceptedEmittedNamedKeyedConfig
void missingEmittedKeyedChildPolicy
void forbiddenEmittedPlainKeyedPolicy
void undefinedEmittedPlainKeyedPolicy

DeclarationParentOwnedParent.bindChild(PlainChildBlock, emittedNamedKeyedConfig)
DeclarationParentOwnedParent.bindChild(
  PlainChildBlock,
  acceptedEmittedNamedKeyedConfig,
)
export type DirectRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof DirectChildBinding.fold>>,
    Block.BindingRequirement<'child', typeof ChildBlock>
  >
>
export type DirectRefreshRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof DirectChildBinding.refresh>>,
    Block.Scoped<'child', Command.HandlerOf<typeof ReadChildValue>>
  >
>
export type DirectRefreshRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof DirectChildBinding.refresh>>
    >,
    Block.BindingRequirement<'child', typeof ChildBlock>
  >
>
export type DirectInspectionServices = Expect<
  Equal<Layer.Services<typeof directChildInspection.EffectsLayer>, ChildClock>
>
export type DirectInspectionError = Expect<
  Equal<
    Layer.Error<typeof directChildInspection.EffectsLayer>,
    'HandlerUnavailable'
  >
>
export type ForwardedOutMessage = Expect<
  Equal<
    ReturnType<ReturnType<typeof ForwardingChildBinding.select>>,
    Update.ResultRecipe<
      ParentModel,
      typeof ParentMessage.Type,
      typeof ParentOutMessage.Type,
      never,
      Block.BindingRequirement<'forwardingChild', typeof ChildBlock>
    >
  >
>

export type GenericKeyedKey = Expect<
  Equal<
    Parameters<typeof genericKeyedBinding.ChildBinding.fold>[1],
    'first' | 'second'
  >
>
export type GenericKeyedOperationKey = Expect<
  Equal<
    Parameters<typeof genericKeyedBinding.ChildBinding.refresh>[0],
    'first' | 'second'
  >
>
export type GenericKeyedPayload = Expect<
  Equal<
    (typeof genericKeyedBinding.Model.Type)['entries'][number]['payload'],
    'One' | 'Two'
  >
>
export type GenericKeyedPolicyRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      ReturnType<typeof genericKeyedBinding.ChildBinding.select>
    >,
    Block.Scoped<
      'DeclarationParentOwnedChild',
      Command.HandlerOf<typeof ReadChildValue>
    >
  >
>
export type GenericKeyedInspectionServices = Expect<
  Equal<Layer.Services<typeof genericKeyedInspection.EffectsLayer>, ChildClock>
>
export type GenericKeyedInspectionError = Expect<
  Equal<
    Layer.Error<typeof genericKeyedInspection.EffectsLayer>,
    'HandlerUnavailable'
  >
>
// @ts-expect-error A broad OutMessage policy input must not widen the inferred key.
genericKeyedBinding.ChildBinding.refresh('third')
// @ts-expect-error Keyed exposed operations require the exact key argument.
genericKeyedBinding.ChildBinding.refresh(1)

const concreteEmittedKeyedConfig = {
  ...acceptedEmittedKeyedChildConfig,
  outMessage: { fold: () => (model: ParentModel) => ({ model }) },
}
DeclarationParentOwnedParent.bindChild(ChildBlock, concreteEmittedKeyedConfig)
const emittedKeyedConfigWithExtraField = {
  ...concreteEmittedKeyedConfig,
  unexpected: true,
}
// @ts-expect-error Capturing emitted keyed policies must retain excess-field rejection.
DeclarationParentOwnedParent.bindChild(
  ChildBlock,
  emittedKeyedConfigWithExtraField,
)

const schemaFreeEmittedRoutedConfig: EmittedNamedKeyedConfig = {
  ...acceptedEmittedNamedKeyedConfig,
  // @ts-expect-error Emitted manual config aliases cannot erase an incoming route's proof.
  fromParentMessage: {
    parentMessage: ParentMessage.GotNamedEntryMessage,
    args: () => Option.none(),
  },
}
void schemaFreeEmittedRoutedConfig

declare const optionalEmittedPolicyConfig: Omit<
  typeof acceptedEmittedKeyedChildConfig,
  'outMessage'
> &
  Readonly<{ outMessage?: typeof acceptedEmittedKeyedChildConfig.outMessage }>
declare const absentEmittedPolicyConfig: Omit<
  typeof acceptedEmittedKeyedChildConfig,
  'outMessage'
> &
  Readonly<{ outMessage?: never }>
// @ts-expect-error An optional declared policy cannot establish required emitted policy presence.
DeclarationParentOwnedParent.bindChild(ChildBlock, optionalEmittedPolicyConfig)
// @ts-expect-error An optional never property cannot establish emitted policy presence.
DeclarationParentOwnedParent.bindChild(ChildBlock, absentEmittedPolicyConfig)
const aliasedPlacementBinding = DeclarationParentOwnedParent.bindChild(
  PlainChildBlock,
  acceptedEmittedNamedKeyedConfig,
)
export type AliasedPlacementIsTruthful = Expect<
  Equal<
    typeof aliasedPlacementBinding.placement,
    'emittedNamedEntries' | 'DeclarationParentOwnedPlainChild'
  >
>
