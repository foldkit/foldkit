import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const SearchDefinition = Block.makeDefinition('Search', {
  Model,
  Message,
})

export const { makeCommandsStep, makeFieldsStep, makeNoopStep, makeStep } =
  SearchDefinition
