import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Session } from '../../domain/session'
import { LoggedInRoute } from '../../route'
import { Message, OutMessage } from './message'
import { Model } from './model'

export const LoggedInKey = Symbol('LoggedIn')

export const LoggedInDefinition = Block.makeDefinition('LoggedIn', {
  key: LoggedInKey,
  Init: Schema.Tuple([LoggedInRoute, Session]),
  view: { kind: 'Element' },

  Model,
  Message,
  OutMessage,
})

export const { makeOutMessageStep } = LoggedInDefinition

export const LoggedInComposition = LoggedInDefinition.makeComposition()
export type LoggedInViewBuilder = Block.ViewBuilderFor<
  typeof LoggedInComposition
>
