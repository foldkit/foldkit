import type { Block } from 'foldkit'

import { Application } from '../definition'
import { DragAndDropBinding } from './dragAndDrop'

export const ApplicationComposition = Application.makeComposition({
  childBindings: [DragAndDropBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
