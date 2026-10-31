import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedSaveDraft: {},
})
type Message = typeof Message.Type

// ❌ Bad
// A hand-built struct skips the identity, args, and tracing metadata that
// Command.define attaches.
const saveDraft = {
  name: 'SaveDraft',
  effect: Effect.succeed(Message.CompletedSaveDraft()),
}

// ✅ Good
// Declare the Command, list it on its Block, and implement it under commands.
const SaveDraft = Command.define('SaveDraft', {
  args: { body: Schema.String },
  messages: [Message.CompletedSaveDraft],
})
