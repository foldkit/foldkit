import { Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Block } from 'foldkit'
import { Url } from 'foldkit/url'

import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([Flags, Url]),
  view: { kind: 'Document' },
  effects: { services: [KeyValueStore.KeyValueStore] },
  Model,
  Message,
})

export const {
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} = ApplicationBlock
