import { Layer } from 'effect'

import { Popover } from '@foldkit/ui'

import { NotificationCenterBlock } from './block'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = NotificationCenterBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  subscriptions,
  EffectsLayer: subscriptions.layer,
}).pipe(Layer.provide(Popover.layer))
