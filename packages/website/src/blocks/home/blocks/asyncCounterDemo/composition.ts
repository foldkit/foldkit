import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const AsyncCounterDemoComposition = makeComposition()
export type AsyncCounterDemoViewBuilder = Block.ViewBuilderFor<
  typeof AsyncCounterDemoComposition
>
