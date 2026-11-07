import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const RoomModel = Schema.Struct({ title: Schema.String })
type RoomModel = typeof RoomModel.Type

const RoomInMessage = defineInMessageUnion({
  RequestedRename: { title: Schema.String },
})
type RoomInMessage = typeof RoomInMessage.Type

export const RoomKey = Symbol('Room')
export const RoomBlock = Block.make('Room', {
  key: RoomKey,
  InitArgs: Schema.Tuple([Schema.String]),
  InMessage: RoomInMessage,
  isMessageFree: true,

  Model: RoomModel,
  Message: Schema.Never,
})

const RoomComposition = RoomBlock.makeComposition()

const layer = RoomBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init: RoomComposition.makeInit((title: string) => ({ model: { title } })),
      update: RoomComposition.makeUpdate({}),
      inMessageUpdate: RoomComposition.makeInMessageUpdate({
        RequestedRename: (model, { title }) => ({
          model: modifyFields(model, { title: () => title }),
        }),
      }),
    }
  }),
)

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

export const ApplicationKey = Symbol('Application')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const MaybeRoomInstanceBinding = ApplicationBlock.makeOptionalKeyedFieldBinding(
  RoomBlock,
  {
    field: 'maybeRoomInstance',
    key: 'roomId',
    childField: 'model',
  },
)
const ApplicationComposition = ApplicationBlock.makeComposition({
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
