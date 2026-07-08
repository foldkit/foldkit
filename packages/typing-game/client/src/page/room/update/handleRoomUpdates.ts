import { Array, Data, Option, String as Str } from 'effect'
import { AsyncData } from 'foldkit'
import { evo } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { optionWhen } from '../../../optionWhen'
import { FocusUserGameTextInput, TickExitCountdown } from '../command'
import { Model, RoomAsyncData } from '../model'
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
    const maybePreviousRoom = AsyncData.getData(model.roomAsyncData)
    const hadRoom = Option.isSome(maybePreviousRoom)
    const hadStatusPlaying = Option.exists(
      maybePreviousRoom,
      ({ status }) => status._tag === 'Playing',
    )
    const isStatusPlaying = room.status._tag === 'Playing'

    const gameJustStarted = hadRoom && !hadStatusPlaying && isStatusPlaying

    const hadStatusFinished = Option.exists(
      maybePreviousRoom,
      ({ status }) => status._tag === 'Finished',
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

    const maybeExitCountdown = optionWhen(gameJustFinished, () =>
      TickExitCountdown(),
    )
    const maybeFocusUserGameText = optionWhen(gameJustStarted, () =>
      FocusUserGameTextInput(),
    )

    return [
      evo(model, {
        roomAsyncData: () => RoomAsyncData.Success({ data: room }),
        userGameText: () => nextUserGameText,
        charsTyped: () => nextCharsTyped,
        exitCountdownSecondsLeft: () =>
          gameJustFinished
            ? EXIT_COUNTDOWN_SECONDS
            : model.exitCountdownSecondsLeft,
      }),
      Array.appendAll(
        Array.fromOption(maybeExitCountdown),
        Array.fromOption(maybeFocusUserGameText),
      ),
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
