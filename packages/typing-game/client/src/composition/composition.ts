import type { Block } from 'foldkit'

import { ApplicationBlock } from '../definition'
import { HomeBinding } from './home'
import { MaybeRoomInstanceBinding } from './room'

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [HomeBinding, MaybeRoomInstanceBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
