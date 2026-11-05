import type { Block } from 'foldkit'

import { makeComposition } from '../block'
import { HomeBinding } from './home'
import { MaybeRoomInstanceBinding } from './room'

export const ApplicationComposition = makeComposition({
  bindings: [HomeBinding, MaybeRoomInstanceBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
