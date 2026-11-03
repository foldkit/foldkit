import { Block } from 'foldkit'
import type { Url } from 'foldkit/url'

import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')

export const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Block.makeInputContract<readonly [url: Url]>(),
  view: { kind: 'Document' },
  Model,
  Message,
})

export const { makeFieldsStep, makeNoopStep } = ApplicationDefinition
