import * as Shared from '@typing-game/shared'
import { Array, Data, Effect, Match as M, Option, String as Str } from 'effect'
import { Task } from 'foldkit'
import { evo } from 'foldkit/struct'

import { USER_GAME_TEXT_INPUT_ID } from '../../../constant'
import { optionWhen } from '../../../optionWhen'
import { exitCountdownTick } from '../command'
import { NoOp } from '../message'
import { Model, RoomRemoteData } from '../model'
import type { UpdateReturn } from './update'

const EXIT_COUNTDOWN_SECONDS = 3

export const handleRoomUpdated =
  (model: Model) =>
  ({
    room,
    maybePlayerProgress,
  }: {
    room: Shared.Room
    maybePlayerProgress: Option.Option<Shared.PlayerProgress>
  }): UpdateReturn => {
    const hadRoom = M.value(model.roomRemoteData).pipe(
      M.tag('Ok', () => true),
      M.orElse(() => false),
    )
    const hadStatusPlaying = M.value(model.roomRemoteData).pipe(
      M.tag('Ok', ({ data }) => data.status._tag === 'Playing'),
      M.orElse(() => false),
    )
    const isStatusPlaying = room.status._tag === 'Playing'

    const gameJustStarted = hadRoom && !hadStatusPlaying && isStatusPlaying

    const hadStatusFinished = M.value(model.roomRemoteData).pipe(
      M.tag('Ok', ({ data }) => data.status._tag === 'Finished'),
      M.orElse(() => false),
    )
    const isStatusFinished = room.status._tag === 'Finished'
    const gameJustFinished = hadRoom && !hadStatusFinished && isStatusFinished

    const progressAction = determinePlayerProgressAction(
      room,
      model.userGameText,
      model.charsTyped,
      maybePlayerProgress,
    )

    const nextUserGameText = gameJustStarted
      ? Str.empty
      : PlayerProgressAction.$match(progressAction, {
          Clear: () => Str.empty,
          Maintain: ({ userGameText }) => userGameText,
          Restore: ({ progress: { userText } }) => userText,
        })

    const nextCharsTyped = gameJustStarted
      ? 0
      : PlayerProgressAction.$match(progressAction, {
          Clear: () => 0,
          Maintain: ({ charsTyped }) => charsTyped,
          Restore: ({ progress }) => progress.charsTyped,
        })

    const isFirstRoomUpdate = !hadRoom
    const hasGame = Option.isSome(room.maybeGame)

    const shouldFocus = (gameJustStarted || isFirstRoomUpdate) && hasGame

    const mabyeFocusUserGameTextInput = optionWhen(shouldFocus, () =>
      Task.focus(`#${USER_GAME_TEXT_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(NoOp()),
      ),
    )

    const maybeExitCountdown = optionWhen(
      gameJustFinished,
      () => exitCountdownTick,
    )

    return [
      evo(model, {
        roomRemoteData: () => RoomRemoteData.Ok({ data: room }),
        userGameText: () => nextUserGameText,
        charsTyped: () => nextCharsTyped,
        exitCountdownSecondsLeft: () =>
          gameJustFinished
            ? EXIT_COUNTDOWN_SECONDS
            : model.exitCountdownSecondsLeft,
      }),
      Array.getSomes([mabyeFocusUserGameTextInput, maybeExitCountdown]),
    ]
  }

type PlayerProgressAction = Data.TaggedEnum<{
  Clear: {}
  Maintain: { userGameText: string; charsTyped: number }
  Restore: { progress: Shared.PlayerProgress }
}>

const PlayerProgressAction = Data.taggedEnum<PlayerProgressAction>()

const determinePlayerProgressAction = (
  room: Shared.Room,
  currentUserGameText: string,
  currentCharsTyped: number,
  maybePlayerProgress: Option.Option<Shared.PlayerProgress>,
): PlayerProgressAction => {
  if (room.status._tag === 'Finished') {
    return PlayerProgressAction.Clear()
  } else if (Str.isNonEmpty(currentUserGameText)) {
    return PlayerProgressAction.Maintain({
      userGameText: currentUserGameText,
      charsTyped: currentCharsTyped,
    })
  } else {
    return Option.match(maybePlayerProgress, {
      onSome: progress => PlayerProgressAction.Restore({ progress }),
      onNone: () => PlayerProgressAction.Clear(),
    })
  }
}
