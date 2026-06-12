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

// OnPastePreventDefault: reads the clipboard's text/plain
// payload synchronously inside the paste event. Some
// suppresses the browser's default insertion and dispatches
// the Message; None lets the browser paste normally.
//
// OnCopyText and OnCutText write Model-derived text to the
// clipboard inside the gesture and suppress the default
// payload. The cut variant also dispatches a Message so
// update can delete the selection.
h.div([
  h.Contenteditable('true'),
  h.OnPastePreventDefault(text => Option.some(PastedText({ text }))),
  h.OnCopyText(serializeSelectionToMarkdown(model)),
  h.OnCutText(serializeSelectionToMarkdown(model), CutSelection()),
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
