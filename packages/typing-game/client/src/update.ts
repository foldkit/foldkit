import * as Shared from '@typing-game/shared'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Url } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

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
  ReadonlyArray<Command.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn<Model, Message>>()

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

      GotHomeMessage: ({ message }) => {
        const [nextHomeModel, homeCommands, maybeOutMessage] = Home.update(
          model.home,
          message,
        )

        const mappedCommands = Command.mapMessages(homeCommands, message =>
          GotHomeMessage({ message }),
        )

        return Option.match(maybeOutMessage, {
          onNone: () => [
            evo(model, {
              home: () => nextHomeModel,
            }),
            mappedCommands,
          ],
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
      },

      GotRoomMessage: ({ message }) =>
        M.value(model.route).pipe(
          withUpdateReturn,
          M.tag('Room', ({ roomId }) => {
            const [nextRoomModel, roomCommands] = Room.update(
              model.room,
              message,
              { roomId },
            )

            return [
              evo(model, {
                room: () => nextRoomModel,
              }),
              Command.mapMessages(roomCommands, message =>
                GotRoomMessage({ message }),
              ),
            ]
          }),
          M.orElse(() => [model, []]),
        ),
    }),
    M.tag(
      'CompletedNavigateInternal',
      'CompletedLoadExternal',
      'CompletedNavigateRoom',
      'CompletedSaveSession',
      'CompletedClearSession',
      'IgnoredKeyPress',
      () => [model, []],
    ),
    M.exhaustive,
  )

const handleRoomJoined = (
  model: Model,
  roomId: string,
  player: Shared.Player,
): UpdateReturn<Model, Message> => {
  const [nextRoomModel, roomCommands] = Room.update(
    model.room,
    Room.Message.SucceededJoinRoom({ player }),
    { roomId },
  )

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
