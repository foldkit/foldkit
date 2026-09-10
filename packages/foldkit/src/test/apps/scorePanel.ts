import { Number, Schema } from 'effect'

import type { Html } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import { defineView } from '../../submodel/public.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({ score: Schema.Number })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedIncrement: {},
})

export type Message = typeof Message.Type

// INIT

export const initialModel = Model.make({ score: 0 })

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: evo(model, { score: Number.increment }),
    }),
  })

// VIEW

export type ViewInputs = Readonly<{
  label: string
  toView: (content: Readonly<{ label: string; score: number }>) => Html
}>

export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) =>
    h.div(
      [],
      [
        viewInputs.toView({ label: viewInputs.label, score: model.score }),
        h.button(
          [h.OnClick(Message.ClickedIncrement()), h.Role('button')],
          ['Increment'],
        ),
      ],
    ),
)
