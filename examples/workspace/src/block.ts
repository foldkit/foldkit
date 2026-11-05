import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Url } from 'foldkit/url'

import { Message } from './message'
import { Model } from './model'
import { WorkspaceRepository } from './repository'

// no need for these to be exported right?
// confused. this is a definition.ts file, but it contains the block? shouldnt
// this just be block? and i also see block.ts actaully contains the layer? i
// feel like we need a strict, standard appproach for file naming that every
// single foldkit app in this repo and everyh foldkit app out in the wild SHOULD
// follow if they are follinwg FOLDKIT.md/docs/audit-program guidance.
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
