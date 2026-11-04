import type { Block } from 'foldkit'

import { BlockPageBlock } from './definition'

export const BlockPageComposition = BlockPageBlock.makeComposition()
export type BlockPageViewBuilder = Block.ViewBuilderFor<
  typeof BlockPageComposition
>
