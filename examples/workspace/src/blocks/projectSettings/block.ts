import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Project } from '../../domain'
import { WorkspaceRepository } from '../../repository'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const ProjectSettingsKey = Symbol('ProjectSettings')
export const ProjectSettingsBlock = Block.make('ProjectSettings', {
  key: ProjectSettingsKey,
  InitArgs: Schema.Tuple([Project.Project]),
  view: { kind: 'Element' },
  effects: { services: [WorkspaceRepository] },
  Model,
  Message,
  OutMessage,
})

export const { makeCommand, makeComposition, makeStep, makeSubscriptions } =
  ProjectSettingsBlock
