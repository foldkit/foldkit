import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

export const { makeFieldsStep, makeCommandsStep } = ApplicationDefinition
