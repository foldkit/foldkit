import { Schema } from 'effect'
import { Block } from 'foldkit'

import { WorkspaceRepository } from '../../../../repository'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'
import { ViewInputs } from './viewInputs'

export const CommentComposerKey = Symbol('CommentComposer')

export const CommentComposerBlock = Block.make('CommentComposer', {
  key: CommentComposerKey,
  Init: Schema.Tuple([Schema.String, Schema.optional(Schema.String)]),
  view: { kind: 'Element', Inputs: ViewInputs },
  effects: { services: [WorkspaceRepository] },
  Model,
  Message,
  OutMessage,
})

export const { makeComposition } = CommentComposerBlock
