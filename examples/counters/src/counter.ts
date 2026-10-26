import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

const Model = Schema.Struct({
  count: Schema.Number,
})

const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
})
const CounterDefinition = Block.makeDefinition('Counter', {
  Model,
  Message,
})

const { makeFieldsStep } = CounterDefinition

const CounterComposition = CounterDefinition.makeComposition()

const init = CounterComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

const update = CounterComposition.makeUpdate({
  ClickedDecrement: makeFieldsStep(() => ({
    count: count => count - 1,
  })),
  ClickedIncrement: makeFieldsStep(() => ({
    count: count => count + 1,
  })),
})

const view = CounterComposition.makeView((model, h) =>
  h.div(
    [
      h.Class(
        'flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3',
      ),
    ],
    [
      Button.view(
        {
          onClick: Message.ClickedDecrement(),
          toView: attributes =>
            h.button([...attributes.button, h.Class(buttonStyle)], ['-']),
        },
        h,
      ),
      h.span(
        [h.Class('w-12 text-center text-2xl font-mono tabular-nums')],
        [model.count.toString()],
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
)

const buttonStyle =
  'h-9 w-9 rounded bg-gray-900 text-white text-lg leading-none hover:bg-gray-700 transition cursor-pointer'

const prepare = () =>
  CounterComposition.prepareBlock({
    init,
    update,
    view,
  })
export const CounterBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
