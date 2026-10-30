import { Context, Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'

// services.ts
export class Greeting extends Context.Service<
  Greeting,
  Readonly<{ text: string }>
>()('app/Greeting') {}

export const ApplicationLayer = Layer.succeed(Greeting, { text: 'Hello' })

// application.ts
export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ greeting: Schema.String }),
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const greeting = yield* Greeting

    return {
      model: { greeting: greeting.text },
      view: (model, h) => ({
        title: model.greeting,
        body: h.h1([], [model.greeting]),
      }),
    }
  }),
)

// entry.ts
const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ApplicationLayer)),
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)
