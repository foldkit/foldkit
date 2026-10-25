import { Block } from 'foldkit'

import { ApplicationComposition } from './composition'
import { init } from './init'
import { EffectsLayer } from './layer'
import type { Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

interface ApplicationImplementation {
  readonly init: typeof init
  readonly update: typeof update
  readonly view: typeof view
  readonly subscriptions: typeof subscriptions
  readonly EffectsLayer: typeof EffectsLayer
}

const prepare = (): Block.AssemblyDraft<
  Block.CompletedWithView<
    typeof ApplicationComposition,
    ApplicationImplementation
  >
> =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer,
  } satisfies ApplicationImplementation)
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
