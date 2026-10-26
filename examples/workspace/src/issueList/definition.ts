import { Block } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const IssueListDefinition = Block.makeDefinition('IssueList', {
  Model,
  Message,
  OutMessage,
})

export const { makeFieldsStep, makeOutMessageStep, makeNoopStep } =
  IssueListDefinition
