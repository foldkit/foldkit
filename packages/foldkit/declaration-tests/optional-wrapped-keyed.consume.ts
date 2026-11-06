import type { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'

import {
  CanonicalChildMessage,
  CanonicalChildModel,
  CanonicalChildrenBinding,
  CanonicalParentBlock,
  DeclarationOptionalWrappedKeyedParentComposition,
  LiteralRoomBinding,
  LiteralRoomId,
  ParentMessage,
  RoomBinding,
  RoomContext,
  RoomId,
  RoomMessage,
  canonicalManagedResources,
  canonicalParentLayer,
  canonicalSubscriptions,
  initRoom,
  payloadParent,
  roomManagedResources,
  roomSubscriptions,
} from './optional-wrapped-keyed.accepted.js'

declare const roomId: typeof RoomId.Type

export const selectedTicks = Scene.Subscription.at(
  RoomBinding,
  roomId,
  roomSubscriptions.ticks,
)
export const emittedTick = Scene.Subscription.emit(
  selectedTicks,
  RoomMessage.ObservedTick({ label: 'selected' }),
)
export const selectedSession = Scene.ManagedResource.at(
  RoomBinding,
  roomId,
  roomManagedResources.session,
)
export const acquiredSession = Scene.ManagedResource.acquire(
  selectedSession,
  'session-value',
)

export const canonicalSelectedTicks = Scene.Subscription.at(
  CanonicalChildrenBinding,
  'first',
  canonicalSubscriptions.ticks,
)
export const canonicalEmittedTick = Scene.Subscription.emit(
  canonicalSelectedTicks,
  CanonicalChildMessage.ObservedTick(),
)
export const canonicalSelectedSession = Scene.ManagedResource.at(
  CanonicalChildrenBinding,
  'second',
  canonicalManagedResources.session,
)
export const canonicalAcquiredSession = Scene.ManagedResource.acquire(
  canonicalSelectedSession,
  'canonical-session',
)
export const canonicalSelectedLayerScene = Scene.scene(
  { block: CanonicalParentBlock, layer: canonicalParentLayer },
  Scene.given({
    children: { first: CanonicalChildModel.make({ count: 0 }) },
  }),
  Scene.Subscription.expectActive(canonicalSelectedTicks),
  canonicalEmittedTick,
  canonicalAcquiredSession,
)

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

type RoomEnvelope = Readonly<{
  _tag: 'GotDeclarationOptionalWrappedKeyedRoomMessage'
  placement: 'DeclarationOptionalWrappedKeyedRoom'
  generation: number
  key: typeof RoomId.Type
  message: typeof RoomMessage.Type
}>

export type Key = Expect<
  Equal<Parameters<typeof RoomBinding.fold>[1], typeof RoomId.Type>
>
export type Placement = Expect<
  Equal<typeof RoomBinding.placement, 'DeclarationOptionalWrappedKeyedRoom'>
>
export type LiteralKey = Expect<
  Equal<
    Parameters<typeof LiteralRoomBinding.fold>[1],
    typeof LiteralRoomId.Type
  >
>
export type OperationArguments = Expect<
  Equal<
    Parameters<typeof RoomBinding.setCount>,
    [key: typeof RoomId.Type, count: number, context: typeof RoomContext.Type]
  >
>
export type InitConfig = Parameters<typeof RoomBinding.init>[0]
export type InitKey = Expect<Equal<InitConfig['key'], typeof RoomId.Type>>
export type InitArguments = Expect<Equal<InitConfig['args'], [count: number]>>
export type RoomInitArguments = Expect<
  Equal<Parameters<typeof initRoom>, [roomId: typeof RoomId.Type]>
>
export type CompleteMessage = Expect<
  Equal<
    typeof DeclarationOptionalWrappedKeyedParentComposition.Message.Type,
    typeof ParentMessage.Type | RoomEnvelope
  >
>
export type GenericPayload = Expect<
  Equal<
    (typeof payloadParent.Model.Type)['maybeRoomInstance'],
    import('effect').Option.Option<
      Readonly<{
        roomId: typeof RoomId.Type
        model: Readonly<{ count: number }>
        payload: Readonly<{ label: string }>
      }>
    >
  >
>
export type GenericKey = Expect<
  Equal<Parameters<typeof payloadParent.Binding.fold>[1], typeof RoomId.Type>
>
export type Registration = Block.RequirementOfBinding<typeof RoomBinding>
