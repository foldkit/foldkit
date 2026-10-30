import { Crypto, Effect, Schema } from 'effect'
import { Hex } from 'effect/encoding'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const DRAFT_ID_BYTE_LENGTH = 16

const Message = defineMessageUnion({
  ClickedSaveBad: {},
  ClickedSave: {},
  CompletedSaveDraft: { draftId: Schema.String },
})
type Message = typeof Message.Type

const SaveDraft = Command.define('SaveDraft', {
  args: { body: Schema.String },
  messages: [Message.CompletedSaveDraft],
})

const SaveDraftWithId = Command.define('SaveDraftWithId', {
  args: { body: Schema.String, draftId: Schema.String },
  messages: [Message.CompletedSaveDraft],
})

class Editor extends Block<Editor>()('Editor', {
  Model: Schema.Struct({ body: Schema.String }),
  Message,
  Command: [SaveDraft, SaveDraftWithId],
}) {}

export const EditorLive = Editor.make(
  Effect.fn(function* () {
    const crypto = yield* Crypto.Crypto

    return {
      model: { body: '' },
      update: {
        // ❌ Bad
        // update runs at decision time. Assigning the UUID first does not defer it.
        ClickedSaveBad: model => {
          const draftId = globalThis.crypto.randomUUID()

          return {
            model,
            commands: [SaveDraftWithId({ body: model.body, draftId })],
          }
        },

        // ✅ Good
        // The Command handler obtains the id when the Runtime executes it.
        ClickedSave: model => ({
          model,
          commands: [SaveDraft({ body: model.body })],
        }),

        CompletedSaveDraft: model => ({ model }),
      },
      commands: {
        SaveDraft: () =>
          Effect.gen(function* () {
            const bytes = yield* Effect.orDie(
              crypto.randomBytes(DRAFT_ID_BYTE_LENGTH),
            )

            return Message.CompletedSaveDraft({ draftId: Hex.encode(bytes) })
          }),
        SaveDraftWithId: ({ draftId }) =>
          Effect.succeed(Message.CompletedSaveDraft({ draftId })),
      },
    }
  }),
)
