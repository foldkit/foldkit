// ❌ Bad: both Commands start independently.

const update = ApplicationComposition.makeUpdate({
  ClickedSave: model => ({
    model,
    commands: [SaveDraft(), NavigateToDocuments()],
  }),
})
