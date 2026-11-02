import { Effect, Layer } from 'effect'
import { Server } from 'foldkit/experimental'

import { revision, subscriptions } from './declarations'
import { ApplicationDefinition, Model } from './definition'

const composition = ApplicationDefinition.makeComposition()

const init = composition.makeInit(() => ({
  model: Model.make({ isTicking: false }),
}))
const update = composition.makeUpdate({
  Ticked: model => ({ model }),
  CompletedLoadPreferences: model => ({ model }),
})
const block = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      subscriptions,
      EffectsLayer: subscriptions.layer,
    }
  }),
)

export const renderPage = async (): Promise<Server.EntryResult> => {
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const application = yield* block.get
        yield* Layer.build(application.EffectsLayer)
      }),
    ).pipe(Effect.provide(block.layer)),
  )

  return Server.Responded(new Response(`revision ${revision}`))
}
