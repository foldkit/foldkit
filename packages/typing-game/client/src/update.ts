import * as Shared from '@typing-game/shared'
import { Array, Match as M, Option } from 'effect'
import { Url } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  Command,
  LiftHome,
  LiftRoom,
  LoadExternal,
  NavigateInternal,
  NavigateToRoom,
} from './command'
import { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'

export type UpdateReturn = [Model, ReadonlyArray<Command>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
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

        const liftedCommands = Array.map(homeCommands, command =>
          LiftHome({ command }),
        )

        return Option.match(maybeOutMessage, {
          onNone: () => [
            evo(model, {
              home: () => nextHomeModel,
            }),
            liftedCommands,
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
                    [...liftedCommands, ...roomCommands],
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
              Array.map(roomCommands, command => LiftRoom({ command })),
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
): UpdateReturn => {
  const [nextRoomModel, roomCommands] = Room.update(
    model.room,
    Room.Message.SucceededJoinRoom({ player }),
    { roomId },
  )

  return [
    evo(model, { room: () => nextRoomModel }),
    [
      NavigateToRoom({ roomId }),
      ...Array.map(roomCommands, command => LiftRoom({ command })),
    ],
  ]
}
