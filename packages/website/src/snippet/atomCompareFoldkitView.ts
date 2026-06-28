import { Html, html } from 'foldkit/html'

// The view is a plain function returning data. No memo, no useCallback, no
// dependency array. The event is a Message value, not a closure, so there is
// nothing to stabilize at the boundary.
const todoItem = (todo: Todo): Html => {
  const h = html<Message>()

  return h.li(
    [],
    [
      h.input([
        h.Type('checkbox'),
        h.Checked(todo.done),
        h.OnClick(ClickedTodo({ id: todo.id })),
      ]),
      todo.text,
    ],
  )
}
