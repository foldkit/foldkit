import { Match as M, Schema as S } from 'effect'

import { type Html, html } from '../../html/index.js'
import { m } from '../../message/index.js'

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

export const ClickedButton = m('ClickedButton')
export const DoubleClickedButton = m('DoubleClickedButton')
export const HoveredTarget = m('HoveredTarget')
export const FocusedInput = m('FocusedInput')
export const BlurredInput = m('BlurredInput')
export const ChangedSelect = m('ChangedSelect', { value: S.String })

export const Message = S.Union([
  ClickedButton,
  DoubleClickedButton,
  HoveredTarget,
  FocusedInput,
  BlurredInput,
  ChangedSelect,
])
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

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ClickedButton: () => [{ ...model, clicks: model.clicks + 1 }, []],
      DoubleClickedButton: () => [
        { ...model, doubleClicks: model.doubleClicks + 1 },
        [],
      ],
      HoveredTarget: () => [{ ...model, hovered: true }, []],
      FocusedInput: () => [{ ...model, focused: true }, []],
      BlurredInput: () => [{ ...model, focused: false }, []],
      ChangedSelect: ({ value }) => [{ ...model, changed: value }, []],
    }),
  )

// VIEW

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.button(
        [
          h.OnClick(ClickedButton()),
          h.OnDoubleClick(DoubleClickedButton()),
          h.OnMouseEnter(HoveredTarget()),
          h.AriaLabel('action'),
        ],
        [`clicks=${model.clicks} dbl=${model.doubleClicks}`],
      ),
      h.input([
        h.Role('textbox'),
        h.AriaLabel('name'),
        h.OnFocus(FocusedInput()),
        h.OnBlur(BlurredInput()),
      ]),
      h.select(
        [h.AriaLabel('fruit'), h.OnChange(value => ChangedSelect({ value }))],
        [
          h.option([h.Value('apple')], ['Apple']),
          h.option([h.Value('banana')], ['Banana']),
        ],
      ),
    ],
  )
}
