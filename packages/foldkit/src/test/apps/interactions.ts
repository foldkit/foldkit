import { Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  clicks: S.Number,
  doubleClicks: S.Number,
  hovered: S.Boolean,
  focused: S.Boolean,
  changed: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedButton: {},
  DoubleClickedButton: {},
  HoveredTarget: {},
  FocusedInput: {},
  BlurredInput: {},
  ChangedSelect: { value: S.String },
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

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedButton: () => ({ model: { ...model, clicks: model.clicks + 1 } }),
    DoubleClickedButton: () => ({
      model: { ...model, doubleClicks: model.doubleClicks + 1 },
    }),
    HoveredTarget: () => ({ model: { ...model, hovered: true } }),
    FocusedInput: () => ({ model: { ...model, focused: true } }),
    BlurredInput: () => ({ model: { ...model, focused: false } }),
    ChangedSelect: ({ value }) => ({ model: { ...model, changed: value } }),
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
