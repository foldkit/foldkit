// layer.ts

import { ApplicationBlock } from './block'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer: subscriptions.layer,
})

// entry.ts
import { Program } from 'foldkit'

import { ApplicationBlock } from './block'

export const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

export { ApplicationBlock } from './block'
