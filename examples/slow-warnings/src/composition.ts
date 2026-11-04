import type { Block } from 'foldkit'

import { ApplicationBlock } from './definition'

export const ApplicationComposition = ApplicationBlock.makeComposition()
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
