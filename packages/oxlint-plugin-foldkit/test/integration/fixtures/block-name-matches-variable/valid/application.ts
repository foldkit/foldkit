import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ ClickedLink: {} })

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({}),
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: {},
      update: { ClickedLink: model => ({ model }) },
      view: (_model, h) => ({ title: 'Home', body: h.main([]) }),
    }
  }),
)
