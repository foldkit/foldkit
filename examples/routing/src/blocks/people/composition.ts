import type { Block } from 'foldkit'

import { PeopleBlock } from './definition'

export const PeopleComposition = PeopleBlock.makeComposition()
export type PeopleViewBuilder = Block.ViewBuilderFor<typeof PeopleComposition>
