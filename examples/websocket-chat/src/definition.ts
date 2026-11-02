import { Schema } from 'effect'
import { Socket } from 'effect/socket'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')

export const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: { services: [Socket.WebSocketConstructor] },
  Model,
  Message,
})

export const { makeFieldsStep, makeCommandsStep, makeNoopStep } =
  ApplicationDefinition
