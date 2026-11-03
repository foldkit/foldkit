import type { Block } from 'foldkit'

import { ComingFromReactDefinition } from './definition'
export const ComingFromReactComposition =
  ComingFromReactDefinition.makeComposition()
export type ComingFromReactViewBuilder = Block.ViewBuilderFor<
  typeof ComingFromReactComposition
>
