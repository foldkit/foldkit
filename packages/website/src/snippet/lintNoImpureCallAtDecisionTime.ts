import { Crypto, Effect, Schema } from 'effect'
import { Hex } from 'effect/encoding'
import { Command } from 'foldkit'

const SaveDraftWithId = Command.define('SaveDraftWithId', {
  args: { body: Schema.String, draftId: Schema.String },
  messages: [Message.CompletedSaveDraftWithId],
  handler: function* () {
    return ({ draftId }) =>
      Effect.succeed(Message.CompletedSaveDraftWithId({ draftId }))
  },
})

// ❌ Bad: assigning the UUID first does not defer the call.
const saveBad = (body: string) => {
  const draftId = crypto.randomUUID()

  return SaveDraftWithId({ body, draftId })
}

// ✅ Good: the runtime obtains the ID when it executes the Command.
const DRAFT_ID_BYTE_LENGTH = 16
const SaveDraft = Command.define('SaveDraft', {
  args: { body: Schema.String },
  messages: [Message.CompletedSaveDraft],
  handler: function* () {
    const crypto = yield* Crypto.Crypto

    return ({ body: _body }) =>
      Effect.gen(function* () {
        const bytes = yield* Effect.orDie(
          crypto.randomBytes(DRAFT_ID_BYTE_LENGTH),
        )
        const draftId = Hex.encode(bytes)
        return Message.CompletedSaveDraft({ draftId })
      })
  },
})

const saveGood = (body: string) => SaveDraft({ body })
