import { Block } from 'foldkit'

import { ApplicationComposition } from './composition'
import { init } from './init'
import type { Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer: subscriptions.layer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
