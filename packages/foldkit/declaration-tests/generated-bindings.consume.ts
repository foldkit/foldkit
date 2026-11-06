import { Schema } from 'effect'

import {
  AccessorBinding,
  CounterMessage,
  GeneratedBindingParentComposition,
  KeyedFieldBinding,
  OptionalBinding,
  ParentMessage,
  RoomBinding,
  StatusBinding,
  StatusMessage,
  WrappedBinding,
  update,
} from './generated-bindings.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type Equivalent<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false

export type AccessorPlacement = Expect<
  Equal<typeof AccessorBinding.placement, 'selected-child'>
>
export type OptionalPlacement = Expect<
  Equal<typeof OptionalBinding.placement, 'maybeCounter'>
>
export type KeyedDefaultPlacement = Expect<
  Equal<typeof KeyedFieldBinding.placement, 'GeneratedBindingCounter'>
>
export type GeneralPlacement = Expect<
  Equal<typeof RoomBinding.placement, 'room-counters'>
>
export type SiblingPlacement = Expect<
  Equal<typeof StatusBinding.placement, 'status'>
>
export type WrappedPlacement = Expect<
  Equal<typeof WrappedBinding.placement, 'wrapped-counters'>
>
export type CompleteDispatch = Expect<
  Equivalent<
    typeof GeneratedBindingParentComposition.Message.Type,
    | typeof ParentMessage.Type
    | Readonly<{
        _tag: 'GotSelectedChildMessage'
        placement: 'selected-child'
        generation: number
        message: typeof CounterMessage.Type
      }>
    | Readonly<{
        _tag: 'GotMaybeCounterMessage'
        placement: 'maybeCounter'
        generation: number
        message: typeof CounterMessage.Type
      }>
    | Readonly<{
        _tag: 'GotGeneratedBindingCounterMessage'
        placement: 'GeneratedBindingCounter'
        generation: number
        key: string
        message: typeof CounterMessage.Type
      }>
    | Readonly<{
        _tag: 'GotRoomCountersMessage'
        placement: 'room-counters'
        generation: number
        key: string
        message: typeof CounterMessage.Type
      }>
    | Readonly<{
        _tag: 'GotStatusMessage'
        placement: 'status'
        generation: number
        message: typeof StatusMessage.Type
      }>
    | Readonly<{
        _tag: 'GotWrappedCountersMessage'
        placement: 'wrapped-counters'
        generation: number
        key: string
        message: typeof CounterMessage.Type
      }>
  >
>
export type CompleteEncodedKey = Expect<
  Extract<
    typeof GeneratedBindingParentComposition.Message.Encoded,
    Readonly<{ _tag: 'GotRoomCountersMessage' }>
  >['key'] extends number
    ? true
    : false
>
export type CompleteDecodingServices = Expect<
  Equal<
    typeof GeneratedBindingParentComposition.Message.DecodingServices,
    never
  >
>
export type CompleteEncodingServices = Expect<
  Equal<
    typeof GeneratedBindingParentComposition.Message.EncodingServices,
    never
  >
>

declare const model: Parameters<typeof update>[0]
update(model, {
  _tag: 'GotGeneratedBindingCounterMessage',
  placement: 'GeneratedBindingCounter',
  generation: 0,
  key: 'first',
  message: CounterMessage.ClickedIncrement(),
})

Schema.is(GeneratedBindingParentComposition.Message)({
  _tag: 'GotRoomCountersMessage',
  placement: 'room-counters',
  generation: 0,
  key: 'room-one',
  message: CounterMessage.ClickedIncrement(),
})
