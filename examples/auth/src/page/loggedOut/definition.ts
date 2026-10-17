import { Block } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const LoggedOut = Block.define('LoggedOut', {
  Model,
  Message,
  OutMessage,
})
