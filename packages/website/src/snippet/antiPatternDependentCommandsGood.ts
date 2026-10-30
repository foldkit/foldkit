// ✅ Good: update returns NavigateToDocuments after SaveDraft succeeds.

import { Effect, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import { DraftStore } from './antiPatternDraftStore'

const Message = defineMessageUnion({
  ClickedSave: {},
  SucceededSaveDraft: {},
  FailedSaveDraft: { reason: Schema.String },
  CompletedNavigateToDocuments: {},
})

const SaveDraft = Command.define('SaveDraft', {
  args: { draft: Schema.String },
  messages: [Message.SucceededSaveDraft, Message.FailedSaveDraft],
})

const NavigateToDocuments = Command.define('NavigateToDocuments', {
  messages: [Message.CompletedNavigateToDocuments],
})

export class Editor extends Block<Editor>()('Editor', {
  Model: Schema.Struct({
    draft: Schema.String,
    maybeSaveError: Schema.Option(Schema.String),
  }),
  Message,
  Command: [SaveDraft, NavigateToDocuments],
}) {}

export const EditorLive = Editor.make(
  Effect.fn(function* () {
    const draftStore = yield* DraftStore

    return {
      model: { draft: '', maybeSaveError: Option.none() },

      update: {
        ClickedSave: model => ({
          model,
          commands: [SaveDraft({ draft: model.draft })],
        }),
        SucceededSaveDraft: model => ({
          model,
          commands: [NavigateToDocuments()],
        }),
        FailedSaveDraft: (model, { reason }) => ({
          model: modifyFields(model, {
            maybeSaveError: () => Option.some(reason),
          }),
        }),
        CompletedNavigateToDocuments: model => ({ model }),
      },

      commands: {
        SaveDraft: ({ draft }) =>
          draftStore.save(draft).pipe(
            Effect.as(Message.SucceededSaveDraft()),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedSaveDraft({ reason: error.message }),
              ),
            ),
          ),
        NavigateToDocuments: () =>
          pushUrl('/documents').pipe(
            Effect.as(Message.CompletedNavigateToDocuments()),
          ),
      },
    }
  }),
)
