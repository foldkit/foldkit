Mount.define(name, {
  args: argSchemas,
  messages: [ResultMessage],
  execute: ({ element, ...argValues }) => Effect<Message>,
})
