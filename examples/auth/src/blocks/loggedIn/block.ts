import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Session } from '../../domain/session'
import { LoggedInRoute } from '../../route'
import { Message, OutMessage } from './message'
import { Model } from './model'

export const LoggedInKey = Symbol('LoggedIn')
export const LoggedInBlock = Block.make('LoggedIn', {
  key: LoggedInKey,
  InitArgs: Schema.Tuple([LoggedInRoute, Session]),
  view: { kind: 'Element' },
  Model,
  Message,
  OutMessage,
})

export const { makeComposition, makeOutMessageStep } = LoggedInBlock
