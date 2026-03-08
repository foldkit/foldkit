import * as Shared from '@typing-game/shared'
import { Array, Effect, Match as M, Option } from 'effect'
import { Task, Url } from 'foldkit'
import { Command } from 'foldkit/command'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { navigateToRoom, savePlayerToSessionStorage } from './command'
import { USERNAME_INPUT_ID } from './constant'
import { GotHomeMessage, GotRoomMessage, Message, NoOp } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'

export type UpdateReturn<Model, Message> = [
  Model,
  ReadonlyArray<Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn<Model, Message>>()

export const update = (
  model: Model,
  message: Message,
): UpdateReturn<Model, Message> =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      NoOp: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [pushUrl(Url.toString(url)).pipe(Effect.as(NoOp()))],
            ],
            External: ({ href }) => [
              model,
              [load(href).pipe(Effect.as(NoOp()))],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const maybeFocusUsernameInput = M.value(nextRoute).pipe(
          M.tag('Home', () =>
            Task.focus(`#${USERNAME_INPUT_ID}`).pipe(
              Effect.ignore,
              Effect.as(NoOp()),
            ),
          ),
          M.option,
        )
        return [
          evo(model, {
            route: () => nextRoute,
          }),
          Array.fromOption(maybeFocusUsernameInput),
        ]
      },

      GotHomeMessage: ({ message }) => {
        const [nextHomeModel, homeCommands, maybeOutMessage] = Home.update(
          model.home,
          message,
        )

        const mappedCommands = homeCommands.map(
          Effect.map(message => GotHomeMessage({ message })),
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
              M.tagsExhaustive({
                SucceededRoomCreation: ({ roomId, player }) => [
                  evo(model, {
                    home: () => nextHomeModel,
                  }),
                  [...mappedCommands, ...handleRoomJoined(roomId, player)],
                ],
                SucceededRoomJoin: ({ roomId, player }) => [
                  evo(model, {
                    home: () => nextHomeModel,
                  }),
                  [...mappedCommands, ...handleRoomJoined(roomId, player)],
                ],
              }),
            ),
        })
      },

      GotRoomMessage: ({ message }) => {
        const [nextRoomModel, roomCommands] = Room.update(model.room, message)

        return [
          evo(model, {
            room: () => nextRoomModel,
          }),
          roomCommands.map(Effect.map(message => GotRoomMessage({ message }))),
        ]
      },
    }),
  )

const handleRoomJoined = (roomId: string, player: Shared.Player) => {
  const session = { roomId, player }
  return [
    navigateToRoom(roomId),
    savePlayerToSessionStorage(session),
    Effect.succeed(
      GotRoomMessage({ message: Room.Message.JoinedRoom({ roomId, player }) }),
    ),
  ]
}
