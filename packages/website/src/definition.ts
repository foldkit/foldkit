import { Schema } from 'effect'
import { Block, Url } from 'foldkit'

import { ChildInitContext } from './childInitContext'
import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'
import { PagefindService } from './pagefind'
import { LocalStorage, SessionStorage } from './storage'

export const ApplicationKey = Symbol('Application')

export const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([Flags, Url.Url]),
  view: { kind: 'Document' },
  effects: { services: [LocalStorage, SessionStorage, PagefindService] },
  Model,
  Message,
  ChildInitContext,
})

export const { makeStep, makeFieldsStep, makeCommandsStep, makeNoopStep } =
  ApplicationDefinition
