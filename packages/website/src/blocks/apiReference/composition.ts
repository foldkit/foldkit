import type { Block } from 'foldkit'

import { ApiReferenceBlock } from './definition'

export const ApiReferenceComposition = ApiReferenceBlock.makeComposition()
export type ApiReferenceViewBuilder = Block.ViewBuilderFor<
  typeof ApiReferenceComposition
>
