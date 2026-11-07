import { Schema } from 'effect'
import { Block } from 'foldkit'

import { LoggedOutRoute } from '../../route'
import { Message, OutMessage } from './message'
import { Model } from './model'

export const LoggedOutKey = Symbol('LoggedOut')
export const LoggedOutBlock = Block.make('LoggedOut', {
  key: LoggedOutKey,
  InitArgs: Schema.Tuple([LoggedOutRoute]),
  view: { kind: 'Element' },

  Model,
  Message,
  OutMessage,
})

export const {
  makeRequiredFieldBinding,
  makeComposition,
  makeOutMessageForward,
} = LoggedOutBlock
