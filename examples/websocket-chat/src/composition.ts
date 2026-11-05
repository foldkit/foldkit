import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const ApplicationComposition = makeComposition()
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
