import { Effect, Layer } from 'effect'
import { Server } from 'foldkit/experimental'
import { withBlock } from 'foldkit/story'

import { revision, subscriptions } from './declarations'
import { ApplicationBlock, Model } from './definition'

const composition = ApplicationBlock.makeComposition()

const init = composition.makeInit(() => ({
  model: Model.make({ isTicking: false }),
}))
const update = composition.makeUpdate({
  Ticked: model => ({ model }),
  CompletedLoadPreferences: model => ({ model }),
})
const layer = ApplicationBlock.makeLayer(
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
    withBlock({ block: ApplicationBlock, layer }, application =>
      Effect.asVoid(Layer.build(application.EffectsLayer)),
    ),
  )

  return Server.Responded(new Response(`revision ${revision}`))
}
