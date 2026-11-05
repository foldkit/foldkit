import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const HomeComposition = makeComposition()
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
