import { Crypto, Effect, Schema } from 'effect'
import { Command } from 'foldkit'

const SaveDraftWithId = Command.define('SaveDraftWithId', {
  args: { body: Schema.String, draftId: Schema.String },
  messages: [Message.CompletedSaveDraftWithId],
})

const SaveDraftWithIdLayer = SaveDraftWithId.toLayer(
  Effect.succeed(({ draftId }) =>
    Effect.succeed(Message.CompletedSaveDraftWithId({ draftId })),
  ),
)

// ❌ Bad: assigning the UUID first does not defer the call.
const saveBad = (body: string) => {
  const draftId = crypto.randomUUID()

  return SaveDraftWithId({ body, draftId })
}

// ✅ Good: the runtime obtains the UUID when it executes the Command.
const SaveDraft = Command.define('SaveDraft', {
  args: { body: Schema.String },
  messages: [Message.CompletedSaveDraft],
})

const SaveDraftLayer = SaveDraft.toLayer(
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto

    return ({ body: _body }) =>
      Effect.gen(function* () {
        const draftId = yield* Effect.orDie(crypto.randomUUIDv4)
        return Message.CompletedSaveDraft({ draftId })
      })
  }),
)

const saveGood = (body: string) => SaveDraft({ body })
