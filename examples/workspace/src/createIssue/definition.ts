import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const CreateIssueDefinition = Block.makeDefinition('CreateIssue', {
  Model,
  Message,
  OutMessage,
})

export const {
  makeStep,
  makeFieldsStep,
  makeNoopStep,
  makeBinding,
  makeOutMessageFold,
  makeComposition,
} = CreateIssueDefinition
