import { Block } from 'foldkit'
import type { Url } from 'foldkit/url'

import { Message } from './message'
import { Model } from './model'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Block.makeInputContract<readonly [url: Url]>(),
  view: { kind: 'Document' },
  Model,
  Message,
})

export const {
  makeRequiredFieldBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
} = ApplicationBlock
