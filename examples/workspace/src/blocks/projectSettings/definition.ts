import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Project } from '../../domain'
import { WorkspaceRepository } from '../../repository'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const ProjectSettingsKey = Symbol('ProjectSettings')

export const ProjectSettingsDefinition = Block.makeDefinition(
  'ProjectSettings',
  {
    key: ProjectSettingsKey,
    Init: Schema.Tuple([Project]),
    view: { kind: 'Element' },
    effects: { services: [WorkspaceRepository] },
    Model,
    Message,
    OutMessage,
  },
)

export const ProjectSettingsBlock = ProjectSettingsDefinition.contract

export const { makeStep, makeComposition } = ProjectSettingsDefinition
