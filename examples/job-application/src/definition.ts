import { Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { Block } from 'foldkit'

import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')

export const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([Flags]),
  view: { kind: 'Document' },
  effects: { services: [SecureRandom.SecureRandom] },
  Model,
  Message,
  ChildInitContext: Flags,
})

export const { makeStep, makeFieldsStep, makeNoopStep } = ApplicationDefinition
