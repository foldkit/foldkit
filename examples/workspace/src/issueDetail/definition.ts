import { Block } from 'foldkit'

import { ChildInitContext } from './childInitContext'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const IssueDetailDefinition = Block.makeDefinition('IssueDetail', {
  Model,
  Message,
  OutMessage,
  ChildInitContext,
})

export const {
  makeStep,
  makeOutMessageStep,
  makeNoopStep,
  makeBinding,
  makeOutMessageFold,
  makeComposition,
} = IssueDetailDefinition
