import { Schema as S } from 'effect'
import { Submodel, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

// MODEL

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

export const init: Model = { count: 0 }

// MESSAGE

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
})

export type Message = typeof Message.Type

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedDecrement: () => ({
      model: evo(model, { count: count => count - 1 }),
    }),
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + 1 }),
    }),
  })

// VIEW

const buttonStyle =
  'h-9 w-9 rounded-full border border-stone-300 text-lg leading-none text-stone-700 hover:bg-stone-100 transition cursor-pointer'

export const view = Submodel.defineView<Model, Message>((model, h) =>
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
