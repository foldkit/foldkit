import type { Block, Update } from 'foldkit'

import {
  ChildBlock,
  BroadNumberChildrenBinding,
  ChildrenByIdBinding,
  ChildrenByNumberBinding,
  FiniteChildrenBinding,
  HashRowsByIdBinding,
  LowerChildrenBinding,
  ParentDefinition,
  RowsByIdBinding,
  UpperChildrenBinding,
  initialModel,
  update,
} from './keyed-map-field.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type IncomingMessage<Binding> =
  Binding extends Block.BindingDeliveryEvidence<any, infer Message, any>
    ? Message
    : never

export type RecordKey = Expect<
  Equal<Parameters<typeof ChildrenByIdBinding.fold>[1], string>
>
export type FiniteRecordKey = Expect<
  Equal<Parameters<typeof FiniteChildrenBinding.fold>[1], 'Start' | 'End'>
>
export type HashMapKey = Expect<
  Equal<Parameters<typeof ChildrenByNumberBinding.fold>[1], number>
>
export type BroadNumberHashMapKey = Expect<
  Equal<Parameters<typeof BroadNumberChildrenBinding.fold>[1], number>
>
export type ExplicitPlacement = Expect<
  Equal<typeof HashRowsByIdBinding.placement, 'hashRows'>
>
export type DefaultWrappedPlacement = Expect<
  Equal<typeof RowsByIdBinding.placement, 'rowsById'>
>
export type DefaultWrappedMessageTag = Expect<
  Equal<IncomingMessage<typeof RowsByIdBinding>['_tag'], 'GotRowsByIdMessage'>
>
export type LowerWrapperMessageTag = Expect<
  Equal<
    IncomingMessage<typeof LowerChildrenBinding>['_tag'],
    'GotLowerChildrenMessage'
  >
>
export type UpperWrapperMessageTag = Expect<
  Equal<
    IncomingMessage<typeof UpperChildrenBinding>['_tag'],
    'GotUpperChildrenMessage'
  >
>
export type ParentModelInput = Expect<
  Equal<
    Parameters<typeof ChildrenByIdBinding.fold>[0],
    typeof ParentDefinition.Model.Type &
      Update.GraphCapability<
        typeof ParentDefinition.Model.Type,
        Block.RequirementOfBinding<typeof ChildrenByIdBinding>
      >
  >
>

update(initialModel, {
  _tag: 'GotChildrenByIdMessage',
  placement: 'childrenById',
  generation: 0,
  key: 'created',
  message: ChildBlock.Message.UpdatedCount({ count: 1 }),
})
