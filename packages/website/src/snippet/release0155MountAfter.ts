const AnchorPopover = Mount.define('AnchorPopover', {
  args: { buttonId: Schema.String, anchor: AnchorConfig },
  messages: [CompletedAnchorPopover],
  execute: ({ element, buttonId, anchor }) =>
    Effect.gen(function* () {
      // ...
    }),
})
