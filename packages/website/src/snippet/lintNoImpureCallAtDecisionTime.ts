import { Crypto, Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'

const SaveDraftWithId = Command.define('SaveDraftWithId', {
  args: { body: Schema.String, draftId: Schema.String },
  messages: [Message.CompletedSaveDraftWithId],
  execute: ({ draftId }) =>
    Effect.succeed(Message.CompletedSaveDraftWithId({ draftId })),
})

// ❌ Bad: assigning the UUID first does not defer the call.
const saveBad = (body: string) => {
  const draftId = crypto.randomUUID()

  return SaveDraftWithId({ body, draftId })
}

// ✅ Good: the runtime obtains the UUID when it executes the Command.
const SaveDraft = Command.define('SaveDraft', {
  args: { body: Schema.String },
  messages: [Message.CompletedSaveDraft],
  execute: ({ body: _body }) =>
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const draftId = yield* Effect.orDie(crypto.randomUUIDv4)
      return Message.CompletedSaveDraft({ draftId })
    }).pipe(Effect.provide(BrowserCrypto.layer)),
})

const saveGood = (body: string) => SaveDraft({ body })
