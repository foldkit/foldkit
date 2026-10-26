import { Block } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const HomeDefinition = Block.makeDefinition('Home', {
  Model,
  Message,
  OutMessage,
})

export const { makeFieldsStep, makeNoopStep, makeOutMessageStep } =
  HomeDefinition
