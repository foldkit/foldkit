import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react'

type Filter = 'All' | 'Active' | 'Done'

// State is a set of independent reactive cells.
const filterAtom = Atom.make<Filter>('All').pipe(Atom.keepAlive)
const todosAtom = Atom.make<ReadonlyArray<Todo>>([]).pipe(Atom.keepAlive)

// Any component can write any atom, with an inline updater closure.
const AddTodoButton = () => {
  const setTodos = useAtomSet(todosAtom)
  return (
    <button onClick={() => setTodos(todos => [...todos, emptyTodo()])}>
      Add
    </button>
  )
}

const ClearDoneButton = () => {
  const setTodos = useAtomSet(todosAtom)
  return (
    <button onClick={() => setTodos(todos => todos.filter(todo => !todo.done))}>
      Clear done
    </button>
  )
}

const FilterTabs = () => {
  const filter = useAtomValue(filterAtom)
  const setFilter = useAtomSet(filterAtom)
  // ... each transition is an anonymous closure, scattered across components
}
