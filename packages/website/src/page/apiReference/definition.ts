import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const ApiReferenceDefinition = Block.makeDefinition('ApiReference', {
  Model,
  Message,
})

export const { makeFieldsStep, makeStep } = ApiReferenceDefinition
