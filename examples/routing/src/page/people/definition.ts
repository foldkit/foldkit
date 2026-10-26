import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const PeopleDefinition = Block.makeDefinition('People', {
  Model,
  Message,
})

export const { makeFieldsStep, makeCommandsStep, makeNoopStep } =
  PeopleDefinition
