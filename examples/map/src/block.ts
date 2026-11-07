import { Schema } from 'effect'
import { Block } from 'foldkit'

import { MapRegistry } from './mapRegistry'
import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: { services: [MapRegistry] },
  Model,
  Message,
})

export const {
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeMountStream,
  makeNoopStep,
} = ApplicationBlock
