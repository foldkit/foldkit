const Save = Command.define('Save', {
  messages: [Message.CompletedSave],
  // Right: the clock is read only when the Command executes.
  execute: Clock.currentTimeMillis.pipe(
    Effect.map(createdAt => Message.CompletedSave({ createdAt })),
  ),
})

const save = (model: Model): Update.Return<Model, Message> => ({
  model,
  commands: [Save()],
})
