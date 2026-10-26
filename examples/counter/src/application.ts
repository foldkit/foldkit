import { Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

export const Model = Schema.Struct({
  count: Schema.Number,
})

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep } = ApplicationDefinition

export const ApplicationComposition = ApplicationDefinition.makeComposition()

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
          Button.view(
            {
              onClick: Message.ClickedDecrement(),
              toView: attributes =>
                h.button([...attributes.button, h.Class(buttonStyle)], ['-']),
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

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
