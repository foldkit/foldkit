import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const RoomComposition = makeComposition()
export type RoomViewBuilder = Block.ViewBuilderFor<typeof RoomComposition>
