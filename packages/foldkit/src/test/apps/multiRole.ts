import { Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'

// MODEL

export const Model = S.Struct({ clicks: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedFallback: {},
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = { clicks: 0 }

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedFallback: () => ({ model: { ...model, clicks: model.clicks + 1 } }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.div(
        [h.Role('doc-subtitle heading'), h.OnClick(Message.ClickedFallback())],
        [`Fallback element clicks=${model.clicks}`],
      ),
    ],
  )
}
