import { Effect, Number, Option, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  isOpen: Schema.Boolean,
  measuredWidth: Schema.OptionFromNullOr(Schema.Number),
  count: Schema.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedToggle: {},
  MeasuredPanel: { width: Schema.Number },
  CompletedFocusButton: {},
  FailedMountSidebar: { reason: Schema.String },
  ClickedIncrement: {},
  ScrolledTo: { offset: Schema.Number },
})

export type Message = typeof Message.Type

// MOUNT

// NOTE: these Mounts are runtime/Scene fixtures, not idiomatic examples of
// Mount work. Their `execute` bodies skip the DOM measurement/manipulation
// that real Mounts perform (e.g. `element.getBoundingClientRect()` for
// measurement, `element.focus()` for focus) and emit synthetic result Messages
// so tests can pin specific values. See `ui/popover/index.ts`,
// `ui/listbox/shared.ts`, etc. for production-shaped Mounts that read or write
// the element handle.

export const MeasurePanel = Mount.define('MeasurePanel', {
  messages: [Message.MeasuredPanel, Message.FailedMountSidebar],
  execute: () => Effect.succeed(Message.MeasuredPanel({ width: 320 })),
})

export const FocusButton = Mount.define('FocusButton', {
  messages: [Message.CompletedFocusButton],
  execute: () => Effect.succeed(Message.CompletedFocusButton()),
})

export const ScrollList = Mount.define('ScrollList', {
  args: { offset: Schema.Number },
  messages: [Message.ScrolledTo],
  execute: ({ element, offset }) =>
    Effect.sync(() => {
      if (element instanceof HTMLElement) {
        element.scrollTop = offset
      }
      return Message.ScrolledTo({ offset })
    }),
})

// INIT

export const initialModel: Model = {
  isOpen: false,
  measuredWidth: Option.none(),
  count: 0,
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedToggle: () => ({
      model: evo(model, { isOpen: isOpen => !isOpen }),
    }),
    MeasuredPanel: ({ width }) => ({
      model: evo(model, { measuredWidth: () => Option.some(width) }),
    }),
    CompletedFocusButton: () => ({ model }),
    FailedMountSidebar: () => ({ model }),
    ClickedIncrement: () => ({
      model: evo(model, { count: Number.increment }),
    }),
    ScrolledTo: () => ({ model }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Class('panel-test')],
    [
      h.button(
        [
          h.Key('toggle'),
          h.OnClick(Message.ClickedToggle()),
          h.OnMount(FocusButton()),
        ],
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
export const twoPanelView = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Class('two-panels')],
    [
      h.div([h.Key('panel-a'), h.OnMount(MeasurePanel())], [h.span([], ['A'])]),
      h.div([h.Key('panel-b'), h.OnMount(MeasurePanel())], [h.span([], ['B'])]),
      h.button(
        [h.Key('inc'), h.OnClick(Message.ClickedIncrement())],
        [`count: ${model.count}`],
      ),
    ],
  )
}

/** A view that renders an arg-bearing Mount so Scene tests can exercise
 *  Instance-based mount matching (matcher's args structurally equal the
 *  pending Mount's args). The chosen `offset` flows through `ScrollList`'s
 *  args and is observable on the rendered Mount marker. */
export const scrollListView = (
  offset: number,
  h: HtmlBuilder<Message>,
): Html => {
  return h.div(
    [h.Class('scroll-list')],
    [h.div([h.Key('list'), h.OnMount(ScrollList({ offset }))])],
  )
}
