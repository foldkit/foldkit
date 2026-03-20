import * as Shared from '@typing-game/shared'
import {
  Array,
  Effect,
  Match as M,
  Number,
  Option,
  String as Str,
  pipe,
} from 'effect'
import { Command, Task } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { clearSession, savePlayerSession } from '../../../command'
import { ROOM_PAGE_USERNAME_INPUT_ID } from '../../../constant'
import { optionWhen } from '../../../optionWhen'
import { homeRouter } from '../../../route'
import {
  copyRoomIdToClipboard,
  hideRoomIdCopiedIndicator,
  joinRoom,
  startGame,
  tickExitCountdown,
  updatePlayerProgress,
} from '../command'
import {
  CompletedHomeNavigation,
  CompletedRoomPageUsernameInputFocus,
  Message,
} from '../message'
import { Model, RoomRemoteData } from '../model'
import { validateUserTextInput } from '../userGameText'
import { handleRoomUpdated } from './handleRoomUpdates'

export type UpdateReturn = [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedRoomPageUsernameInputFocus: () => [model, []],

      CompletedUserGameTextInputFocus: () => [model, []],

      CompletedHomeNavigation: () => [model, []],

      CompletedGameStartRequest: () => [model, []],

      CompletedPlayerProgressUpdate: () => [model, []],

      CompletedSessionSave: () => [model, []],

      CompletedSessionClear: () => [model, []],

      FailedRoomJoin: () => [model, []],

      FailedClipboardCopy: () => [model, []],

      PressedKey: handleKeyPressed(model),

      ChangedUserText: ({ value }) => {
        const maybeRoom = M.value(model.roomRemoteData).pipe(
          M.tag('Ok', ({ data }) => data),
          M.option,
        )

        const maybeGameText = pipe(
          maybeRoom,
          Option.flatMap(({ maybeGame }) => maybeGame),
          Option.map(({ text }) => text),
        )

        const userGameText = validateUserTextInput(value, maybeGameText)

        const newCharsTyped = pipe(
          Str.length(userGameText) - Str.length(model.userGameText),
          Number.max(0),
        )
        const nextCharsTyped = model.charsTyped + newCharsTyped

        const commands = pipe(
          Option.all([
            model.maybeSession,
            Option.flatMap(maybeRoom, ({ maybeGame }) => maybeGame),
          ]),
          Option.map(([session, game]) =>
            updatePlayerProgress(
              session.player.id,
              game.id,
              userGameText,
              nextCharsTyped,
            ),
          ),
        )

        return [
          evo(model, {
            userGameText: () => userGameText,
            charsTyped: () => nextCharsTyped,
          }),
          Array.fromOption(commands),
        ]
      },

      BlurredRoomPageUsernameInput: () => [
        model,
        [
          Task.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(CompletedRoomPageUsernameInputFocus()),
            Command.make('FocusRoomUsernameInput'),
          ),
        ],
      ],

      ChangedRoomPageUsername: ({ value }) => [
        evo(model, {
          username: () => value,
        }),
        [],
      ],

      SubmittedJoinRoomFromPage: ({ roomId }) => {
        const maybeJoinRoom = optionWhen(Str.isNonEmpty(model.username), () =>
          joinRoom(model.username, roomId),
        )

        return [model, Array.fromOption(maybeJoinRoom)]
      },

      UpdatedRoom: handleRoomUpdated(model),

      FailedRoomStream: ({ error: _error }) => {
        return [model, []]
      },

      RequestedStartGame: ({ roomId, playerId }) => [
        model,
        [startGame(roomId, playerId)],
      ],

      LoadedSession: ({ maybeSession }) => [
        evo(model, {
          maybeSession: () => maybeSession,
        }),
        [],
      ],

      SucceededRoomFetch: ({ room }) => {
        const maybeFocusRoomUsernameInput = Option.match(model.maybeSession, {
          onNone: () =>
            Option.some(
              Task.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`).pipe(
                Effect.ignore,
                Effect.as(CompletedRoomPageUsernameInputFocus()),
                Command.make('FocusRoomUsernameInput'),
              ),
            ),
          onSome: () => Option.none(),
        })

        return [
          evo(model, {
            roomRemoteData: () => RoomRemoteData.Ok({ data: room }),
          }),
          Array.fromOption(maybeFocusRoomUsernameInput),
        ]
      },

      FailedRoomFetch: () => [
        evo(model, {
          roomRemoteData: () =>
            RoomRemoteData.Error({ error: 'Room not found' }),
        }),
        [],
      ],

      ClickedCopyRoomId: ({ roomId }) => [
        model,
        [copyRoomIdToClipboard(roomId)],
      ],

      SucceededCopyRoomId: () =>
        model.isRoomIdCopyIndicatorVisible
          ? [model, []]
          : [
              evo(model, {
                isRoomIdCopyIndicatorVisible: () => true,
              }),
              [hideRoomIdCopiedIndicator()],
            ],

      HiddenRoomIdCopiedIndicator: () => [
        evo(model, {
          isRoomIdCopyIndicatorVisible: () => false,
        }),
        [],
      ],

      TickedExitCountdown: () => {
        const nextSecondsLeft = Number.decrement(model.exitCountdownSecondsLeft)
        const maybeTick = optionWhen(
          nextSecondsLeft > 0,
          () => tickExitCountdown,
        )

        return [
          evo(model, {
            exitCountdownSecondsLeft: () => nextSecondsLeft,
          }),
          Array.fromOption(maybeTick),
        ]
      },

      JoinedRoom: ({ roomId, player }) => {
        const session = { roomId, player }
        return [
          evo(model, {
            maybeSession: () => Option.some(session),
          }),
          [savePlayerSession(session)],
        ]
      },
    }),
  )

const handleKeyPressed =
  (model: Model) =>
  ({ key }: { key: string }): UpdateReturn =>
    M.value(model.roomRemoteData).pipe(
      withUpdateReturn,
      M.tag('Ok', ({ data: room }) =>
        M.value(room.status).pipe(
          withUpdateReturn,
          M.tag('Waiting', () => whenWaiting(model, key, room)),
          M.tag('Finished', () => whenFinished(model, key, room)),
          M.orElse(() => [model, []]),
        ),
      ),
      M.orElse(() => [model, []]),
    )

const whenWaiting = (
  model: Model,
  key: string,
  room: Shared.Room,
): UpdateReturn =>
  M.value(key).pipe(
    withUpdateReturn,
    M.when('Backspace', () => leaveRoom(model)),
    M.when('Enter', handleStartGame(model, room)),
    M.orElse(() => [model, []]),
  )

const whenFinished = (
  model: Model,
  key: string,
  room: Shared.Room,
): UpdateReturn =>
  M.value(key).pipe(
    withUpdateReturn,
    M.when('Backspace', () =>
      model.exitCountdownSecondsLeft === 0 ? leaveRoom(model) : [model, []],
    ),
    M.when('Enter', handleStartGame(model, room)),
    M.orElse(() => [model, []]),
  )

const leaveRoom = (model: Model): UpdateReturn => [
  evo(model, {
    maybeSession: () => Option.none(),
    roomRemoteData: () => RoomRemoteData.Loading(),
  }),
  [
    clearSession(),
    pushUrl(homeRouter()).pipe(
      Effect.as(CompletedHomeNavigation()),
      Command.make('NavigateHome'),
    ),
  ],
]

const handleStartGame = (model: Model, room: Shared.Room) => (): UpdateReturn =>
  Option.match(model.maybeSession, {
    onSome: session => {
      const isHost = session.player.id === room.hostId
      const maybeStartGame = optionWhen(isHost, () =>
        startGame(room.id, session.player.id),
      )
      return [model, Array.fromOption(maybeStartGame)]
    },
    onNone: () => [model, []],
  })
