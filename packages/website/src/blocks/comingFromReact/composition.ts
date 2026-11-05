import type { Block } from 'foldkit'

import { makeComposition } from './block'
export const ComingFromReactComposition = makeComposition()
export type ComingFromReactViewBuilder = Block.ViewBuilderFor<
  typeof ComingFromReactComposition
>
