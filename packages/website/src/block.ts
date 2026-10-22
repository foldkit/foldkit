import type {
  ApplicationContract,
  ApplicationImplementation,
} from './block.contract'
import { ApplicationComposition } from './composition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

const assembled =
  ApplicationComposition.assembleAs<ApplicationImplementation>()({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer,
  })

export const ApplicationBlock: ApplicationContract = assembled
export type AssembledApplication = typeof assembled
