import { Block } from 'foldkit'

import { ApplicationComposition } from './composition'
import { init } from './init'
import { EffectsLayer } from './layer'
import type { Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
