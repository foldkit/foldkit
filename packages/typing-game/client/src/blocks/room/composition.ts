import type { Block } from 'foldkit'

import { RoomBlock } from './definition'

export const RoomComposition = RoomBlock.makeComposition()
export type RoomViewBuilder = Block.ViewBuilderFor<typeof RoomComposition>
