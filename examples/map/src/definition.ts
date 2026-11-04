import { Schema } from 'effect'
import { Block } from 'foldkit'

import { MapRegistry } from './mapRegistry'
import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')

export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: { services: [MapRegistry] },
  Model,
  Message,
})

export const { makeFieldsStep, makeNoopStep } = ApplicationBlock
