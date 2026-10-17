import { Block } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const LoggedIn = Block.define('LoggedIn', {
  Model,
  Message,
  OutMessage,
})

export const LoggedInComposition = LoggedIn.makeComposition()
