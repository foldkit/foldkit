import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const RoomModel = Schema.Struct({ title: Schema.String })
type RoomModel = typeof RoomModel.Type

const RoomInMessage = defineMessageUnion({
  RequestedRename: { title: Schema.String },
})
type RoomInMessage = typeof RoomInMessage.Type

const RoomKey = Symbol('Room')

const RoomDefinition = Block.makeDefinition('Room', {
  key: RoomKey,
  Init: Schema.Tuple([Schema.String]),
  InMessage: RoomInMessage,
  isMessageFree: true,

  Model: RoomModel,
  Message: Schema.Never,
})

const RoomComposition = RoomDefinition.makeComposition()
const RoomBlock = RoomDefinition.contract

const layer = RoomDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init: RoomComposition.makeInit((title: string) => ({ model: { title } })),
      update: RoomComposition.makeUpdate({}),
      receive: RoomComposition.makeReceive({
        RequestedRename: (model, { title }) => ({
          model: modifyFields(model, { title: () => title }),
        }),
      }),
    }
  }),
).layer

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

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

const MaybeRoomInstanceBinding = ApplicationDefinition.makeBinding(RoomBlock, {
  field: 'maybeRoomInstance',
  key: 'roomId',
  childField: 'model',
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [MaybeRoomInstanceBinding],
})

export const update = ApplicationComposition.makeUpdate({
  RequestedOpenRoom: (model, { roomId, title }) =>
    MaybeRoomInstanceBinding.init({
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
