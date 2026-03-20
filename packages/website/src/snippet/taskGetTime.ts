import { Effect } from 'effect'
import { Command, Task } from 'foldkit'

const GetTime = Command.define('GetTime')
const GetZonedTime = Command.define('GetZonedTime')
const GetNyTime = Command.define('GetNyTime')

const getTime = GetTime(Task.getTime.pipe(Effect.map(utc => GotTime({ utc }))))

const getZonedTime = GetZonedTime(
  Task.getZonedTime.pipe(Effect.map(zoned => GotZonedTime({ zoned }))),
)

const getNyTime = GetNyTime(
  Task.getZonedTimeIn('America/New_York').pipe(
    Effect.map(zoned => GotNyTime({ zoned })),
    Effect.catchAll(() => Effect.succeed(FailedGetTimeZone())),
  ),
)
