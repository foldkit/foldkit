import { Schema } from 'effect'
import { Block } from 'foldkit'

import { ChartRegistry } from './chartRegistry'
import { GitHubApi } from './githubApi'
import { Message } from './message'
import { Model } from './model'
import { NpmApi } from './npmApi'

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: { services: [ChartRegistry, GitHubApi, NpmApi] },
  Model,
  Message,
})

export const {
  makeRequiredFieldBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeMountStream,
  makeOutMessageFold,
  makeStep,
} = ApplicationBlock
