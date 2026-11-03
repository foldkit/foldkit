import { Schema } from 'effect'
import { Block } from 'foldkit'

import { ApplicationRoute } from '../../route'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'

export const PeopleKey = Symbol('People')

export const PeopleDefinition = Block.makeDefinition('People', {
  key: PeopleKey,
  Init: Schema.Tuple([ApplicationRoute.People]),
  view: { kind: 'Element' },
  Model,
  Message,
  InMessage,
})

export const { makeFieldsStep, makeCommandsStep, makeNoopStep } =
  PeopleDefinition
