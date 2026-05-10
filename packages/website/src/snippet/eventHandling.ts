const h = html<Message>()

// Event handlers take Messages, not callbacks.
// When the button is clicked, Foldkit dispatches the Message
// to your update function.
h.button(
  [h.OnClick(ClickedIncrement()), h.Class('button-primary')],
  ['Click me'],
)

// For input events, Foldkit extracts the value and passes it
// to your function:
h.input([
  h.OnInput(value => ChangedSearch({ text: value })),
  h.Value(model.searchText),
  h.Class('input'),
])
