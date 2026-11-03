import { Effect, Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
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
const SaveDraft = Command.define('SaveDraft', {
  args: { body: Schema.String },
  messages: [Message.CompletedSaveDraft],
  handler: function* () {
    const secureRandom = yield* SecureRandom.SecureRandom

    return ({ body: _body }) =>
      Effect.gen(function* () {
        const draftId = yield* secureRandom.uuidV4()
        return Message.CompletedSaveDraft({ draftId })
      })
  },
})

const saveGood = (body: string) => SaveDraft({ body })
