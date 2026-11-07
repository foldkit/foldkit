import { KeyValueStore } from 'effect/persistence'
import { Block } from 'foldkit'
import type { Url } from 'foldkit/url'

import { Message } from './message'
import { Model } from './model'
import { RoomsClient } from './rpc'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Block.makeInputContract<readonly [url: Url]>(),
  view: { kind: 'Document' },
  effects: { services: [RoomsClient, KeyValueStore.KeyValueStore] },
  Model,
  Message,
})

export const {
  makeRequiredFieldBinding,
  makeOptionalKeyedFieldBinding,
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} = ApplicationBlock
