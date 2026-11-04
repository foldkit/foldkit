import type { Block } from 'foldkit'

import { ApplicationBlock } from '../definition'
import { DragAndDropBinding } from './dragAndDrop'

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [DragAndDropBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
