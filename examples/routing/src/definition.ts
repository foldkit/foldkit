import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { ApplicationRoute } from './route'

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
  ChildInitContext: ApplicationRoute.People,
})

export const { makeFieldsStep, makeCommandsStep, makeNoopStep } =
  ApplicationDefinition
