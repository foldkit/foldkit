import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const IssueBoardDefinition = Block.makeDefinition('IssueBoard', {
  Model,
  Message,
  OutMessage,
})

export const {
  makeFieldsStep,
  makeOutMessageStep,
  makeNoopStep,
  makeOutMessageFold,
  makeBinding,
  makeComposition,
} = IssueBoardDefinition
