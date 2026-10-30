import { Schema } from 'effect'
import { Command } from 'foldkit'

import { Message } from './message'

export const CopySnippet = Command.define('CopySnippet', {
  args: { snippetId: Schema.String, text: Schema.String },
  messages: [Message.SucceededCopySnippet, Message.FailedCopySnippet],
})

export const WaitBeforeHidingCopiedIndicator = Command.define(
  'WaitBeforeHidingCopiedIndicator',
  {
    args: { snippetId: Schema.String },
    messages: [Message.CompletedWaitBeforeHidingCopiedIndicator],
  },
)
