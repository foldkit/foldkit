import { Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({
  count: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
type Message = typeof Message.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },

      update: {
        ClickedDecrement: model => ({
          model: modifyFields(model, { count: Number.decrement }),
        }),
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
        ClickedReset: model => ({
          model: modifyFields(model, { count: () => 0 }),
        }),
      },

      view: (model, h) => ({
        title: `Counter: ${model.count}`,
        body: h.div(
          [
            h.Class(
              'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6',
            ),
          ],
          [
            h.div(
              [h.Class('text-6xl font-bold text-gray-800')],
              [model.count.toString()],
            ),
            h.div(
              [h.Class('flex flex-wrap justify-center gap-4')],
              [
                h.button(
                  [h.OnClick(Message.ClickedDecrement()), h.Class(buttonStyle)],
                  ['-'],
                ),
                h.button(
                  [h.OnClick(Message.ClickedReset()), h.Class(buttonStyle)],
                  ['Reset'],
                ),
                h.button(
                  [h.OnClick(Message.ClickedIncrement()), h.Class(buttonStyle)],
                  ['+'],
                ),
              ],
            ),
          ],
        ),
      }),
    }
  }),
)
