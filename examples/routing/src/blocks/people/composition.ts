import type { Block } from 'foldkit'

import { PeopleDefinition } from './definition'

export const PeopleComposition = PeopleDefinition.makeComposition()
export type PeopleViewBuilder = Block.ViewBuilderFor<typeof PeopleComposition>
