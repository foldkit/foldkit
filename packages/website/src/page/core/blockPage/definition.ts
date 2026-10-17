import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const BlockPage = Block.define('BlockPage', { Model, Message })

export const BlockPageComposition = BlockPage.makeComposition()
