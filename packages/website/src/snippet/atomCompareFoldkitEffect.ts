import { Effect, Layer, Schema, Stream } from 'effect'
import { Block, Dom } from 'foldkit'

import { Api, ApiLayer } from './api'
import { Message } from './message'
import { Model } from './model'

const Todo = Block.define('Todo', { Model, Message })

// A side effect is a Command returned from update. It has a name, shows up
// in DevTools next to the Message that produced it, and is assertable in
// tests. Api is an Effect service; ApiLayer provides it.
const CreateTodo = Todo.command('CreateTodo', {
  args: { text: Schema.String },
  messages: [Message.SucceededCreateTodo, Message.FailedCreateTodo],
  handler: function* () {
    const api = yield* Api

    return ({ text }) =>
      api.createTodo(text).pipe(
        Effect.as(Message.SucceededCreateTodo()),
        Effect.catch(() => Effect.succeed(Message.FailedCreateTodo())),
      )
  },
})

// Here the global listener becomes a Subscription: an external event source
// bound to a slice of the Model. The runtime subscribes and unsubscribes as
// model.isDrawing changes. No addEventListener, no cleanup, no stale closure.
export const subscriptions = Todo.subscriptions(entry => ({
  mouseReleases: entry(
    'MouseReleases',
    { isDrawing: Schema.Boolean },
    {
      messages: [Message.ReleasedMouse],
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
      handler: function* () {
        return ({ isDrawing }) =>
          Stream.when(
            Dom.streamFromEvent({
              target: document,
              type: 'mouseup',
              mapEvent: () => Message.ReleasedMouse(),
            }),
            Effect.sync(() => isDrawing),
          )
      },
    },
  ),
}))

export const EffectsLayer = Layer.mergeAll(
  CreateTodo.layer,
  subscriptions.mouseReleases.layer,
)
export const ServicesLayer = ApiLayer
