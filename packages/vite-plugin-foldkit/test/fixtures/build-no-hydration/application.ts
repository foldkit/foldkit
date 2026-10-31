import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export class Application extends Block<Application>()('Application', {
  Model,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },
      view: (model, h) => ({
        title: 'Client only',
        body: h.main([], [model.count.toString()]),
      }),
    }
  }),
)
