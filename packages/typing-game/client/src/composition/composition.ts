import type { Block } from 'foldkit'

import { ApplicationDefinition } from '../definition'
import { HomeBinding } from './home'
import { MaybeRoomInstanceBinding } from './room'

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding, MaybeRoomInstanceBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
