import * as Shared from '@typing-game/shared'
import { Array, Effect, Match as M, Option } from 'effect'
import { Command, Task, Url } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { navigateToRoom, savePlayerSession } from './command'
import { USERNAME_INPUT_ID } from './constant'
import {
  CompletedFocusUsernameInput,
  CompletedLoadExternal,
  CompletedNavigateInternal,
  GotHomeMessage,
  GotRoomMessage,
  Message,
} from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'

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
                pushUrl(Url.toString(url)).pipe(
                  Effect.as(CompletedNavigateInternal()),
                  Command.make('NavigateInternal'),
                ),
              ],
            ],
            External: ({ href }) => [
              model,
              [
                load(href).pipe(
                  Effect.as(CompletedLoadExternal()),
                  Command.make('LoadExternal'),
                ),
              ],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const maybeFocusUsernameInput = M.value(nextRoute).pipe(
          M.tag('Home', () =>
            Task.focus(`#${USERNAME_INPUT_ID}`).pipe(
              Effect.ignore,
              Effect.as(CompletedFocusUsernameInput()),
              Command.make('FocusUsernameInput'),
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
      'CompletedFocusUsernameInput',
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
    Room.Message.JoinedRoom({ roomId, player }),
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
