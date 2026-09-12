// ❌ Bad: both Commands start independently.

const handlers = {
  ClickedSave: () => ({
    model,
    commands: [SaveDraft(), NavigateToDocuments()],
  }),
}
