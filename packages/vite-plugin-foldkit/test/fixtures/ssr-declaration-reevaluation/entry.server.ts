import { Effect, Layer } from 'effect'
import { Block } from 'foldkit'
import { Server } from 'foldkit/experimental'

import { revision, subscriptions } from './declarations'
import { ApplicationDefinition, Model } from './definition'

const composition = ApplicationDefinition.makeComposition()

const prepareBlock = () =>
  composition.prepareBlock({
    init: () => ({ model: Model.make({ isTicking: false }) }),
    update: composition.makeUpdate({
      Ticked: model => ({ model }),
      CompletedLoadPreferences: model => ({ model }),
    }),
    subscriptions,
    EffectsLayer: subscriptions.layer,
  })

const block: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareBlock
> = Block.assemble(prepareBlock)

export const renderPage = async (): Promise<Server.EntryResult> => {
  await Effect.runPromise(Effect.scoped(Layer.build(block.EffectsLayer)))

  return Server.Responded(new Response(`revision ${revision}`))
}
