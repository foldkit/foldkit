import type { Block } from 'foldkit'

import { ApiReferenceDefinition } from './definition'

export const ApiReferenceComposition = ApiReferenceDefinition.makeComposition()
export type ApiReferenceViewBuilder = Block.ViewBuilderFor<
  typeof ApiReferenceComposition
>
