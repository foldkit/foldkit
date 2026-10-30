import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export const Flags = Schema.Struct({ start: Schema.Number })
export type Flags = typeof Flags.Type

export const Message = defineMessageUnion({
  ClickedIncrement: {},
})
export type Message = typeof Message.Type

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    return {
      model: { count: flags.start },
      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: count => count + 1 }),
        }),
      },
      view: (model, h) => ({
        title: `Count ${model.count}`,
        body: h.main([h.Id('counter')], [model.count.toString()]),
      }),
    }
  }),
)
