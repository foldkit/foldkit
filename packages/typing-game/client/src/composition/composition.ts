import type { Block } from 'foldkit'

import { Application } from '../definition'
import { HomeBinding } from './home'
import { RoomBinding } from './room'

export const ApplicationComposition = Application.makeComposition({
  childBindings: [HomeBinding, RoomBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
