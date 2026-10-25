import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const BlockPageDefinition = Block.makeDefinition('BlockPage', {
  Model,
  Message,
})
