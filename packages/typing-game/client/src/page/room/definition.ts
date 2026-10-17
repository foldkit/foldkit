import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const Room = Block.define('Room', { Model, Message })

export const RoomComposition = Room.makeComposition()
export type RoomViewBuilder = Block.ViewBuilderFor<typeof RoomComposition>
