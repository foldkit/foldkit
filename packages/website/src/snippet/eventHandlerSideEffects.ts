const h = html<Message>()

// Most side effects belong in Commands. The exception:
// effects the browser requires to run synchronously inside
// the originating user-gesture event. Foldkit encapsulates
// these inside attribute primitives so view code stays
// declarative.

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
// the selector before dispatching the Message. The focus
// call runs inside the click event, so iOS Safari opens
// the on-screen keyboard.
h.button(
  [
    h.AriaLabel('Search documentation'),
    h.OnClickFocus('#search-input', OpenedSearchDialog()),
  ],
  [Icon.magnifyingGlass()],
)
