import { Array } from 'effect'

const { makeUpdate } = DraftComposition

const editDraft = makeUpdate({
  UpdatedText: makeFieldsStep.fromMessage(({ text }) => ({
    text: () => text,
  })),
  CompletedRestoreDraft: makeFieldsStep.fromMessage(({ text }) => ({
    text: () => text,
  })),
  CompletedPersistDraft: makeNoopStep(),
})

const persistChanges = makeUpdate.except(['CompletedRestoreDraft'])(
  (model, _message, { before }) => ({
    model,
    commands: Array.filter(
      [PersistDraft({ text: model.text })],
      () => model.text !== before.text,
    ),
  }),
)

export const update = makeUpdate.compose(editDraft, persistChanges)
