// ❌ Bad: both Commands start independently.

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedSave: () => ({
      model,
      commands: [SaveDraft(), NavigateToDocuments()],
    }),
  }),
)
