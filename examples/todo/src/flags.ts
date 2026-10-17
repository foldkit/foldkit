import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { TODOS_STORAGE_KEY, Todos, TodosJsonString } from './model'

export const Flags = Schema.Struct({
  todos: Schema.Option(Todos),
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const todosJson = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(TODOS_STORAGE_KEY)),
  )

  const decodeTodos = Schema.decodeEffect(TodosJsonString)
  const todos = yield* decodeTodos(todosJson)

  return { todos: Option.some(todos) }
}).pipe(Effect.catch(() => Effect.succeed({ todos: Option.none() })))
