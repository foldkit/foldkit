import { Number, Option, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  clicks: Schema.Number,
  doubleClicks: Schema.Number,
  hovered: Schema.Boolean,
  maybeHoverExitSource: Schema.Option(
    Schema.Literals(['MouseLeave', 'MouseOut']),
  ),
  isBadgeHovered: Schema.Boolean,
  focused: Schema.Boolean,
  changed: Schema.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedButton: {},
  DoubleClickedButton: {},
  HoveredTarget: {},
  LeftTarget: {},
  LeftTargetByMouseOut: {},
  HoveredBadge: {},
  LeftBadge: {},
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
  maybeHoverExitSource: Option.none(),
  isBadgeHovered: false,
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
      model: modifyFields(model, {
        hovered: () => true,
        maybeHoverExitSource: () => Option.none(),
      }),
    }),
    LeftTarget: () => ({
      model: modifyFields(model, {
        hovered: () => false,
        maybeHoverExitSource: () => Option.some('MouseLeave'),
      }),
    }),
    LeftTargetByMouseOut: () => ({
      model: modifyFields(model, {
        hovered: () => false,
        maybeHoverExitSource: () => Option.some('MouseOut'),
      }),
    }),
    HoveredBadge: () => ({
      model: modifyFields(model, { isBadgeHovered: () => true }),
    }),
    LeftBadge: () => ({
      model: modifyFields(model, { isBadgeHovered: () => false }),
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
      h.div(
        [h.Role('region'), h.AriaLabel('Interaction scope')],
        [
          h.button(
            [
              h.OnClick(Message.ClickedButton()),
              h.OnDoubleClick(Message.DoubleClickedButton()),
              h.OnMouseEnter(Message.HoveredTarget()),
              h.OnMouseLeave(Message.LeftTarget()),
              h.OnMouseOut(Message.LeftTargetByMouseOut()),
              h.AriaLabel('action'),
            ],
            [
              `clicks=${model.clicks} dbl=${model.doubleClicks} hovered=${model.hovered} source=${Option.getOrElse(model.maybeHoverExitSource, () => 'Pending')}`,
            ],
          ),
          h.span(
            [
              h.OnMouseOver(Message.HoveredBadge()),
              h.OnMouseOut(Message.LeftBadge()),
              h.AriaLabel('badge'),
            ],
            [`badge hovered=${model.isBadgeHovered}`],
          ),
        ],
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
