import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'
import { ViewInputs } from './viewInputs'

export const IssueListKey = Symbol('IssueList')

export const IssueListDefinition = Block.makeDefinition('IssueList', {
  key: IssueListKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: ViewInputs },
  Model,
  Message,
  InMessage,
  inMessageOutputs: {
    RequestedClearFilters: { outMessage: OutMessage.RequestedClearFilters },
  },
  OutMessage,
})

export const IssueListBlock = IssueListDefinition.contract

export const {
  makeFieldsStep,
  makeOutMessageStep,
  makeNoopStep,
  makeBinding,
  makeOutMessageFold,
  makeComposition,
} = IssueListDefinition
