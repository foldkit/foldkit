import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Url } from 'foldkit/url'

import { Message } from './message'
import { Model } from './model'
import { ApplicationRoute } from './route'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([Url]),
  view: { kind: 'Document' },
  Model,
  Message,
  ChildInitContext: ApplicationRoute.People,
})

export const {
  makeRequiredFieldBinding,
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeSubscriptions,
} = ApplicationBlock
