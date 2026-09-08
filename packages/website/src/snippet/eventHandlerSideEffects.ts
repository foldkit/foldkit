// Inside a view, with its builder `h` in scope.

// OnKeyDownPreventDefault: calls event.preventDefault()
// inline and dispatches the Message when the function
// returns Some.
h.input([
  h.Value(model.draft),
  h.OnKeyDownPreventDefault(key =>
    key === 'Enter' && model.draft !== ''
      ? Option.some(Message.SubmittedDraft())
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
  h.OnPastePreventDefault(text => Option.some(Message.PastedText({ text }))),
  h.OnCopyText(serializeSelectionToMarkdown(model)),
  h.OnCutText(serializeSelectionToMarkdown(model), Message.CutSelection()),
])

// OnClick controls can be combined. This nested expand button prevents
// its browser default and stops the row's OnClick from also
// selecting the row.
h.div(
  [h.Role('treeitem'), h.OnClick(Message.ClickedSelectRow())],
  [
    h.button(
      [
        h.OnClick(Message.ClickedExpandRow(), {
          defaultAction: 'Prevent',
          propagation: 'Stop',
        }),
      ],
      ['Expand'],
    ),
  ],
)

// focusSelector synchronously focuses the matching element,
// then dispatches the Message. The focus runs inside the click
// event, so iOS Safari opens the on-screen keyboard. The target
// here is an always-present warmup input; a Dom.focus Command
// hands focus to the real search input once the dialog mounts.
h.button(
  [
    h.AriaLabel('Search documentation'),
    h.OnClick(Message.ClickedSearch(), {
      focusSelector: '#search-keyboard-warmup',
    }),
  ],
  [Icon.magnifyingGlass()],
)
