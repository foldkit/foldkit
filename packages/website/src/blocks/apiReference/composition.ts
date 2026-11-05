import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const ApiReferenceComposition = makeComposition()
export type ApiReferenceViewBuilder = Block.ViewBuilderFor<
  typeof ApiReferenceComposition
>
