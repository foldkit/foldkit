import * as Shared from '@typing-game/shared'
import {
  Array,
  Data,
  Effect,
  HashMap,
  Number,
  Option,
  String,
  SubscriptionRef,
  pipe,
} from 'effect'

import { CHARS_PER_WORD, PLAYING_SECONDS } from './game.js'

type ProgressByGamePlayer = HashMap.HashMap<
  Shared.GamePlayer,
  Shared.PlayerProgress
>

const calculatePlayerScore = (
  player: Shared.Player,
  maybePlayerProgress: Option.Option<Shared.PlayerProgress>,
  gameDurationSeconds: number,
): Shared.PlayerScore => {
  const charsTyped = Option.match(maybePlayerProgress, {
    onSome: ({ charsTyped }) => charsTyped,
    onNone: () => 0,
  })

  const correctChars = Option.match(maybePlayerProgress, {
    onSome: ({ userText }) => String.length(userText),
    onNone: () => 0,
  })

  const minutes = gameDurationSeconds / 60
  const wpm = charsTyped / CHARS_PER_WORD / minutes
  const accuracy = pipe(
    correctChars,
    Number.divide(charsTyped),
    Option.match({ onSome: Number.multiply(100), onNone: () => 0 }),
  )

  return Shared.PlayerScore.make({
    playerId: player.id,
    username: player.username,
    wpm,
    accuracy,
    charsTyped,
    correctChars,
  })
}

export const calculateScoreboard = (
  room: Shared.Room,
  progressByGamePlayer: ProgressByGamePlayer,
): Shared.Scoreboard =>
  Effect.gen(function* () {
    const game = yield* room.maybeGame

    const scores = Array.map(room.players, player => {
      const gamePlayer = Data.Struct(
        Shared.GamePlayer.make({
          gameId: game.id,
          playerId: player.id,
        }),
      )
      const maybeProgress = HashMap.get(progressByGamePlayer, gamePlayer)
      return calculatePlayerScore(player, maybeProgress, PLAYING_SECONDS)
    })

    return scores
  }).pipe(
    Effect.catch(() => Effect.succeed([])),
    Effect.runSync,
  )

export const getPlayerProgress = (
  progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>,
  playerId: string,
  gameId: string,
): Effect.Effect<Option.Option<Shared.PlayerProgress>> =>
  Effect.gen(function* () {
    const progressByGamePlayer = yield* SubscriptionRef.get(
      progressByGamePlayerRef,
    )
    const gamePlayer = Data.Struct(Shared.GamePlayer.make({ gameId, playerId }))
    return HashMap.get(progressByGamePlayer, gamePlayer)
  })
