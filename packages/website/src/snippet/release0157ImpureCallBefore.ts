const Save = Command.define('Save', {
  args: { createdAt: Schema.Number },
  messages: [Message.CompletedSave],
  execute: ({ createdAt }) =>
    Effect.succeed(Message.CompletedSave({ createdAt })),
})

const save = (model: Model): Update.Return<Model, Message> => ({
  model,
  // Wrong: Date.now() runs while update is deciding which Commands to return.
  commands: [Save({ createdAt: Date.now() })],
})
