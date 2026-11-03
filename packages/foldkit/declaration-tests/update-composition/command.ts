import { Effect, Schema, pipe } from 'effect'

import { ApplicationDefinition, DraftStore, Message } from './definition.js'

export const SaveDraft = ApplicationDefinition.makeCommand('SaveDraft', {
  args: { text: Schema.String },
  messages: [Message.CompletedSaveDraft],
  handler: function* () {
    const store = yield* DraftStore

    return ({ text }) =>
      pipe(store.save(text), Effect.as(Message.CompletedSaveDraft()))
  },
})
