import type { Block } from 'foldkit'

import { HomeDefinition } from './definition'

export const HomeComposition = HomeDefinition.makeComposition()
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
