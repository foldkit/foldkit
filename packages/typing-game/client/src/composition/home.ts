import { Effect, Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'
import { pushUrl } from 'foldkit/navigation'

import * as Shared from '@typing-game/shared'

import {
  makeBinding,
  makeCommand,
  makeCommandsStep,
  makeOutMessageFold,
  makeStep,
} from '../block'
import { HomeBlock } from '../blocks'
import { Message } from '../message'
import { ApplicationRoute, roomRouter } from '../route'
import { MaybeRoomInstanceBinding } from './room'

export const NavigateToRoom = makeCommand('NavigateToRoom', {
  args: { roomId: Schema.String },
  messages: [Message.CompletedNavigateToRoom],
  handler: function* () {
    return ({ roomId }) =>
      pushUrl(roomRouter({ roomId })).pipe(
        Effect.as(Message.CompletedNavigateToRoom()),
      )
  },
})

const navigateToRoom = (roomId: string) =>
  makeCommandsStep(() => [NavigateToRoom({ roomId })])

const initRoomInstance = (roomId: string) =>
  makeStep(model =>
    initAndSet(MaybeRoomInstanceBinding, model, {
      key: roomId,
      args: [Option.none()],
    }),
  )

const enterJoinedRoom = (roomId: string, player: Shared.Player) =>
  Update.combineSteps([
    initRoomInstance(roomId),
    MaybeRoomInstanceBinding.informOfJoin(roomId, { player }, { roomId }),
    navigateToRoom(roomId),
  ])

const foldHomeOutMessage = makeOutMessageFold(HomeBlock, {
  CreatedRoom: ({ roomId, player }) => enterJoinedRoom(roomId, player),
  JoinedRoom: ({ roomId, player }) => enterJoinedRoom(roomId, player),
})

export const HomeBinding = makeBinding(HomeBlock, {
  field: 'home',
  presentWhen: model => ApplicationRoute.guards.Home(model.route),
}).withOutMessagePolicy({ fold: foldHomeOutMessage })
