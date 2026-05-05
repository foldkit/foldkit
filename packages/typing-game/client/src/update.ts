import * as Shared from '@typing-game/shared'
import { Effect, Match as M, Option } from 'effect'
import { Command, Url } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { navigateToRoom } from './command'
import {
  CompletedLoadExternal,
  CompletedNavigateInternal,
  GotHomeMessage,
  GotRoomMessage,
  Message,
} from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { savePlayerSession } from './page/room/command'
import { urlToAppRoute } from './route'

const NavigateInternal = Command.define(
  'NavigateInternal',
  CompletedNavigateInternal,
)
const LoadExternal = Command.define('LoadExternal', CompletedLoadExternal)

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
              [
                NavigateInternal(
                  pushUrl(Url.toString(url)).pipe(
                    Effect.as(CompletedNavigateInternal()),
                  ),
                ),
              ],
            ],
            External: ({ href }) => [
              model,
              [
                LoadExternal(
                  load(href).pipe(Effect.as(CompletedLoadExternal())),
                ),
              ],
            ],
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

        const mappedCommands = homeCommands.map(
          Command.mapEffect(Effect.map(message => GotHomeMessage({ message }))),
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

      GotRoomMessage: ({ message }) => {
        const [nextRoomModel, roomCommands] = Room.update(model.room, message)

        return [
          evo(model, {
            room: () => nextRoomModel,
          }),
          roomCommands.map(
            Command.mapEffect(
              Effect.map(message => GotRoomMessage({ message })),
            ),
          ),
        ]
      },
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
  const session = { roomId, player }
  const [nextRoomModel, roomCommands] = Room.update(
    model.room,
    Room.Message.SucceededJoinRoom({ roomId, player }),
  )

  return [
    evo(model, { room: () => nextRoomModel }),
    [
      navigateToRoom(roomId),
      savePlayerSession(session),
      ...roomCommands.map(
        Command.mapEffect(Effect.map(message => GotRoomMessage({ message }))),
      ),
    ],
  ]
}
