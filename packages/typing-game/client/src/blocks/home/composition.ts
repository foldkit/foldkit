import type { Block } from 'foldkit'

import { HomeBlock } from './definition'

export const HomeComposition = HomeBlock.makeComposition()
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
