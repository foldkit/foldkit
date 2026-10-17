import { Block } from 'foldkit'

import { Message } from './informingBlocksMessage'
import { Model } from './informingBlocksModel'

export const People = Block.define('People', { Model, Message })
export const PeopleComposition = People.makeComposition()
