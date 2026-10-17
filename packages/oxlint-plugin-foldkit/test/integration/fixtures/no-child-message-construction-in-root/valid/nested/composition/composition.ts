import type { Block } from 'foldkit'

import { Nested } from '../definition.js'

export const NestedComposition = Nested.makeComposition()
export type NestedViewBuilder = Block.ViewBuilderFor<typeof NestedComposition>
