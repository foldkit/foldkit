import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const IssueListDefinition = Block.makeDefinition('IssueList', {
  Model,
  Message,
  OutMessage,
})

export const {
  makeFieldsStep,
  makeOutMessageStep,
  makeNoopStep,
  makeBinding,
  makeOutMessageFold,
  makeComposition,
} = IssueListDefinition
