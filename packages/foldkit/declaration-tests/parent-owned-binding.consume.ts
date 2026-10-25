import { Layer, Schema } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ChildBlock,
  ChildClock,
  DeclarationParentOwnedParentComposition,
  DeclarationParentOwnedParentDefinition,
  DirectChildBinding,
  ForwardingChildBinding,
  InlineKeyedChildWithoutOutMessageBinding,
  KeyedChildBinding,
  KeyedChildWithoutOutMessageBinding,
  OptionalChildBinding,
  ParentBlock,
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
type ExactRequirements<Actual, Expected> = 0 extends 1 & Actual
  ? false
  : unknown extends Actual
    ? false
    : [Actual] extends [Expected]
      ? [Expected] extends [Actual]
        ? true
        : false
      : false

type ParentModel = typeof DeclarationParentOwnedParentDefinition.Model.Type
type ChildMessage = typeof ChildBlock.Message.Type
type OutgoingMessageOf<BindingValue> =
  BindingValue extends Block.BindingDeliveryEvidence<
    infer OutgoingMessage,
    infer _IncomingMessage,
    infer _GeneratedSchema
  >
    ? OutgoingMessage
    : never

export type DirectParentModel = Expect<
  Equal<
    Parameters<typeof DirectChildBinding.fold>[0],
    ParentModel &
      Update.GraphCapability<
        ParentModel,
        Block.RequirementOfBinding<typeof DirectChildBinding>
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
        Block.RequirementOfBinding<typeof OptionalChildBinding>
      >
  >
>
export type TaggedParentModel = Expect<
  Equal<
    Parameters<typeof TaggedChildBinding.fold>[0],
    ParentModel &
      Update.GraphCapability<
        ParentModel,
        Block.RequirementOfBinding<typeof TaggedChildBinding>
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
export type CompleteDirectDelivery = Expect<
  Equal<
    Extract<
      typeof DeclarationParentOwnedParentComposition.Message.Type,
      Readonly<{ _tag: 'GotChildMessage' }>
    >,
    Readonly<{
      _tag: 'GotChildMessage'
      placement: 'child'
      generation: number
      message: ChildMessage
    }>
  >
>
export type CompleteKeyedDelivery = Expect<
  Equal<
    Extract<
      typeof DeclarationParentOwnedParentComposition.Message.Type,
      Readonly<{ _tag: 'GotEntriesMessage' }>
    >,
    Readonly<{
      _tag: 'GotEntriesMessage'
      placement: 'entries'
      generation: number
      key: number
      message: ChildMessage
    }>
  >
>

const parentInit = ParentBlock.init()
const directDelivery = Schema.decodeSync(
  DeclarationParentOwnedParentComposition.Message,
)({
  _tag: 'GotChildMessage',
  placement: 'child',
  generation: 0,
  message: ChildBlock.Message.UpdatedValue({ value: 'next' }),
})
const parentUpdate = ParentBlock.update(parentInit.model, directDelivery)
void parentUpdate

export type DirectRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof DirectChildBinding.fold>>,
    Block.RequirementOfBinding<typeof DirectChildBinding>
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
    Block.RequirementOfBinding<typeof DirectChildBinding>
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
export type DeferredForwardedOutMessage = Expect<
  Equal<
    ReturnType<ReturnType<typeof ForwardingChildBinding.select>>,
    Update.ResultRecipe<
      ParentModel,
      OutgoingMessageOf<typeof ForwardingChildBinding>,
      never,
      never,
      | Block.RequirementOfBinding<typeof ForwardingChildBinding>
      | Update.DeferredResultEvidence<
          Block.DeferredBindingPolicy<
            'forwardingChild',
            'DeclarationParentOwnedChild'
          >
        >
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
export type GenericKeyedDeferredPolicyRequirements = Expect<
  ExactRequirements<
    Update.RequirementsOf<
      ReturnType<typeof genericKeyedBinding.ChildBinding.select>
    >,
    never
  >
>
export type GenericKeyedCompletedPolicyRequirements = Expect<
  ExactRequirements<
    Update.RequirementsOf<typeof genericKeyedBinding.Block.operations.select>,
    Block.Scoped<
      typeof genericKeyedBinding.ChildBinding.placement,
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
