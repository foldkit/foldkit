import { Context, Effect, Schema, Stream } from 'effect'
import { Block, Command, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class Api extends Context.Service<
  Api,
  Readonly<{ createTodo: (text: string) => Effect.Effect<void, Error> }>
>()('Api') {}

const Model = Schema.Struct({
  draft: Schema.String,
  isDrawing: Schema.Boolean,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  SubmittedTodo: {},
  SucceededCreateTodo: {},
  FailedCreateTodo: {},
  PressedCanvas: {},
  ReleasedMouse: {},
})
type Message = typeof Message.Type

// A side effect is a Command returned from update. It has a name, shows up
// in DevTools next to the Message that produced it, and is assertable in
// tests.
const CreateTodo = Command.define('CreateTodo', {
  args: { text: Schema.String },
  messages: [Message.SucceededCreateTodo, Message.FailedCreateTodo],
})

export class Todo extends Block<Todo>()('Todo', {
  Model,
  Message,
  Command: [CreateTodo],
}) {}

export const TodoLive = Todo.make(
  Effect.fn(function* () {
    const api = yield* Api

    return {
      model: { draft: '', isDrawing: false },

      update: {
        SubmittedTodo: model => ({
          model: modifyFields(model, { draft: () => '' }),
          commands: [CreateTodo({ text: model.draft })],
        }),
        SucceededCreateTodo: model => ({ model }),
        FailedCreateTodo: model => ({ model }),
        PressedCanvas: model => ({
          model: modifyFields(model, { isDrawing: () => true }),
        }),
        ReleasedMouse: model => ({
          model: modifyFields(model, { isDrawing: () => false }),
        }),
      },

      commands: {
        CreateTodo: ({ text }) =>
          api.createTodo(text).pipe(
            Effect.as(Message.SucceededCreateTodo()),
            Effect.catch(() => Effect.succeed(Message.FailedCreateTodo())),
          ),
      },

      // The global listener is a Subscription: an external event source
      // bound to a slice of the Model. The runtime starts and stops it as
      // model.isDrawing changes. No addEventListener, no cleanup, no stale
      // closure.
      subscriptions: {
        mouseRelease: {
          dependencies: model => model.isDrawing,
          stream: (isDrawing: boolean) =>
            isDrawing
              ? Dom.streamFromEvent({
                  target: document,
                  type: 'mouseup',
                  mapEvent: () => Message.ReleasedMouse(),
                })
              : Stream.empty,
        },
      },
    }
  }),
)
