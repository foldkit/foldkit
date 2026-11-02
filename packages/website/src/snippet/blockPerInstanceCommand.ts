import { Context, Effect, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class DraftStore extends Context.Service<
  DraftStore,
  Readonly<{
    save: (draftId: string, body: string) => Effect.Effect<void, Error>
  }>
>()('DraftStore') {}

const Message = defineMessageUnion({
  UpdatedBody: { body: Schema.String },
  ClickedSave: {},
  SucceededSaveDraft: {},
  FailedSaveDraft: { reason: Schema.String },
})

const SaveDraft = Command.define('SaveDraft', {
  args: { draftId: Schema.String, body: Schema.String },
  messages: [Message.SucceededSaveDraft, Message.FailedSaveDraft],
})

export class Draft extends Block<Draft>()('Draft', {
  Model: Schema.Struct({
    draftId: Schema.String,
    body: Schema.String,
    maybeSaveError: Schema.Option(Schema.String),
  }),
  Message,
  Command: [SaveDraft],
}) {}

export const DraftLive = Draft.toLayer(
  Effect.gen(function* () {
    const draftStore = yield* DraftStore

    return {
      init: (_args, { id }) => ({
        draftId: id,
        body: '',
        maybeSaveError: Option.none(),
      }),

      update: {
        UpdatedBody: (model, { body }) => ({
          model: modifyFields(model, { body: () => body }),
        }),
        ClickedSave: model => ({
          model,
          commands: [SaveDraft({ draftId: model.draftId, body: model.body })],
        }),
        SucceededSaveDraft: model => ({
          model: modifyFields(model, { maybeSaveError: () => Option.none() }),
        }),
        FailedSaveDraft: (model, { reason }) => ({
          model: modifyFields(model, {
            maybeSaveError: () => Option.some(reason),
          }),
        }),
      },

      commands: {
        SaveDraft: ({ draftId, body }) =>
          draftStore.save(draftId, body).pipe(
            Effect.as(Draft.Message.SucceededSaveDraft()),
            Effect.catch(error =>
              Effect.succeed(
                Draft.Message.FailedSaveDraft({ reason: error.message }),
              ),
            ),
          ),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.textarea([
              h.Value(model.body),
              h.OnInput(body => Draft.Message.UpdatedBody({ body })),
            ]),
            h.button([h.OnClick(Draft.Message.ClickedSave())], ['Save draft']),
            ...Option.toArray(
              Option.map(model.maybeSaveError, reason =>
                h.p([h.Role('alert')], [`Could not save: ${reason}`]),
              ),
            ),
          ],
        ),
    }
  }),
)
