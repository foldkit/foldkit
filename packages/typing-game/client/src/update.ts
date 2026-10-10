import { Effect, Match, Option, Schema } from 'effect'
import { Command, Update, Url } from 'foldkit'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { NavigateToRoom } from './command'
import { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'

export const NavigateInternal = Command.define(
  'NavigateInternal',
  {
    args: { url: Schema.String },
    messages: [Message.CompletedNavigateInternal],
  },
  Effect.succeed(({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
  ),
)

export const LoadExternal = Command.define(
  'LoadExternal',
  {
    args: { href: Schema.String },
    messages: [Message.CompletedLoadExternal],
  },
  Effect.succeed(({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
  ),
)

const readHome = (model: Model): Option.Option<Home.Model.Model> =>
  Option.some(model.home)

const writeHome = (model: Model, nextHome: Home.Model.Model): Model =>
  modifyFields(model, { home: () => nextHome })

const toGotHomeMessage = (message: Home.Message): Message =>
  Message.GotHomeMessage({ message })

const readRoom = (model: Model): Option.Option<Room.Model.Model> =>
  Option.some(model.room)

const writeRoom = (model: Model, nextRoom: Room.Model.Model): Model =>
  modifyFields(model, { room: () => nextRoom })

const toGotRoomMessage = (message: Room.Message): Message =>
  Message.GotRoomMessage({ message })

const navigateToRoom = (roomId: string) => (model: Model) => ({
  model,
  commands: [NavigateToRoom({ roomId })],
})

const enterJoinedRoom = (roomId: string, player: Shared.Player) =>
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

const foldHomeOutMessage = (outMessage: Home.OutMessage) =>
  Home.OutMessage.match(outMessage, {
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

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: Url.toString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) => ({
      model: modifyFields(model, {
        route: () => urlToAppRoute(url),
      }),
    }),

    GotHomeMessage: ({ message }) => foldHomeMessage(model, message),

    GotRoomMessage: ({ message }) =>
      Match.value(model.route).pipe(
        Match.tag('Room', ({ roomId }) =>
          foldRoomMessage(roomId)(model, message),
        ),
        Match.orElse(() => ({ model })),
      ),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedNavigateToRoom: () => ({ model }),
  }),
)
