import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const LoggedInComposition = makeComposition()
export type LoggedInViewBuilder = Block.ViewBuilderFor<
  typeof LoggedInComposition
>
