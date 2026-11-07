import { Schema } from 'effect'
import { Block } from 'foldkit'

import { ApplicationRoute } from '../../route'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'

export const PeopleKey = Symbol('People')
export const PeopleBlock = Block.make('People', {
  key: PeopleKey,
  InitArgs: Schema.Tuple([ApplicationRoute.People]),
  view: { kind: 'Element' },
  Model,
  Message,
  InMessage,
})

export const {
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
} = PeopleBlock
