// @ts-nocheck
import * as Shared from '@typing-game/shared'
import { Array, Chunk, Duration, Schedule, Stream, pipe } from 'effect'

export const COUNTDOWN_SECONDS = 3
export const PLAYING_SECONDS = 30
export const CHARS_PER_WORD = 5
export const ROOM_UPDATE_THROTTLE_MS = 100

const descendingRange = (top: number, bottom: number) =>
  pipe(Array.range(bottom, top), Array.reverse)

const descendingRangeStream = (top: number, bottom: number) =>
  Stream.fromIterable(descendingRange(top, bottom))

const getReadyStream = Stream.make(Shared.GetReady.make({}))

const countdownStream: Stream.Stream<Shared.Countdown> = pipe(
  descendingRangeStream(COUNTDOWN_SECONDS, 1),
  Stream.map(secondsLeft => Shared.Countdown.make({ secondsLeft })),
)

const playingStream: Stream.Stream<Shared.Playing> = pipe(
  descendingRangeStream(PLAYING_SECONDS, 1),
  Stream.map(secondsLeft => Shared.Playing.make({ secondsLeft })),
)

const finishedStream: Stream.Stream<Shared.Finished> = Stream.make(
  Shared.Finished.make({}),
)

export const gameSequence = pipe(
  getReadyStream,
  Stream.concat(
    Stream.concat(
      Chunk.make<Array.NonEmptyReadonlyArray<Stream.Stream<Shared.GameStatus>>>(
        countdownStream,
        playingStream,
        finishedStream,
      ),
    ).pipe(Stream.schedule(Schedule.fixed(Duration.seconds(1)))),
  ),
)
