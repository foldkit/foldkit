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
export const ScrolledTo = m('ScrolledTo', { offset: S.Number })

export const Message = S.Union([
  ClickedToggle,
  MeasuredPanel,
  CompletedFocusButton,
  FailedMountSidebar,
  ClickedIncrement,
  ScrolledTo,
])
export type Message = typeof Message.Type

// MOUNT

// NOTE: these Mounts are runtime/Scene fixtures, not idiomatic examples of
// Mount work. Their factory bodies skip the DOM measurement/manipulation that
// real Mounts perform (e.g. `element.getBoundingClientRect()` for measurement,
// `element.focus()` for focus) and emit synthetic result Messages so tests can
// pin specific values. See `ui/popover/popover.ts`, `ui/listbox/shared.ts`,
// etc. for production-shaped Mounts that read or write the element handle.

export const MeasurePanel = Mount.define(
  'MeasurePanel',
  MeasuredPanel,
  FailedMountSidebar,
)(() => Effect.succeed(MeasuredPanel({ width: 320 })))

export const FocusButton = Mount.define(
  'FocusButton',
  CompletedFocusButton,
)(() => Effect.succeed(CompletedFocusButton()))

export const ScrollList = Mount.define(
  'ScrollList',
  { offset: S.Number },
  ScrolledTo,
)(
  ({ offset }) =>
    element =>
      Effect.sync(() => {
        if (element instanceof HTMLElement) {
          element.scrollTop = offset
        }
        return ScrolledTo({ offset })
      }),
)

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
      ScrolledTo: () => [model, []],
    }),
  )

// VIEW

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('panel-test')],
    [
      h.button(
        [h.Key('toggle'), h.OnClick(ClickedToggle()), h.OnMount(FocusButton())],
        [model.isOpen ? 'Close' : 'Open'],
      ),
      ...(model.isOpen
        ? [
            h.div(
              [h.Key('panel'), h.OnMount(MeasurePanel())],
              [
                h.span(
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
}

/** A view that always renders both the toggle button and the panel, exposing
 *  two MeasurePanel mounts simultaneously so we can exercise the (name,
 *  occurrence) tracking. */
export const twoPanelView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('two-panels')],
    [
      h.div([h.Key('panel-a'), h.OnMount(MeasurePanel())], [h.span([], ['A'])]),
      h.div([h.Key('panel-b'), h.OnMount(MeasurePanel())], [h.span([], ['B'])]),
      h.button(
        [h.Key('inc'), h.OnClick(ClickedIncrement())],
        [`count: ${model.count}`],
      ),
    ],
  )
}

/** A view that renders an arg-bearing Mount so Scene tests can exercise
 *  Instance-based mount matching (matcher's args structurally equal the
 *  pending Mount's args). The chosen `offset` flows through `ScrollList`'s
 *  args and is observable on the rendered Mount marker. */
export const scrollListView = (offset: number): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('scroll-list')],
    [h.div([h.Key('list'), h.OnMount(ScrollList({ offset }))], [])],
  )
}
