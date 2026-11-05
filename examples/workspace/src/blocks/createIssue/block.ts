import { Schema } from 'effect'
import { Block } from 'foldkit'

import { WorkspaceRepository } from '../../repository'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'
import { ViewInputs } from './viewInputs'

export const CreateIssueKey = Symbol('CreateIssue')
export const CreateIssueBlock = Block.make('CreateIssue', {
  key: CreateIssueKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: ViewInputs },
  effects: { services: [WorkspaceRepository] },
  Model,
  Message,
  InMessage,
  OutMessage,
})

export const {
  makeBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} = CreateIssueBlock
