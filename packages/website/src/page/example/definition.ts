import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const ExampleDetailDefinition = Block.makeDefinition('ExampleDetail', {
  Model,
  Message,
})

export const { makeFieldsStep, makeStep } = ExampleDetailDefinition
