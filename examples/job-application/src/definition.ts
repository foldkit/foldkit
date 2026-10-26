import { Block } from 'foldkit'

import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
  ChildInitContext: Flags,
})

export const { makeStep, makeFieldsStep, makeNoopStep } = ApplicationDefinition
