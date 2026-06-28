import { Effect } from 'effect'

import { Atom, useAtomMount, useAtomSet } from '@effect-atom/atom-react'

// A mutation is a function atom. Reactivity keys invalidate dependents.
const createTodoAtom = runtime.fn(
  Effect.fnUntraced(function* (text: string) {
    const api = yield* Api
    yield* api.createTodo(text)
  }),
  { reactivityKeys: ['todos'] },
)

// A global listener is an atom that wires addEventListener in its body,
// then tears it down with a finalizer.
const mouseUpAtom = Atom.make(get => {
  const onUp = () => get.setSelf(false)
  window.addEventListener('mouseup', onUp)
  get.addFinalizer(() => window.removeEventListener('mouseup', onUp))
  return false
})

const Canvas = () => {
  useAtomMount(mouseUpAtom) // keep the listener alive while this component is mounted
  const createTodo = useAtomSet(createTodoAtom)
  // ...
}
