import { Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

export const Model = Schema.Struct({
  count: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
export type Message = typeof Message.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

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
            h.p(
              [h.Class('text-6xl font-bold text-gray-800')],
              [model.count.toString()],
            ),
            h.div(
              [h.Class('flex flex-wrap justify-center gap-4')],
              [
                Button.view(
                  {
                    onClick: Message.ClickedDecrement(),
                    toView: attributes =>
                      h.button(
                        [...attributes.button, h.Class(buttonStyle)],
                        ['-'],
                      ),
                  },
                  h,
                ),
                Button.view(
                  {
                    onClick: Message.ClickedReset(),
                    toView: attributes =>
                      h.button(
                        [...attributes.button, h.Class(buttonStyle)],
                        ['Reset'],
                      ),
                  },
                  h,
                ),
                Button.view(
                  {
                    onClick: Message.ClickedIncrement(),
                    toView: attributes =>
                      h.button(
                        [...attributes.button, h.Class(buttonStyle)],
                        ['+'],
                      ),
                  },
                  h,
                ),
              ],
            ),
          ],
        ),
      }),
    }
  }),
)

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
