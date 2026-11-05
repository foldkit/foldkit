import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const PeopleComposition = makeComposition()
export type PeopleViewBuilder = Block.ViewBuilderFor<typeof PeopleComposition>
