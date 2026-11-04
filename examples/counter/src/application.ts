import { Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { view as buttonView } from '@foldkit/ui/button'

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

export const ApplicationKey = Symbol('Application')

export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const { makeFieldsStep } = ApplicationBlock

export const ApplicationComposition = ApplicationBlock.makeComposition()

export const init = ApplicationComposition.makeInit(() => ({
  model: { count: 0 },
}))

export const update = ApplicationComposition.makeUpdate({
  ClickedDecrement: makeFieldsStep(() => ({
    count: Number.decrement,
  })),
  ClickedIncrement: makeFieldsStep(() => ({
    count: Number.increment,
  })),
  ClickedReset: makeFieldsStep(() => ({
    count: () => 0,
  })),
})

export const view = ApplicationComposition.makeView((model, h) => ({
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
          buttonView(
            {
              onClick: Message.ClickedDecrement(),
              toView: attributes =>
                h.button([...attributes.button, h.Class(buttonStyle)], ['-']),
            },
            h,
          ),
          buttonView(
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
          buttonView(
            {
              onClick: Message.ClickedIncrement(),
              toView: attributes =>
                h.button([...attributes.button, h.Class(buttonStyle)], ['+']),
            },
            h,
          ),
        ],
      ),
    ],
  ),
}))

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)
