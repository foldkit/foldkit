import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const CommentComposerDefinition = Block.makeDefinition(
  'CommentComposer',
  {
    Model,
    Message,
    OutMessage,
  },
)

export const { makeComposition } = CommentComposerDefinition
