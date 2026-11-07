import { Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { KeyValueStore } from 'effect/persistence'
import { Block } from 'foldkit'

import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([Flags]),
  view: { kind: 'Document' },
  effects: {
    services: [SecureRandom.SecureRandom, KeyValueStore.KeyValueStore],
  },
  Model,
  Message,
})

export const {
  makeRequiredFieldBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} = ApplicationBlock
