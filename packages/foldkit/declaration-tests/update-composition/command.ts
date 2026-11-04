import { Effect, Schema, pipe } from 'effect'

import { ApplicationBlock, DraftStore, Message } from './definition.js'

export const SaveDraft = ApplicationBlock.makeCommand('SaveDraft', {
  args: { text: Schema.String },
  messages: [Message.CompletedSaveDraft],
  handler: function* () {
    const store = yield* DraftStore

    return ({ text }) =>
      pipe(store.save(text), Effect.as(Message.CompletedSaveDraft()))
  },
})
