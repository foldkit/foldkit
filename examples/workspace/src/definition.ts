import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Url } from 'foldkit/url'

import { Message } from './message'
import { Model } from './model'
import { WorkspaceRepository } from './repository'

export const ApplicationKey = Symbol('WorkspaceApplication')

export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([Url]),
  view: { kind: 'Document' },
  effects: { services: [WorkspaceRepository] },
  Model,
  Message,
})

export const {
  makeStep,
  makeFieldsStep,
  makeCommandsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeBinding,
  makeMapBinding,
  makeComposition,
} = ApplicationBlock
