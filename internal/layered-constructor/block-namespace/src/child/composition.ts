import type * as Block from 'foldkit/block'

import { ChildDefinition } from './definition.js'

export const ChildComposition = ChildDefinition.makeComposition()
export type ChildViewBuilder = Block.ViewBuilderFor<typeof ChildComposition>
