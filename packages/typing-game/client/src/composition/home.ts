import { Effect, Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { ApplicationDefinition } from '../definition'
import { Message } from '../message'
import { RoomInstance } from '../model'
import { HomeBlock } from '../page'
import { ApplicationRoute, roomRouter } from '../route'
import { RoomBinding } from './room'

export const NavigateToRoom = ApplicationDefinition.makeCommand(
  'NavigateToRoom',
  {
    args: { roomId: Schema.String },
    messages: [Message.CompletedNavigateToRoom],
    handler: function* () {
      return ({ roomId }) =>
        pushUrl(roomRouter({ roomId })).pipe(
          Effect.as(Message.CompletedNavigateToRoom()),
        )
    },
  },
)

const navigateToRoom = (roomId: string) =>
  ApplicationDefinition.makeCommandsStep(() => [NavigateToRoom({ roomId })])

const initRoomInstance = (roomId: string) =>
  ApplicationDefinition.makeStep(model =>
    RoomBinding.init({
      key: roomId,
      args: [Option.none()],
      toParentModel: room =>
        modifyFields(model, {
          maybeRoomInstance: () =>
            Option.some(RoomInstance.make({ roomId, model: room })),
        }),
    }),
  )

const enterJoinedRoom = (roomId: string, player: typeof Shared.Player.Type) =>
  Update.combineSteps([
    initRoomInstance(roomId),
    RoomBinding.informJoined(roomId, { player }, { roomId }),
    navigateToRoom(roomId),
  ])

const foldHomeOutMessage = ApplicationDefinition.makeOutMessageFold(HomeBlock, {
  CreatedRoom: ({ roomId, player }) => enterJoinedRoom(roomId, player),
  JoinedRoom: ({ roomId, player }) => enterJoinedRoom(roomId, player),
})

export const HomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
  presentWhen: model => ApplicationRoute.guards.Home(model.route),
}).withOutMessagePolicy({ fold: foldHomeOutMessage })
