import { Server } from 'foldkit/experimental'

import { configurationEvaluations } from './configuration.ts'
import { generation } from './generation.ts'

const releasedGenerations: ReadonlyArray<number> =
  import.meta.hot?.data.releasedGenerations ?? []

import.meta.hot?.dispose(data => {
  data.releasedGenerations = [...releasedGenerations, generation]
})

import.meta.hot?.send('fixture:evaluated-entry', { generation })

export const loadLazyValue = async (): Promise<number> =>
  (await import('./lazy.ts')).lazyValue

export const renderPage = async (): Promise<Server.EntryResult> =>
  Server.Responded(
    Response.json({
      generation,
      releasedGenerations,
      configurationEvaluations,
    }),
  )
