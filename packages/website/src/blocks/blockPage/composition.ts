import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const BlockPageComposition = makeComposition()
export type BlockPageViewBuilder = Block.ViewBuilderFor<
  typeof BlockPageComposition
>
