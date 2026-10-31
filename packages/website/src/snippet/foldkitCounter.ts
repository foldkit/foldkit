import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({
  count: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedIncrement: {},
})
type Message = typeof Message.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },

      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: count => count + 1 }),
        }),
      },

      view: (model, h) => ({
        title: `Count: ${model.count}`,
        body: h.div(
          [],
          [
            h.p([], [`Count: ${model.count}`]),
            h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
          ],
        ),
      }),
    }
  }),
)
