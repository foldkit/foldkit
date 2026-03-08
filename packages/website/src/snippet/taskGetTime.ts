import { Effect } from 'effect'
import { Task } from 'foldkit'

const getTime = Task.getTime.pipe(Effect.map(utc => GotTime({ utc })))

const getZonedTime = Task.getZonedTime.pipe(
  Effect.map(zoned => GotZonedTime({ zoned })),
)

const getNyTime = Task.getZonedTimeIn('America/New_York').pipe(
  Effect.map(zoned => GotNyTime({ zoned })),
  Effect.catchAll(() => Effect.succeed(FailedTimeZone())),
)
