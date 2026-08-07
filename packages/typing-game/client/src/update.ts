import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Update, Url } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { NavigateToRoom } from './command'
import {
  CompletedLoadExternal,
  CompletedNavigateInternal,
  GotHomeMessage,
  GotRoomMessage,
  Message,
} from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'
import { RoomsClient } from './rpc'

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [CompletedLoadExternal],
  execute: ({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())),
})

export type UpdateReturn<Model, Message> = readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, RoomsClient>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn<Model, Message>>()

type UpdateStep = Update.Step<Model, Message, RoomsClient>

const navigateToRoom =
  (roomId: string): UpdateStep =>
  model => [model, [NavigateToRoom({ roomId })]]

const joinRoom = (roomId: string, player: Shared.Player): UpdateStep =>
  Update.combine([
    navigateToRoom(roomId),
    Update.foldChild({
      update: (roomModel: Room.Model.Model, joiningPlayer: Shared.Player) =>
        Room.join(roomModel, joiningPlayer, { roomId }),
      read: (model: Model) => Option.some(model.room),
      write: (model, nextRoom) => evo(model, { room: () => nextRoom }),
      toParentMessage: message => GotRoomMessage({ message }),
    })(player),
  ])

const foldHomeOutMessage: (outMessage: Home.Message.OutMessage) => UpdateStep =
  outMessage => model =>
    M.value(outMessage).pipe(
      withUpdateReturn,
      M.tag('SucceededCreateRoom', 'SucceededJoinRoom', ({ roomId, player }) =>
        joinRoom(roomId, player)(model),
      ),
      M.exhaustive,
    )

const foldHomeMessage = Update.foldChild({
  update: Home.update,
  read: (model: Model) => Option.some(model.home),
  write: (model, nextHome) => evo(model, { home: () => nextHome }),
  toParentMessage: message => GotHomeMessage({ message }),
  foldOutMessage: foldHomeOutMessage,
})

const foldHomeKeyPress = Update.foldChild({
  update: Home.informPressedKey,
  read: (model: Model) => Option.some(model.home),
  write: (model, nextHome) => evo(model, { home: () => nextHome }),
  toParentMessage: message => GotHomeMessage({ message }),
  foldOutMessage: foldHomeOutMessage,
})

const foldRoomMessage = (roomId: string) =>
  Update.foldChild({
    update: (roomModel: Room.Model.Model, message: Room.Message.Message) =>
      Room.update(roomModel, message, { roomId }),
    read: (model: Model) => Option.some(model.room),
    write: (model, nextRoom) => evo(model, { room: () => nextRoom }),
    toParentMessage: message => GotRoomMessage({ message }),
  })

const foldRoomKeyPress = (roomId: string) =>
  Update.foldChild({
    update: (roomModel: Room.Model.Model, key: string) =>
      Room.informPressedKey(roomModel, key, { roomId }),
    read: (model: Model) => Option.some(model.room),
    write: (model, nextRoom) => evo(model, { room: () => nextRoom }),
    toParentMessage: message => GotRoomMessage({ message }),
  })

export const update = (
  model: Model,
  message: Message,
): UpdateReturn<Model, Message> =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tags({
      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [NavigateInternal({ url: Url.toString(url) })],
            ],
            External: ({ href }) => [model, [LoadExternal({ href })]],
          }),
        ),

      ChangedUrl: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      GotHomeMessage: ({ message }) => foldHomeMessage(message)(model),

      GotRoomMessage: ({ message }) =>
        M.value(model.route).pipe(
          withUpdateReturn,
          M.tag('Room', ({ roomId }) =>
            foldRoomMessage(roomId)(message)(model),
          ),
          M.orElse(() => [model, []]),
        ),

      PressedKey: ({ key }) =>
        M.value(model.route).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Home: () => foldHomeKeyPress(key)(model),
            Room: ({ roomId }) => foldRoomKeyPress(roomId)(key)(model),
            NotFound: () => [model, []],
          }),
        ),
    }),
    M.tag(
      'CompletedNavigateInternal',
      'CompletedLoadExternal',
      'CompletedNavigateToRoom',
      () => [model, []],
    ),
    M.exhaustive,
  )
