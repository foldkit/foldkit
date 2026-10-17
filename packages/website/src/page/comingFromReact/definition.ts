import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const ComingFromReact = Block.define('ComingFromReact', {
  Model,
  Message,
})

export const ComingFromReactComposition = ComingFromReact.makeComposition()
