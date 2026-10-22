import { type Block } from 'foldkit'

import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

const implementation = {
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
}

interface ApplicationRootChannels extends Block.RootChannelsFor<
  typeof ApplicationComposition,
  typeof implementation
> {}

type ApplicationMessageSchema = typeof ApplicationComposition.Message

interface ApplicationMessage extends ApplicationMessageSchema {}

type ApplicationImplementationContract = typeof implementation

interface ApplicationImplementation extends ApplicationImplementationContract {}

type ApplicationRootContract = Block.Root<
  typeof ApplicationDefinition.owner,
  typeof Model,
  ApplicationMessage,
  ApplicationImplementation,
  ApplicationRootChannels
>

export type ApplicationRoot = ApplicationRootContract

export const ApplicationBlock: ApplicationRoot =
  ApplicationComposition.assembleRoot(implementation)
