import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const ApiReference = Block.define('ApiReference', {
  Model,
  Message,
})

export const ApiReferenceComposition = ApiReference.makeComposition()
