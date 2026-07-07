import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Url } from 'foldkit'
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

const NavigateInternal = Command.define(
  'NavigateInternal',
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())))

const LoadExternal = Command.define(
  'LoadExternal',
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())))

export type UpdateReturn<Model, Message> = [
  Model,
  ReadonlyArray<Command.Command<Message, never, RoomsClient>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn<Model, Message>>()

const applyRoomResult = (
  model: Model,
  [nextRoomModel, roomCommands]: Room.UpdateReturn,
): UpdateReturn<Model, Message> => [
  evo(model, { room: () => nextRoomModel }),
  Command.mapMessages(roomCommands, message => GotRoomMessage({ message })),
]

const applyHomeResult = (
  model: Model,
  [nextHomeModel, homeCommands, maybeOutMessage]: Home.UpdateReturn,
): UpdateReturn<Model, Message> => {
  const mappedCommands = Command.mapMessages(homeCommands, message =>
    GotHomeMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { home: () => nextHomeModel }), mappedCommands],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        withUpdateReturn,
        M.tag(
          'SucceededCreateRoom',
          'SucceededJoinRoom',
          ({ roomId, player }) => {
            const [nextModel, roomCommands] = handleRoomJoined(
              model,
              roomId,
              player,
            )
            return [
              evo(nextModel, { home: () => nextHomeModel }),
              [...mappedCommands, ...roomCommands],
            ]
          },
        ),
        M.exhaustive,
      ),
  })
}

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

      GotHomeMessage: ({ message }) =>
        applyHomeResult(model, Home.update(model.home, message)),

      GotRoomMessage: ({ message }) =>
        M.value(model.route).pipe(
          withUpdateReturn,
          M.tag('Room', ({ roomId }) =>
            applyRoomResult(
              model,
              Room.update(model.room, message, { roomId }),
            ),
          ),
          M.orElse(() => [model, []]),
        ),

      PressedKey: ({ key }) =>
        M.value(model.route).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Home: () =>
              applyHomeResult(model, Home.informPressedKey(model.home, key)),
            Room: ({ roomId }) =>
              applyRoomResult(
                model,
                Room.informPressedKey(model.room, key, { roomId }),
              ),
            NotFound: () => [model, []],
          }),
        ),
    }),
    M.tag(
      'CompletedNavigateInternal',
      'CompletedLoadExternal',
      'CompletedNavigateRoom',
      () => [model, []],
    ),
    M.exhaustive,
  )

const handleRoomJoined = (
  model: Model,
  roomId: string,
  player: Shared.Player,
): UpdateReturn<Model, Message> => {
  const [nextRoomModel, roomCommands] = Room.join(model.room, player, {
    roomId,
  })

  return [
    evo(model, { room: () => nextRoomModel }),
    [
      NavigateToRoom({ roomId }),
      ...Command.mapMessages(roomCommands, message =>
        GotRoomMessage({ message }),
      ),
    ],
  ]
}
