import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

const Model = Schema.Struct({ count: Schema.Number })

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

const buttonStyle =
  'h-9 w-9 rounded-full border border-stone-300 text-lg leading-none text-stone-700 hover:bg-stone-100 transition cursor-pointer'

const view = CounterComposition.makeView((model, h) =>
  h.div(
    [h.Class('flex items-center gap-4')],
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
        [h.Class('w-12 text-center font-mono text-2xl tabular-nums')],
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
