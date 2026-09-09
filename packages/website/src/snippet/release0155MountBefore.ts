const AnchorPopover = Mount.define(
  'AnchorPopover',
  { buttonId: Schema.String, anchor: AnchorConfig },
  CompletedAnchorPopover,
)(
  ({ buttonId, anchor }) =>
    element =>
      Effect.gen(function* () {
        // ...
      }),
)
