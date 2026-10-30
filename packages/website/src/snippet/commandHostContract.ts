import { Context, Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class DocumentStore extends Context.Service<
  DocumentStore,
  Readonly<{
    save: (contents: string) => Effect.Effect<void, Error>
  }>
>()('DocumentStore') {}

const Message = defineMessageUnion({
  UpdatedContents: { contents: Schema.String },
  ClickedSave: {},
  SucceededSaveDocument: {},
  FailedSaveDocument: { reason: Schema.String },
})

const SaveDocument = Command.define('SaveDocument', {
  args: { contents: Schema.String },
  messages: [Message.SucceededSaveDocument, Message.FailedSaveDocument],
})

export class Editor extends Block<Editor>()('Editor', {
  Model: Schema.Struct({ contents: Schema.String, isSaved: Schema.Boolean }),
  Message,
  Command: [SaveDocument],
}) {}

export const EditorLive = Editor.make(
  Effect.fn(function* () {
    const documentStore = yield* DocumentStore

    return {
      model: { contents: '', isSaved: true },

      update: {
        UpdatedContents: (model, { contents }) => ({
          model: modifyFields(model, {
            contents: () => contents,
            isSaved: () => false,
          }),
        }),
        ClickedSave: model => ({
          model,
          commands: [SaveDocument({ contents: model.contents })],
        }),
        SucceededSaveDocument: model => ({
          model: modifyFields(model, { isSaved: () => true }),
        }),
        FailedSaveDocument: model => ({ model }),
      },

      commands: {
        SaveDocument: ({ contents }) =>
          documentStore.save(contents).pipe(
            Effect.as(Message.SucceededSaveDocument()),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedSaveDocument({ reason: error.message }),
              ),
            ),
          ),
      },
    }
  }),
)
