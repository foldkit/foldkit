import { Effect, Match as M, Option, Schema as S } from 'effect'

import { html } from '../../html/index.js'
import type { Html } from '../../html/index.js'
import { m } from '../../message/index.js'
import * as Mount from '../../mount/index.js'

// MODEL

export const Model = S.Struct({
  isOpen: S.Boolean,
  measuredWidth: S.OptionFromNullOr(S.Number),
  count: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedToggle = m('ClickedToggle')
export const MeasuredPanel = m('MeasuredPanel', { width: S.Number })
export const CompletedFocusButton = m('CompletedFocusButton')
export const FailedMountSidebar = m('FailedMountSidebar', { reason: S.String })
export const ClickedIncrement = m('ClickedIncrement')

export const Message = S.Union([
  ClickedToggle,
  MeasuredPanel,
  CompletedFocusButton,
  FailedMountSidebar,
  ClickedIncrement,
])
export type Message = typeof Message.Type

// MOUNT

export const PanelMeasure = Mount.define(
  'PanelMeasure',
  MeasuredPanel,
  FailedMountSidebar,
)

export const ButtonFocus = Mount.define('ButtonFocus', CompletedFocusButton)

// INIT

export const initialModel: Model = {
  isOpen: false,
  measuredWidth: Option.none(),
  count: 0,
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ClickedToggle: () => [{ ...model, isOpen: !model.isOpen }, []],
      MeasuredPanel: ({ width }) => [
        { ...model, measuredWidth: Option.some(width) },
        [],
      ],
      CompletedFocusButton: () => [model, []],
      FailedMountSidebar: () => [model, []],
      ClickedIncrement: () => [{ ...model, count: model.count + 1 }, []],
    }),
  )

// VIEW

const { div, button, span, OnMount, OnClick, Class, Key } = html<Message>()

const panelMount = PanelMeasure(() =>
  Effect.succeed({
    message: MeasuredPanel({ width: 320 }),
    cleanup: () => {},
  }),
)

const buttonFocusMount = ButtonFocus(() =>
  Effect.succeed({
    message: CompletedFocusButton(),
    cleanup: () => {},
  }),
)

export const view = (model: Model): Html =>
  div(
    [Class('panel-test')],
    [
      button(
        [Key('toggle'), OnClick(ClickedToggle()), OnMount(buttonFocusMount)],
        [model.isOpen ? 'Close' : 'Open'],
      ),
      ...(model.isOpen
        ? [
            div(
              [Key('panel'), OnMount(panelMount)],
              [
                span(
                  [],
                  [
                    Option.match(model.measuredWidth, {
                      onNone: () => 'unmeasured',
                      onSome: width => `width: ${width}`,
                    }),
                  ],
                ),
              ],
            ),
          ]
        : []),
    ],
  )

/** A view that always renders both the toggle button and the panel, exposing
 *  two PanelMeasure mounts simultaneously so we can exercise the (name,
 *  occurrence) tracking. */
export const twoPanelView = (model: Model): Html =>
  div(
    [Class('two-panels')],
    [
      div([Key('panel-a'), OnMount(panelMount)], [span([], ['A'])]),
      div([Key('panel-b'), OnMount(panelMount)], [span([], ['B'])]),
      button(
        [Key('inc'), OnClick(ClickedIncrement())],
        [`count: ${model.count}`],
      ),
    ],
  )
