import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

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

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

export const update = ApplicationComposition.makeUpdate({
  ClickedDecrement: model => ({
    model: modifyFields(model, { count: count => count - 1 }),
  }),
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
  ClickedReset: model => ({ model: modifyFields(model, { count: () => 0 }) }),
})

export const init = ApplicationComposition.makeInit(() => ({
  model: { count: 0 },
}))

export const view = ApplicationComposition.makeView((model, h) => ({
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
}))

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

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
