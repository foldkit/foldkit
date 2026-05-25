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
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { optionWhen } from '../../../optionWhen'
import { homeRouter } from '../../../route'
import {
  ClearSession,
  CopyRoomId,
  FocusRoomPageUsernameInput,
  HideRoomIdCopiedIndicator,
  JoinRoom,
  SavePlayerSession,
  StartGame,
  TickExitCountdown,
  UpdatePlayerProgress,
} from '../command'
import { CompletedNavigateHome, Message } from '../message'
import { Model, RoomRemoteData } from '../model'
import { validateUserTextInput } from '../userGameText'
import { handleRoomUpdated } from './handleRoomUpdates'

const NavigateHome = Command.define(
  'NavigateHome',
  CompletedNavigateHome,
)(pushUrl(homeRouter()).pipe(Effect.as(CompletedNavigateHome())))

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Per-dispatch parent state the Room page needs from the root.
 *  `roomId` comes from the current Room route when the user is on the
 *  Room page, or from the just-created room when the join flow
 *  bridges from Home. */
export type Context = Readonly<{
  roomId: string
}>

export const update = (
  model: Model,
  message: Message,
  context: Context,
): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tags({
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
            UpdatePlayerProgress({
              playerId: session.player.id,
              gameId: game.id,
              userGameText,
              charsTyped: nextCharsTyped,
            }),
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
        [FocusRoomPageUsernameInput()],
      ],

      ChangedRoomPageUsername: ({ value }) => [
        evo(model, {
          username: () => value,
        }),
        [],
      ],

      SubmittedJoinRoomFromPage: () => {
        const maybeJoinRoom = optionWhen(Str.isNonEmpty(model.username), () =>
          JoinRoom({ username: model.username, roomId: context.roomId }),
        )

        return [model, Array.fromOption(maybeJoinRoom)]
      },

      UpdatedRoom: handleRoomUpdated(model),

      FailedStreamRoom: ({ error: _error }) => {
        return [model, []]
      },

      RequestedStartGame: ({ playerId }) => [
        model,
        [StartGame({ roomId: context.roomId, playerId })],
      ],

      LoadedSession: ({ maybeSession }) => {
        const maybeFocus = optionWhen(
          Option.isNone(maybeSession) && model.roomRemoteData._tag === 'Ok',
          () => FocusRoomPageUsernameInput(),
        )
        return [
          evo(model, {
            maybeSession: () => maybeSession,
          }),
          Array.fromOption(maybeFocus),
        ]
      },

      SucceededFetchRoom: ({ room }) => {
        const maybeFocus = optionWhen(Option.isNone(model.maybeSession), () =>
          FocusRoomPageUsernameInput(),
        )
        return [
          evo(model, {
            roomRemoteData: () => RoomRemoteData.Ok({ data: room }),
          }),
          Array.fromOption(maybeFocus),
        ]
      },

      FailedFetchRoom: () => [
        evo(model, {
          roomRemoteData: () =>
            RoomRemoteData.Error({ error: 'Room not found' }),
        }),
        [],
      ],

      ClickedCopyRoomId: () => [
        model,
        [CopyRoomId({ roomId: context.roomId })],
      ],

      SucceededCopyRoomId: () =>
        model.isRoomIdCopyIndicatorVisible
          ? [model, []]
          : [
              evo(model, {
                isRoomIdCopyIndicatorVisible: () => true,
              }),
              [HideRoomIdCopiedIndicator()],
            ],

      HidRoomIdCopiedIndicator: () => [
        evo(model, {
          isRoomIdCopyIndicatorVisible: () => false,
        }),
        [],
      ],

      TickedExitCountdown: () => {
        const nextSecondsLeft = Number.decrement(model.exitCountdownSecondsLeft)
        const maybeTick = optionWhen(nextSecondsLeft > 0, () =>
          TickExitCountdown(),
        )

        return [
          evo(model, {
            exitCountdownSecondsLeft: () => nextSecondsLeft,
          }),
          Array.fromOption(maybeTick),
        ]
      },

      SucceededJoinRoom: ({ player }) => {
        const session = { roomId: context.roomId, player }
        return [
          evo(model, {
            maybeSession: () => Option.some(session),
          }),
          [SavePlayerSession({ session })],
        ]
      },
    }),
    M.tag(
      'CompletedFocusRoomPageUsernameInput',
      'CompletedFocusUserGameTextInput',
      'CompletedNavigateHome',
      'SucceededStartGame',
      'FailedStartGame',
      'CompletedUpdatePlayerProgress',
      'CompletedSaveSession',
      'CompletedClearSession',
      'FailedJoinRoom',
      'FailedCopyClipboard',
      () => [model, []],
    ),
    M.exhaustive,
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
  [ClearSession(), NavigateHome()],
]

const handleStartGame = (model: Model, room: Shared.Room) => (): UpdateReturn =>
  Option.match(model.maybeSession, {
    onSome: session => {
      const isHost = session.player.id === room.hostId
      const maybeStartGame = optionWhen(isHost, () =>
        StartGame({ roomId: room.id, playerId: session.player.id }),
      )
      return [model, Array.fromOption(maybeStartGame)]
    },
    onNone: () => [model, []],
  })
