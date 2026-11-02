import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'
import { ViewInputs } from './viewInputs'

export const IssueBoardKey = Symbol('IssueBoard')

export const IssueBoardDefinition = Block.makeDefinition('IssueBoard', {
  key: IssueBoardKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: ViewInputs },
  Model,
  Message,
  InMessage,
  OutMessage,
})

export const IssueBoardBlock = IssueBoardDefinition.contract

export const {
  makeFieldsStep,
  makeOutMessageStep,
  makeNoopStep,
  makeOutMessageFold,
  makeBinding,
  makeComposition,
} = IssueBoardDefinition
