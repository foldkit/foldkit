import { Number, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  clicks: Schema.Number,
  doubleClicks: Schema.Number,
  hovered: Schema.Boolean,
  focused: Schema.Boolean,
  changed: Schema.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedButton: {},
  DoubleClickedButton: {},
  HoveredTarget: {},
  FocusedInput: {},
  BlurredInput: {},
  ChangedSelect: { value: Schema.String },
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  clicks: 0,
  doubleClicks: 0,
  hovered: false,
  focused: false,
  changed: '',
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedButton: () => ({
      model: modifyFields(model, { clicks: Number.increment }),
    }),
    DoubleClickedButton: () => ({
      model: modifyFields(model, { doubleClicks: Number.increment }),
    }),
    HoveredTarget: () => ({
      model: modifyFields(model, { hovered: () => true }),
    }),
    FocusedInput: () => ({
      model: modifyFields(model, { focused: () => true }),
    }),
    BlurredInput: () => ({
      model: modifyFields(model, { focused: () => false }),
    }),
    ChangedSelect: ({ value }) => ({
      model: modifyFields(model, { changed: () => value }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button(
        [
          h.OnClick(Message.ClickedButton()),
          h.OnDoubleClick(Message.DoubleClickedButton()),
          h.OnMouseEnter(Message.HoveredTarget()),
          h.AriaLabel('action'),
        ],
        [`clicks=${model.clicks} dbl=${model.doubleClicks}`],
      ),
      h.input([
        h.Role('textbox'),
        h.AriaLabel('name'),
        h.OnFocus(Message.FocusedInput()),
        h.OnBlur(Message.BlurredInput()),
      ]),
      h.select(
        [
          h.AriaLabel('fruit'),
          h.OnChange(value => Message.ChangedSelect({ value })),
        ],
        [
          h.option([h.Value('apple')], ['Apple']),
          h.option([h.Value('banana')], ['Banana']),
        ],
      ),
    ],
  )
}
