import { Schema as S } from 'effect'

import * as CustomElement from '../../customElement/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// CUSTOM ELEMENT

export const hexColorPicker = CustomElement.define({
  tag: 'hex-color-picker',
  properties: {
    color: S.String,
  },
  events: {
    'color-changed': S.Struct({ value: S.String }),
  },
})

// MODEL

export const Model = S.Struct({ color: S.String })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ChangedColor: { value: S.String },
})

export type Message = typeof Message.Type

// INIT

export const initialModel = Model.make({ color: '#000000' })

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedColor: ({ value }) => ({
      model: evo(model, { color: () => value }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const picker = hexColorPicker.withMessage(h)

  return h.div(
    [],
    [
      picker(
        [
          picker.Color(model.color),
          picker.OnColorChanged(detail =>
            Message.ChangedColor({ value: detail.value }),
          ),
        ],
        [],
      ),
      h.span([h.Role('status')], [model.color]),
    ],
  )
}

export const viewWithoutHandler = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const picker = hexColorPicker.withMessage(h)

  return h.div(
    [],
    [
      picker([picker.Color(model.color)], []),
      h.span([h.Role('status')], [model.color]),
    ],
  )
}
