import { Effect, Layer, ManagedRuntime, Schedule } from 'effect'
import { Server } from 'foldkit/experimental'

import { readCountCookie } from './cookie'
import { Flags, init, view } from './main'

const HEARTBEAT_URL = 'https://status.example/heartbeat'
const HEARTBEAT_INTERVAL = '2 minutes'

const sendHeartbeat = Effect.tryPromise(() =>
  fetch(HEARTBEAT_URL, { method: 'POST' }),
).pipe(
  Effect.catch(() => Effect.logWarning('Could not send heartbeat')),
  Effect.repeat(Schedule.spaced(HEARTBEAT_INTERVAL)),
)

const Heartbeat = Layer.effectDiscard(Effect.forkScoped(sendHeartbeat))

const runtime = ManagedRuntime.make(Heartbeat)

import.meta.hot?.dispose(() => runtime.dispose())

export const renderDocument = Server.renderDocument

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  runtime.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        { Flags, init, view },
        {
          flags: {
            initialCount: readCountCookie(request.headers.get('cookie') ?? ''),
          },
        },
      )

      return Server.Rendered(renderedApplication, {
        headers: {
          'cache-control': 'private, no-store',
          vary: 'cookie',
        },
      })
    }),
  )
