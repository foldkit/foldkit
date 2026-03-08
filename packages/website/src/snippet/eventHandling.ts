// Event handlers take Messages, not callbacks.
// When the button is clicked, Foldkit dispatches the Message
// to your update function.
button([OnClick(ClickedIncrement()), Class('button-primary')], ['Click me'])

// For input events, Foldkit extracts the value and passes it
// to your function:
input([
  OnInput(value => ChangedSearch({ text: value })),
  Value(model.searchText),
  Class('input'),
])
