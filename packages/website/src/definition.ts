import { Block } from 'foldkit'

import { ChildInitContext } from './childInitContext'
import { Message } from './message'
import { Model } from './model'

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
  ChildInitContext,
})

export const { makeStep, makeFieldsStep, makeCommandsStep, makeNoopStep } =
  ApplicationDefinition
