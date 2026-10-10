import { Effect, Layer, Schema, Stream } from 'effect'
import { Command, Dom, Subscription } from 'foldkit'

import { Api, ApiLayer } from './api'

// A side effect is a Command returned from update. It has a name, shows up
// in DevTools next to the Message that produced it, and is assertable in
// tests. Api is an Effect service; ApiLayer provides it.
const CreateTodo = Command.define('CreateTodo', {
  args: { text: Schema.String },
  messages: [SucceededCreateTodo, FailedCreateTodo],
})

const CreateTodoLayer = CreateTodo.toLayer(
  Effect.gen(function* () {
    const api = yield* Api

    return ({ text }) =>
      api.createTodo(text).pipe(
        Effect.as(SucceededCreateTodo()),
        Effect.catch(() => Effect.succeed(FailedCreateTodo())),
      )
  }),
)

// Here the global listener becomes a Subscription: an external event source
// bound to a slice of the Model. The runtime subscribes and unsubscribes as
// model.isDrawing changes. No addEventListener, no cleanup, no stale closure.
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  mouseReleases: entry(
    'MouseReleases',
    { isDrawing: Schema.Boolean },
    {
      messages: [ReleasedMouse],
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
    },
  ),
}))

const MouseReleasesLayer = subscriptions.mouseReleases.toLayer(
  Effect.succeed(({ isDrawing }) =>
    Stream.when(
      Dom.streamFromEvent({
        target: document,
        type: 'mouseup',
        mapEvent: () => ReleasedMouse(),
      }),
      Effect.sync(() => isDrawing),
    ),
  ),
)

export const EffectsLayer = Layer.mergeAll(CreateTodoLayer, MouseReleasesLayer)
export const ServicesLayer = ApiLayer
