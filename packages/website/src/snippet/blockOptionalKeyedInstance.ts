import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const RoomModel = Schema.Struct({ title: Schema.String })
type RoomModel = typeof RoomModel.Type

const RoomMessage = defineMessageUnion({
  RequestedRename: { title: Schema.String },
})
type RoomMessage = typeof RoomMessage.Type

const RoomComposition = Block.makeDefinition('Room', {
  Model: RoomModel,
  Message: RoomMessage,
}).makeComposition()
const prepare = () =>
  RoomComposition.prepareBlock({
    init: RoomComposition.makeInit((title: string) => ({ model: { title } })),
    update: RoomComposition.makeUpdate({
      RequestedRename: (model, { title }) => ({
        model: modifyFields(model, { title: () => title }),
      }),
    }),
    operations: { requestRename: RoomMessage.RequestedRename },
  })
const RoomBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof RoomModel,
  typeof prepare
> = Block.assemble(prepare)

const RoomInstance = Schema.Struct({
  roomId: Schema.String,
  model: RoomBlock.Model,
  access: Schema.Literals(['Owner', 'Guest']),
})
type RoomInstance = typeof RoomInstance.Type

const Model = Schema.Struct({
  maybeRoomInstance: Schema.Option(RoomInstance),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedOpenRoom: { roomId: Schema.String, title: Schema.String },
})
type Message = typeof Message.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const RoomBinding = ApplicationDefinition.makeBinding(RoomBlock, {
  field: 'maybeRoomInstance',
  key: 'roomId',
  childField: 'model',
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [RoomBinding],
})

export const update = ApplicationComposition.makeUpdate({
  RequestedOpenRoom: (model, { roomId, title }) =>
    RoomBinding.init({
      key: roomId,
      args: [title],
      toParentModel: room =>
        modifyFields(model, {
          maybeRoomInstance: () =>
            Option.some(
              RoomInstance.make({ roomId, model: room, access: 'Owner' }),
            ),
        }),
    }),
})
