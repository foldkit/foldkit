import { Schema } from 'effect'

import * as CustomElement from '../../customElement/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// CUSTOM ELEMENT

export const hexColorPicker = CustomElement.define({
  tag: 'hex-color-picker',
  properties: {
    color: Schema.String,
  },
  events: {
    'color-changed': Schema.Struct({ value: Schema.String }),
  },
})

// MODEL

export const Model = Schema.Struct({ color: Schema.String })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ChangedColor: { value: Schema.String },
})

export type Message = typeof Message.Type

// INIT

export const initialModel = Model.make({ color: '#000000' })

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
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
