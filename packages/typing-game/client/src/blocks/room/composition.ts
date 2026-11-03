import type { Block } from 'foldkit'

import { RoomDefinition } from './definition'

export const RoomComposition = RoomDefinition.makeComposition()
export type RoomViewBuilder = Block.ViewBuilderFor<typeof RoomComposition>
