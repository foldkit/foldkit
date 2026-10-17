import { Clock, Effect, Layer, Random, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { Application } from './definition'
import { Message } from './message'
import { TODOS_STORAGE_KEY, Todos, TodosJsonString } from './model'

export const GenerateTodo = Application.command('GenerateTodo', {
  args: { text: Schema.String },
  messages: [Message.CompletedGenerateTodo],
  handler: function* () {
    const clock = yield* Clock.Clock

    return ({ text }) =>
      Effect.gen(function* () {
        const id = yield* Random.nextIntBetween(
          0,
          Number.MAX_SAFE_INTEGER,
        ).pipe(Effect.map(value => value.toString(36)))
        const timestamp = yield* clock.currentTimeMillis

        return Message.CompletedGenerateTodo({ id, timestamp, text })
      })
  },
})

export const SaveTodos = Application.command('SaveTodos', {
  args: { todos: Todos },
  messages: [Message.SucceededSaveTodos, Message.FailedSaveTodos],
  handler: function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ todos }) =>
      Effect.gen(function* () {
        const encodedTodos = yield* Schema.encodeEffect(TodosJsonString)(todos)
        yield* store.set(TODOS_STORAGE_KEY, encodedTodos)
        return Message.SucceededSaveTodos({ todos })
      }).pipe(Effect.catch(() => Effect.succeed(Message.FailedSaveTodos())))
  },
})

export const EffectsLayer = Layer.mergeAll(GenerateTodo.layer, SaveTodos.layer)
