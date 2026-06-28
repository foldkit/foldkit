import { memo, useCallback } from 'react'

import { useAtomSet } from '@effect-atom/atom-react'

// The view layer is still React: memo to skip re-renders, useCallback to keep
// the handler reference stable, a dependency array you have to get right.
const TodoItem = memo(({ todo }: { todo: Todo }) => {
  const setTodos = useAtomSet(todosAtom)

  const toggle = useCallback(
    () =>
      setTodos(todos =>
        todos.map(candidate =>
          candidate.id === todo.id
            ? { ...candidate, done: !candidate.done }
            : candidate,
        ),
      ),
    [setTodos, todo.id],
  )

  return (
    <li>
      <input type="checkbox" checked={todo.done} onChange={toggle} />
      {todo.text}
    </li>
  )
})
