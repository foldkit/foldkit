import type { Block } from 'foldkit'

import { ComingFromReactBlock } from './definition'
export const ComingFromReactComposition = ComingFromReactBlock.makeComposition()
export type ComingFromReactViewBuilder = Block.ViewBuilderFor<
  typeof ComingFromReactComposition
>
