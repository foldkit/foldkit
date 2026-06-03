const h = html<Message>()

// OnKeyDownPreventDefault: calls event.preventDefault()
// inline and dispatches the Message when the function
// returns Some.
h.input([
  h.Value(model.draft),
  h.OnKeyDownPreventDefault(key =>
    key === 'Enter' && model.draft !== ''
      ? Option.some(SubmittedDraft())
      : Option.none(),
  ),
])

// OnClickFocus: synchronously focuses the element matching
// the selector, then dispatches the Message. The focus runs
// inside the click event, so iOS Safari opens the on-screen
// keyboard. The target here is an always-present warmup input;
// a Dom.focus Command hands focus to the real search input
// once the dialog mounts.
h.button(
  [
    h.AriaLabel('Search documentation'),
    h.OnClickFocus('#search-keyboard-warmup', ClickedSearch()),
  ],
  [Icon.magnifyingGlass()],
)
