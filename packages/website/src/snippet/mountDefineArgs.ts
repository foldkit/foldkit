Mount.define(name, {
  args: argSchemas,
  messages: [ResultMessage],
})

Definition.toLayer(
  Effect.succeed(({ element, ...argValues }) => Effect<Message>),
)
