import { type Block } from 'foldkit'

import { ApplicationComposition, init, update, view } from './blockProfile'

export { ApplicationComposition } from './blockProfile'
export { ApplicationDefinition, Model } from './blockProfileContract'

export const implementation = { init, update, view }

type ApplicationMessageSchema = typeof ApplicationComposition.Message
export interface ApplicationMessage extends ApplicationMessageSchema {}

type ApplicationImplementationContract = typeof implementation
export interface ApplicationImplementation extends ApplicationImplementationContract {}

export interface ApplicationRootChannels extends Block.RootChannelsFor<
  typeof ApplicationComposition,
  typeof implementation
> {}
