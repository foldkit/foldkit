import { Array, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

export const CounterModel = Schema.Struct({
  id: Schema.String,
  count: Schema.Number,
})
export const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
})
export const GeneratedBindingCounterDefinition = Block.makeDefinition(
  'GeneratedBindingCounter',
  { Model: CounterModel, Message: CounterMessage },
)
export const GeneratedBindingCounterComposition =
  GeneratedBindingCounterDefinition.makeComposition()
const prepareCounterBlock = () =>
  GeneratedBindingCounterComposition.prepareBlock({
    init: GeneratedBindingCounterComposition.makeInit((id: string) => ({
      model: { id, count: 0 },
    })),
    update: GeneratedBindingCounterComposition.makeUpdate.withContext(
      (amount: number) => ({
        ClickedIncrement: (model, _message) => ({
          model: modifyFields(model, { count: count => count + amount }),
        }),
      }),
    ),
    view: GeneratedBindingCounterComposition.makeView((_model, h) => h.empty),
  })
export const CounterBlock: Block.FromAssemblyWithView<
  typeof CounterModel,
  typeof prepareCounterBlock
> = Block.assemble(prepareCounterBlock)

export const StatusModel = Schema.Struct({ isReady: Schema.Boolean })
export const StatusMessage = defineMessageUnion({ ToggledReady: {} })
export const GeneratedBindingStatusDefinition = Block.makeDefinition(
  'GeneratedBindingStatus',
  {
    Model: StatusModel,
    Message: StatusMessage,
  },
)
export const GeneratedBindingStatusComposition =
  GeneratedBindingStatusDefinition.makeComposition()
const prepareStatusBlock = () =>
  GeneratedBindingStatusComposition.prepareBlock({
    init: GeneratedBindingStatusComposition.makeInit(() => ({
      model: { isReady: false },
    })),
    update: GeneratedBindingStatusComposition.makeUpdate({
      ToggledReady: model => ({ model }),
    }),
    view: GeneratedBindingStatusComposition.makeView((_model, h) => h.empty),
    operations: { requestToggle: StatusMessage.ToggledReady },
  })
export const StatusBlock: Block.FromAssemblyWithView<
  typeof StatusModel,
  typeof prepareStatusBlock
> = Block.assemble(prepareStatusBlock)

export const Room = Schema.Struct({
  roomId: Schema.String,
  counter: CounterModel,
})
export const ParentModel = Schema.Struct({
  selected: Schema.Option(CounterModel),
  maybeCounter: Schema.Option(CounterModel),
  counters: Schema.Array(CounterModel),
  rooms: Schema.Array(Room),
  status: StatusModel,
  amount: Schema.Number,
  isEnabled: Schema.Boolean,
})
export const ParentMessage = defineMessageUnion({ ClickedParent: {} })
export const GeneratedBindingParentDefinition = Block.makeDefinition(
  'GeneratedBindingParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

export const AccessorBinding = GeneratedBindingParentDefinition.makeBinding(
  CounterBlock,
  {
    placement: 'selected-child',
    read: model => model.selected,
    write: (model, nextCounter) =>
      modifyFields(model, { selected: () => Option.some(nextCounter) }),
    delivery: {
      when: model => model.isEnabled,
      toUpdateContext: model => [model.amount],
    },
  },
)

export const OptionalBinding = GeneratedBindingParentDefinition.makeBinding(
  CounterBlock,
  {
    field: 'maybeCounter',
    presentWhen: model => Option.isSome(model.maybeCounter),
    delivery: {
      when: model => model.isEnabled,
      toUpdateContext: model => [model.amount],
    },
  },
)

export const KeyedFieldBinding = GeneratedBindingParentDefinition.makeBinding(
  CounterBlock,
  {
    field: 'counters',
    key: 'id',
    delivery: {
      when: (model, key) => model.isEnabled && key !== 'paused',
      toUpdateContext: model => [model.amount],
    },
  },
)

export declare const RoomId: Schema.Codec<
  string,
  number,
  'RoomIdDecode',
  'RoomIdEncode'
>
export const readRooms = (
  model: typeof ParentModel.Type,
): ReadonlyArray<typeof Room.Type> => model.rooms
export const readRoomId = (room: typeof Room.Type): string => room.roomId
export const readRoomCounter = (
  room: typeof Room.Type,
): typeof CounterModel.Type => room.counter
export const RoomBinding = GeneratedBindingParentDefinition.makeBinding(
  CounterBlock,
  {
    placement: 'room-counters',
    readAll: readRooms,
    key: readRoomId,
    keySchema: RoomId,
    read: readRoomCounter,
    writeAt: (model, roomId, nextCounter) =>
      modifyFields(model, {
        rooms: Array.map(room =>
          room.roomId === roomId
            ? modifyFields(room, { counter: () => nextCounter })
            : room,
        ),
      }),
    delivery: {
      toUpdateContext: model => [model.amount],
    },
  },
)

export const WrappedBinding = GeneratedBindingParentDefinition.makeBinding(
  CounterBlock,
  {
    placement: 'wrapped-counters',
    field: 'rooms',
    key: 'roomId',
    childField: 'counter',
    delivery: {
      toUpdateContext: model => [model.amount],
    },
  },
)

export const StatusBinding = GeneratedBindingParentDefinition.makeBinding(
  StatusBlock,
  {
    field: 'status',
  },
)

export const GeneratedBindingParentComposition =
  GeneratedBindingParentDefinition.makeComposition({
    bindings: [
      AccessorBinding,
      OptionalBinding,
      KeyedFieldBinding,
      RoomBinding,
      WrappedBinding,
      StatusBinding,
    ],
  })
export const applyGeneratedOperation =
  GeneratedBindingParentDefinition.makeStep(() =>
    Update.combineSteps([
      GeneratedBindingParentDefinition.makeNoopStep(),
      StatusBinding.requestToggle(),
    ]),
  )
export const update = GeneratedBindingParentComposition.makeUpdate({
  ClickedParent: model => applyGeneratedOperation(model),
})
