import type { Block } from 'foldkit'

import { BlockPageDefinition } from './definition'

export const BlockPageComposition = BlockPageDefinition.makeComposition()
export type BlockPageViewBuilder = Block.ViewBuilderFor<
  typeof BlockPageComposition
>
