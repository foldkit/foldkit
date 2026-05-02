import { Effect } from 'effect'
import { Command, Task } from 'foldkit'

const GetTime = Command.define('GetTime', GotTime)
const GetZonedTime = Command.define('GetZonedTime', GotZonedTime)
const GetNyTime = Command.define(
  'GetNyTime',
  SucceededGetNyTime,
  FailedGetTimeZone,
)

const getTime = GetTime(Task.getTime.pipe(Effect.map(utc => GotTime({ utc }))))

const getZonedTime = GetZonedTime(
  Task.getZonedTime.pipe(Effect.map(zoned => GotZonedTime({ zoned }))),
)

const getNyTime = GetNyTime(
  Task.getZonedTimeIn('America/New_York').pipe(
    Effect.map(zoned => SucceededGetNyTime({ zoned })),
    Effect.catch(() => Effect.succeed(FailedGetTimeZone())),
  ),
)
