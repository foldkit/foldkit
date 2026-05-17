// Event handlers take Messages, not callbacks.
// When the button is clicked, Foldkit dispatches the Message
// to your update function.
const buttonExample = () => {
  const h = html<Message>()

  return h.button(
    [h.OnClick(ClickedIncrement()), h.Class('button-primary')],
    ['Click me'],
  )
}

// For input events, Foldkit extracts the value and passes it
// to your function:
const inputExample = (model: Model) => {
  const h = html<Message>()

  return h.input([
    h.OnInput(value => ChangedSearch({ text: value })),
    h.Value(model.searchText),
    h.Class('input'),
  ])
}
