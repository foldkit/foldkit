import { Effect, Layer, ManagedRuntime, Schedule } from 'effect'
import { Server } from 'foldkit/experimental'

import { ApplicationBlock } from './block'
import { readCountCookie } from './cookie'
import { Flags } from './flags'

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

const flagsForRequest = (request: Request): Flags => ({
  initialCount: readCountCookie(request.headers.get('cookie') ?? ''),
})

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  runtime.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        ApplicationBlock,
        { Flags },
        {
          flags: flagsForRequest(request),
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
