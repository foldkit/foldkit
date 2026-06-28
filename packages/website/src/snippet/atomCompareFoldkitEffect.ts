import { Effect, Schema as S, Stream } from 'effect'
import { Command, Subscription } from 'foldkit'

import { Api } from './api'

// A side effect is a Command returned from update. It has a name, shows up
// in DevTools next to the Message that produced it, and is assertable in
// tests. Api is an Effect service; Api.Default is its layer.
const CreateTodo = Command.define(
  'CreateTodo',
  { text: S.String },
  CompletedCreateTodo,
)(({ text }) =>
  Effect.gen(function* () {
    const api = yield* Api
    yield* api.createTodo(text)
    return CompletedCreateTodo()
  }).pipe(Effect.provide(Api.Default)),
)

// A global listener gated on Model state is a Subscription. The runtime
// subscribes and unsubscribes as model.isDrawing changes. No addEventListener,
// no cleanup, no stale closure.
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  mouseRelease: entry(
    { isDrawing: S.Boolean },
    {
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
      dependenciesToStream: ({ isDrawing }) =>
        Stream.when(
          Subscription.fromEvent<MouseEvent, Message>({
            target: document,
            type: 'mouseup',
            toMessage: () => ReleasedMouse(),
          }),
          Effect.sync(() => isDrawing),
        ),
    },
  ),
}))
