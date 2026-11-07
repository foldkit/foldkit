import { Option } from 'effect'

import {
  ApplicationDefinition,
  DirectReciprocalApplicationDefinition,
  HomeBinding,
  HomeBlock,
  HomeOutMessage,
  KeyedReciprocalApplicationDefinition,
  LeftHomeBinding,
  LeftKeyedHomeBinding,
  NestedPolicy,
  RightHomeBinding,
  RightKeyedHomeBinding,
  RoomBinding,
  RoomBlock,
  RoomInstance,
} from './reciprocal-coordination.accepted.js'

// @ts-expect-error Room policy uses the omitted Home Binding.
const MissingHomeComposition = ApplicationDefinition.makeComposition({
  bindings: [RoomBinding],
})
void MissingHomeComposition

// @ts-expect-error Home policy uses the omitted Room Binding.
const MissingRoomComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding],
})
void MissingRoomComposition

// @ts-expect-error Left direct policy uses the omitted right Home Binding.
DirectReciprocalApplicationDefinition.makeComposition({
  bindings: [LeftHomeBinding],
})
// @ts-expect-error Right direct policy uses the omitted left Home Binding.
DirectReciprocalApplicationDefinition.makeComposition({
  bindings: [RightHomeBinding],
})
// @ts-expect-error Left keyed policy uses the omitted right Home Binding.
KeyedReciprocalApplicationDefinition.makeComposition({
  bindings: [LeftKeyedHomeBinding],
})
// @ts-expect-error Right keyed policy uses the omitted left Home Binding.
KeyedReciprocalApplicationDefinition.makeComposition({
  bindings: [RightKeyedHomeBinding],
})

// @ts-expect-error resetJoinForm requires exactly one username.
HomeBinding.resetJoinForm()
// @ts-expect-error resetJoinForm accepts no extra arguments.
HomeBinding.resetJoinForm('', 'extra')
// @ts-expect-error informOfJoined requires key, username, and Room context.
RoomBinding.informOfJoined('room-1', 'alice')
// @ts-expect-error informOfJoined preserves the string Room context field.
RoomBinding.informOfJoined('room-1', 'alice', { roomId: 1 })

const PendingHomeBinding = ApplicationDefinition.makeRequiredFieldBinding(
  HomeBlock,
  {
    field: 'home',
  },
)
// @ts-expect-error A child with OutMessages requires an OutMessage policy before Composition.
ApplicationDefinition.makeComposition({ bindings: [PendingHomeBinding] })

const PendingRoomBinding = ApplicationDefinition.makeCustomKeyedBinding(
  RoomBlock,
  {
    placement: 'pending-room',
    readAll: (model: typeof ApplicationDefinition.Model.Type) =>
      Option.toArray(model.maybeRoomInstance),
    key: (instance: typeof RoomInstance.Type) => instance.roomId,
    keySchema: RoomInstance.fields.roomId,
    read: (instance: typeof RoomInstance.Type) => instance.model,
    writeAt: (model: typeof ApplicationDefinition.Model.Type) => model,
    delivery: {
      toUpdateContext: (
        _model: typeof ApplicationDefinition.Model.Type,
        roomId: string,
      ) => [{ roomId }],
    },
  },
)
// @ts-expect-error A keyed child with OutMessages requires an OutMessage policy before Composition.
ApplicationDefinition.makeComposition({ bindings: [PendingRoomBinding] })

ApplicationDefinition.makeRequiredFieldBinding(HomeBlock, {
  field: 'home',
}).withOutMessagePolicy({
  // @ts-expect-error A static policy must accept every refined child OutMessage.
  fold: (
    _outMessage: Extract<
      typeof HomeOutMessage.Type,
      Readonly<{ username: 'alice' }>
    >,
  ) => ApplicationDefinition.makeStep(model => ({ model })),
})

// @ts-expect-error A policy-returned sibling recipe retains its required Binding.
NestedPolicy.Parent.makeComposition({
  bindings: [NestedPolicy.HomeBinding],
})
