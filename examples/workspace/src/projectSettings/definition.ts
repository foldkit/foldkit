import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const ProjectSettingsDefinition = Block.makeDefinition(
  'ProjectSettings',
  {
    Model,
    Message,
    OutMessage,
  },
)

export const { makeStep, makeComposition } = ProjectSettingsDefinition
