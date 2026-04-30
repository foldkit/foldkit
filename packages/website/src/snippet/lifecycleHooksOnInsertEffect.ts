import { Effect, Schema as S } from 'effect'
import type { Html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Class, OnInsertEffect, div } from '../html'

const SucceededLoadPlayground = m('SucceededLoadPlayground')
const FailedLoadPlayground = m('FailedLoadPlayground', { reason: S.String })

// Async work whose outcome must reach the Model. The Effect runs through
// the Foldkit runtime when the element mounts, and its result is
// dispatched as a regular Message. Failures are routed through
// `Effect.catchAll` and become Messages too.

const embedPlayground = (element: Element): Effect.Effect<Message> =>
  Effect.tryPromise(() =>
    import('@stackblitz/sdk').then(({ default: sdk }) =>
      sdk.embedProject(element, {
        title: 'Counter',
        template: 'node',
        files: {},
      }),
    ),
  ).pipe(
    Effect.as(SucceededLoadPlayground()),
    Effect.catchAll(error =>
      Effect.succeed(
        FailedLoadPlayground({
          reason: error instanceof Error ? error.message : String(error),
        }),
      ),
    ),
  )

const playgroundView = (): Html =>
  div([Class('flex-1 min-h-0'), OnInsertEffect(embedPlayground)], [])
