import { Schema } from 'effect'
import { Socket } from 'effect/socket'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: { services: [Socket.WebSocketConstructor] },
  Model,
  Message,
})

export const {
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeManagedResources,
  makeNoopStep,
  makeResource,
  makeSubscriptions,
} = ApplicationBlock
