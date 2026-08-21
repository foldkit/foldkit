import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Update, Url } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { NavigateToRoom } from './command'
import { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'
import { RoomsClient } from './rpc'

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

export type UpdateReturn<Model, Message> = Update.Return<
  Model,
  Message,
  RoomsClient
>
const withUpdateReturn = M.withReturnType<UpdateReturn<Model, Message>>()

type UpdateStep = Update.Step<Model, Message, RoomsClient>

const readHome = (model: Model): Option.Option<Home.Model.Model> =>
  Option.some(model.home)

const writeHome = (model: Model, nextHome: Home.Model.Model): Model =>
  evo(model, { home: () => nextHome })

const toGotHomeMessage = (message: Home.Message): Message =>
  Message.GotHomeMessage({ message })

const readRoom = (model: Model): Option.Option<Room.Model.Model> =>
  Option.some(model.room)

const writeRoom = (model: Model, nextRoom: Room.Model.Model): Model =>
  evo(model, { room: () => nextRoom })

const toGotRoomMessage = (message: Room.Message): Message =>
  Message.GotRoomMessage({ message })

const navigateToRoom =
  (roomId: string): UpdateStep =>
  model => ({ model, commands: [NavigateToRoom({ roomId })] })

const enterJoinedRoom = (roomId: string, player: Shared.Player): UpdateStep =>
  Update.combine([
    navigateToRoom(roomId),
    Update.foldChild({
      update: (roomModel: Room.Model.Model, joinedPlayer: Shared.Player) =>
        Room.informJoined(roomModel, joinedPlayer, { roomId }),
      read: readRoom,
      write: writeRoom,
      toParentMessage: toGotRoomMessage,
    })(player),
  ])

const foldHomeOutMessage = (outMessage: Home.OutMessage): UpdateStep =>
  Home.OutMessage.match<UpdateStep>(outMessage, {
    CreatedRoom: ({ roomId, player }) => enterJoinedRoom(roomId, player),
    JoinedRoom: ({ roomId, player }) => enterJoinedRoom(roomId, player),
  })

const foldHomeMessage = Update.foldChild({
  update: Home.update,
  read: readHome,
  write: writeHome,
  toParentMessage: toGotHomeMessage,
  foldOutMessage: foldHomeOutMessage,
})

const foldRoomMessage = (roomId: string) =>
  Update.foldChild({
    update: (roomModel: Room.Model.Model, message: Room.Message) =>
      Room.update(roomModel, message, { roomId }),
    read: readRoom,
    write: writeRoom,
    toParentMessage: toGotRoomMessage,
  })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn<Model, Message>>(message, {
    ClickedLink: ({ request }) =>
      M.value(request).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          Internal: ({ url }) => ({
            model,
            commands: [NavigateInternal({ url: Url.toString(url) })],
          }),
          External: ({ href }) => ({
            model,
            commands: [LoadExternal({ href })],
          }),
        }),
      ),

    ChangedUrl: ({ url }) => ({
      model: evo(model, {
        route: () => urlToAppRoute(url),
      }),
    }),

    GotHomeMessage: ({ message }) => foldHomeMessage(model, message),

    GotRoomMessage: ({ message }) =>
      M.value(model.route).pipe(
        withUpdateReturn,
        M.tag('Room', ({ roomId }) => foldRoomMessage(roomId)(model, message)),
        M.orElse(() => ({ model })),
      ),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedNavigateToRoom: () => ({ model }),
  })
