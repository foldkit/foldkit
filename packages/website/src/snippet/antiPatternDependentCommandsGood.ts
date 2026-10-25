// ✅ Good: update returns NavigateToDocuments after SaveDraft succeeds.

const update = ApplicationComposition.makeUpdate({
  ClickedSave: model => ({
    model,
    commands: [SaveDraft()],
  }),

  SucceededSaveDraft: model => ({
    model,
    commands: [NavigateToDocuments()],
  }),
})
