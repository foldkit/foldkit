import { Layer } from 'effect'

import { Dialog } from '@foldkit/ui'

import { CommandPaletteBlock } from './block'
import { ScrollActiveResult } from './command'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = CommandPaletteBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  subscriptions,
  EffectsLayer: Layer.mergeAll(subscriptions.layer, ScrollActiveResult.layer),
}).pipe(Layer.provide(Dialog.layer))
