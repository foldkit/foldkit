import { Effect, Layer } from 'effect'
import { Server } from 'foldkit/experimental'

import { ApplicationLive, revision } from './declarations'

export const renderPage = async (): Promise<Server.EntryResult> => {
  await Effect.runPromise(Effect.scoped(Layer.build(ApplicationLive)))

  return Server.Responded(new Response(`revision ${revision}`))
}
