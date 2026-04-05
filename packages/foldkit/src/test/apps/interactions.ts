import { Match as M, Schema as S } from 'effect'

import { type Html, html } from '../../html'
import { m } from '../../message'

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

export const Message = S.Union(
  ClickedButton,
  DoubleClickedButton,
  HoveredTarget,
  FocusedInput,
  BlurredInput,
  ChangedSelect,
)
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

const {
  div,
  button,
  input,
  select,
  option,
  OnClick,
  OnDblClick,
  OnMouseEnter,
  OnFocus,
  OnBlur,
  OnChange,
  Role,
  AriaLabel,
  Value,
} = html<Message>()

export const view = (model: Model): Html =>
  div(
    [],
    [
      button(
        [
          OnClick(ClickedButton()),
          OnDblClick(DoubleClickedButton()),
          OnMouseEnter(HoveredTarget()),
          AriaLabel('action'),
        ],
        [`clicks=${model.clicks} dbl=${model.doubleClicks}`],
      ),
      input([
        Role('textbox'),
        AriaLabel('name'),
        OnFocus(FocusedInput()),
        OnBlur(BlurredInput()),
      ]),
      select(
        [AriaLabel('fruit'), OnChange(value => ChangedSelect({ value }))],
        [
          option([Value('apple')], ['Apple']),
          option([Value('banana')], ['Banana']),
        ],
      ),
    ],
  )
