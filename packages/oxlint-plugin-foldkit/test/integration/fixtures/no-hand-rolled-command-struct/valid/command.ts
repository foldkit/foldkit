import { Effect } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedSaveDraft: {},
})

const saveDraftEffect = Effect.succeed(Message.CompletedSaveDraft())

export const SaveDraft = Command.define('SaveDraft', {
  messages: [Message.CompletedSaveDraft],
  execute: saveDraftEffect,
})
