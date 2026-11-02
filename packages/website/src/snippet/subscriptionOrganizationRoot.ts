import { Effect } from 'effect'
// block.ts

import { ApplicationDefinition } from './definition'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer: subscriptions.layer,
    }
  }),
)

// entry.ts
import { Program } from 'foldkit'

import { ApplicationBlock } from './block'

export const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})
