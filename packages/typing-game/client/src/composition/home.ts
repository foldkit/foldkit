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

const navigateToRoomStep = (roomId: string) =>
  makeCommandsStep(() => [NavigateToRoom({ roomId })])

const initRoomInstanceStep = (roomId: string) =>
  makeStep(model =>
    initAndSet(RoomBinding, model, {
      key: roomId,
      args: [Option.none()],
    }),
  )

const enterJoinedRoomStep = (
  roomId: string,
  player: typeof Shared.Player.Type,
) =>
  Update.combineSteps([
    initRoomInstanceStep(roomId),
    RoomBinding.informJoined(roomId, { player }, { roomId }),
    navigateToRoomStep(roomId),
  ])

const foldHomeOutMessage = ApplicationDefinition.makeOutMessageFold(HomeBlock, {
  CreatedRoom: ({ roomId, player }) => enterJoinedRoomStep(roomId, player),
  JoinedRoom: ({ roomId, player }) => enterJoinedRoomStep(roomId, player),
})

export const HomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
  presentWhen: model => ApplicationRoute.guards.Home(model.route),
}).withOutMessagePolicy({ fold: foldHomeOutMessage })
