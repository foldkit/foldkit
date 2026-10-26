import { Layer } from 'effect'
import { Block } from 'foldkit'

import { SaveProject } from './command'
import { ProjectSettingsComposition } from './composition'
import type { Model } from './definition'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  ProjectSettingsComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer: Layer.mergeAll(SaveProject.layer, subscriptions.layer),
  })
export const ProjectSettingsBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
