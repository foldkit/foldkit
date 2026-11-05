import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Url } from 'foldkit/url'

import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([Flags, Url]),
  view: { kind: 'Document' },
  Model,
  Message,
  ChildInitContext: Flags,
})

export const {
  makeBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
} = ApplicationBlock
