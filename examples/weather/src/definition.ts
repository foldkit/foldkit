import { Schema } from 'effect'
import { HttpClient } from 'effect/http'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')

export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: { services: [HttpClient.HttpClient] },
  Model,
  Message,
})

export const { makeFieldsStep } = ApplicationBlock
