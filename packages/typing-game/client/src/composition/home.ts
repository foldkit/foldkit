import { Effect, Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'
import { pushUrl } from 'foldkit/navigation'

import * as Shared from '@typing-game/shared'

import {
  ApplicationDefinition,
  makeCommandsStep,
  makeStep,
} from '../definition'
import { Message } from '../message'
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
  makeCommandsStep(() => [NavigateToRoom({ roomId })])

const initRoomInstance = (roomId: string) =>
  makeStep(model =>
    initAndSet(RoomBinding, model, {
      key: roomId,
      args: [Option.none()],
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
