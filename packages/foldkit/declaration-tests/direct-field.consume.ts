import { Option, Schema } from 'effect'
import type { Block } from 'foldkit'

import {
  ArrayChildBinding,
  CallableModel,
  CallableOptionalBinding,
  ChildMessage,
  CustomIgnoredMessageBinding,
  GeneratedChildBinding,
  GeneratedDirectFieldParentComposition,
  GeneratedParentMessage,
  InitializedArgumentBinding,
  InitializedOptionalBinding,
  InitializedRequiredBinding,
  Model,
  NestedOptionalBinding,
  NestedRequiredBinding,
  OptionalBinding,
  ParentMessage,
  RequiredBinding,
  SuspendedOptionalBinding,
  composition,
  foldOptional,
  generatedUpdate,
  init,
  initial,
  setCallableCount,
  setOptionalCount,
} from './direct-field.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
type IsAny<Value> = 0 extends 1 & Value ? true : false
type IsUnknown<Value> =
  IsAny<Value> extends true
    ? false
    : unknown extends Value
      ? [keyof Value] extends [never]
        ? true
        : false
      : false
type IsAnyOrUnknown<Value> = IsAny<Value> extends true ? true : IsUnknown<Value>
export type OptionalPlacement = Assert<
  Equal<typeof OptionalBinding.placement, 'maybeChild'>
>
export type RequiredPlacement = Assert<
  Equal<typeof RequiredBinding.placement, 'child'>
>
export type SuspendedOptionalPlacement = Assert<
  Equal<typeof SuspendedOptionalBinding.placement, 'suspendedMaybeChild'>
>
export type NestedRequiredPlacement = Assert<
  Equal<typeof NestedRequiredBinding.placement, 'nestedChild'>
>
export type NestedOptionalPlacement = Assert<
  Equal<typeof NestedOptionalBinding.placement, 'maybeNestedChild'>
>
export type ArrayChildPlacement = Assert<
  Equal<typeof ArrayChildBinding.placement, 'arrayChild'>
>
export type CustomIgnoredPlacement = Assert<
  Equal<typeof CustomIgnoredMessageBinding.placement, 'customIgnoredMessage'>
>
export type InitializedRequiredPlacement = Assert<
  Equal<typeof InitializedRequiredBinding.placement, 'initializedRequired'>
>
export type InitializedArgumentPlacement = Assert<
  Equal<typeof InitializedArgumentBinding.placement, 'argumentChild'>
>
export type InitializedOptionalPlacement = Assert<
  Equal<typeof InitializedOptionalBinding.placement, 'maybeArgumentChild'>
>
export type GeneratedPlacement = Assert<
  Equal<typeof GeneratedChildBinding.placement, 'child'>
>
export type GeneratedDispatch = Assert<
  Equal<
    typeof GeneratedDirectFieldParentComposition.Message.Type,
    | typeof GeneratedParentMessage.Type
    | Readonly<{
        _tag: 'GotChildMessage'
        placement: 'child'
        generation: number
        message: typeof ChildMessage.Type
      }>
  >
>
export type InitArguments = Assert<
  Equal<
    Parameters<typeof init>,
    [
      context: Readonly<{
        count: number
        maybeCount: Option.Option<number>
      }>,
    ]
  >
>
const assembled = init({ count: 1, maybeCount: Option.some(2) })
export type InitializedModelIsKnown = Assert<
  IsAnyOrUnknown<typeof assembled.model> extends false ? true : false
>
export type InitializedModelFitsParent = Assert<
  typeof assembled.model extends typeof Model.Type ? true : false
>
export type OperationArgs = Assert<
  Equal<Parameters<typeof OptionalBinding.setCount>, [count: number]>
>
const result = setOptionalCount(initial, ParentMessage.IgnoredChildMessage(), 2)
export type ParentReturn = Assert<Equal<typeof result.model, typeof Model.Type>>
export type Builder = Block.ViewBuilderFor<typeof composition>
foldOptional(
  initial,
  ParentMessage.IgnoredChildMessage(),
  ChildMessage.UpdatedCount({ count: 3 }),
)
generatedUpdate(initial, GeneratedParentMessage.ClickedParent())
generatedUpdate(
  initial,
  Schema.decodeSync(GeneratedDirectFieldParentComposition.Message)({
    _tag: 'GotChildMessage',
    placement: 'child',
    generation: 0,
    message: ChildMessage.UpdatedCount({ count: 2 }),
  }),
)
generatedUpdate(initial, {
  _tag: 'GotChildMessage',
  // @ts-expect-error Generated delivery retains its exact placement.
  placement: 'other',
  generation: 0,
  message: ChildMessage.UpdatedCount({ count: 2 }),
})
// @ts-expect-error Emitted exposed operation arguments retain their exact types.
OptionalBinding.setCount('wrong')
setOptionalCount(
  {
    child: { count: 1 },
    argumentChild: { count: 2 },
    maybeArgumentChild: Option.none(),
    maybeChild: Option.none(),
    // @ts-expect-error Emitted parent operations retain the parent Model.
    route: 'Foreign',
  },
  ParentMessage.IgnoredChildMessage(),
  1,
)

const callableInitial = CallableModel({
  child: { count: 0 },
  maybeChild: Option.none(),
})
const callableResult = setCallableCount(
  callableInitial,
  ParentMessage.IgnoredChildMessage(),
  1,
)
export type CallableParentReturn = Assert<
  Equal<typeof callableResult.model, typeof CallableModel.Type>
>
export type CallableOptionalPlacement = Assert<
  Equal<typeof CallableOptionalBinding.placement, 'maybeChild'>
>
