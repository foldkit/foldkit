// ✅ Good: update returns NavigateToDocuments after SaveDraft succeeds.

const handlers = {
  ClickedSave: () => ({
    model,
    commands: [SaveDraft()],
  }),

  SucceededSaveDraft: () => ({
    model,
    commands: [NavigateToDocuments()],
  }),
}
