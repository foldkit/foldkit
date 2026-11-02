import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Url } from 'foldkit/url'

import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')

export const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([Url]),
  view: { kind: 'Document' },
  Model,
  Message,
})

export const { makeFieldsStep, makeNoopStep } = ApplicationDefinition
