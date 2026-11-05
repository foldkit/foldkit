import type { Block } from 'foldkit'

import { makeComposition } from '../block'
import { DragAndDropBinding } from './dragAndDrop'

export const ApplicationComposition = makeComposition({
  bindings: [DragAndDropBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
