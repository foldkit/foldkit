import { Effect } from 'effect'
import { Command, Task } from 'foldkit'

const getTime = Task.getTime.pipe(
  Effect.map(utc => GotTime({ utc })),
  Command.make('GetTime'),
)

const getZonedTime = Task.getZonedTime.pipe(
  Effect.map(zoned => GotZonedTime({ zoned })),
  Command.make('GetZonedTime'),
)

const getNyTime = Task.getZonedTimeIn('America/New_York').pipe(
  Effect.map(zoned => GotNyTime({ zoned })),
  Effect.catchAll(() => Effect.succeed(FailedGetTimeZone())),
  Command.make('GetNyTime'),
)
