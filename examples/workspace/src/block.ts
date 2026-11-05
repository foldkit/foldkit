import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Url } from 'foldkit/url'

import { Message } from './message'
import { Model } from './model'
import { WorkspaceRepository } from './repository'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([Url]),
  view: { kind: 'Document' },
  effects: { services: [WorkspaceRepository] },
  Model,
  Message,
})

export const {
  makeBinding,
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeMapBinding,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
  makeSubscriptions,
} = ApplicationBlock
