import { type Block } from 'foldkit'

import * as Root from './blockApplicationRootContract'

export const ApplicationBlock: ApplicationRoot =
  Root.ApplicationComposition.assembleRoot(Root.implementation)

export type ApplicationRoot = Block.Root<
  typeof Root.ApplicationDefinition.owner,
  typeof Root.Model,
  Root.ApplicationMessage,
  Root.ApplicationImplementation,
  Root.ApplicationRootChannels
>
