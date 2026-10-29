import { Effect, Layer, ManagedRuntime } from 'effect'
import { Server } from 'foldkit/experimental'

import { configurationEvaluations } from './configuration.ts'
import { generation } from './generation.ts'

const releasedGenerations: Array<number> =
  import.meta.hot?.data.releasedGenerations ?? []

const resource = Layer.effectDiscard(
  Effect.acquireRelease(
    Effect.sync(() => ({ generation })),
    ({ generation: acquiredGeneration }) =>
      Effect.sync(() => {
        releasedGenerations.push(acquiredGeneration)
      }),
  ),
)

const runtime = ManagedRuntime.make(resource)

import.meta.hot?.dispose(data => {
  data.releasedGenerations = releasedGenerations
  return runtime.dispose()
})

import.meta.hot?.send('fixture:evaluated-entry', { generation })

export const loadLazyValue = async (): Promise<number> =>
  (await import('./lazy.ts')).lazyValue

export const renderPage = (): Promise<Server.EntryResult> =>
  runtime.runPromise(
    Effect.succeed(
      Server.Responded(
        Response.json({
          generation,
          releasedGenerations,
          configurationEvaluations,
        }),
      ),
    ),
  )
