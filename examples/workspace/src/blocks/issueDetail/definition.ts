import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Issue } from '../../domain'
import { WorkspaceRepository } from '../../repository'
import { ChildInitContext } from './childInitContext'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'
import { ViewInputs } from './viewInputs'

export const IssueDetailKey = Symbol('IssueDetail')

export const IssueDetailBlock = Block.make('IssueDetail', {
  key: IssueDetailKey,
  Init: Schema.Tuple([Issue]),
  view: { kind: 'Element', Inputs: ViewInputs },
  effects: { services: [WorkspaceRepository] },
  Model,
  Message,
  InMessage,
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
} = IssueDetailBlock
