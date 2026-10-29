import { Array, Effect, Layer, Number, Option, Schema } from 'effect'

import { brandViewResult } from '../../brand/index.js'
import { type Html, type HtmlBuilder, createLazy } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'

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
  Ticked: {},
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
  handler: function* () {
    return () => Effect.succeed(Message.MeasuredPanel({ width: 320 }))
  },
})

export const FocusButton = Mount.define('FocusButton', {
  messages: [Message.CompletedFocusButton],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedFocusButton())
  },
})

export const ScrollList = Mount.define('ScrollList', {
  args: { offset: Schema.Number },
  messages: [Message.ScrolledTo],
  handler: function* () {
    return ({ element, offset }) =>
      Effect.sync(() => {
        if (element instanceof HTMLElement) {
          element.scrollTop = offset
        }
        return Message.ScrolledTo({ offset })
      })
  },
})

export const Mounts = [MeasurePanel, FocusButton, ScrollList]
type MountRequirements = Mount.RequirementsOf<typeof Mounts>

// INIT

export const initialModel: Model = {
  isOpen: false,
  measuredWidth: Option.none(),
  count: 0,
}

// UPDATE

export const update = Update.define((model: Model, message: Message) =>
  Message.match(message, {
    ClickedToggle: () => ({
      model: modifyFields(model, { isOpen: isOpen => !isOpen }),
    }),
    MeasuredPanel: ({ width }) => ({
      model: modifyFields(model, { measuredWidth: () => Option.some(width) }),
    }),
    CompletedFocusButton: () => ({ model }),
    FailedMountSidebar: () => ({ model }),
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
    ScrolledTo: () => ({ model }),
    Ticked: () => ({ model }),
  }),
)

// VIEW

export const view = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html => {
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
export const twoPanelView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html => {
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
  h: HtmlBuilder<Message, MountRequirements>,
): Html => {
  return h.div(
    [h.Class('scroll-list')],
    [h.div([h.Key('list'), h.OnMount(ScrollList({ offset }))])],
  )
}

export const keyedScrollListView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html =>
  h.div(
    [],
    [
      h.keyed('div')(`list-${model.count}`, [
        h.OnMount(ScrollList({ offset: model.count })),
      ]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Next']),
    ],
  )

export const keyedAncestorScrollListView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html =>
  h.div(
    [],
    [
      h.keyed('section')(
        `section-${model.count}`,
        [],
        [h.div([h.OnMount(ScrollList({ offset: model.count }))])],
      ),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Next']),
    ],
  )

export const droppedFirstScrollListView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html =>
  h.div(
    [],
    [
      ...Array.map(model.isOpen ? [2] : [1, 2], offset =>
        h.keyed('div')(`list-${offset}`, [h.OnMount(ScrollList({ offset }))]),
      ),
      h.button([h.OnClick(Message.ClickedToggle())], ['Drop']),
    ],
  )

export const toggledMountView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html =>
  h.div(
    [],
    [
      h.div(model.isOpen ? [] : [h.OnMount(MeasurePanel())]),
      h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
    ],
  )

export const switchedMountView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html =>
  h.div(
    [],
    [
      h.div([h.OnMount(model.isOpen ? FocusButton() : MeasurePanel())]),
      h.button([h.OnClick(Message.ClickedToggle())], ['Switch']),
    ],
  )

export const reorderedScrollListView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html => {
  const offsets = model.isOpen ? [3, 1, 4, 2] : [1, 2, 3, 4]

  return h.div(
    [],
    [
      ...Array.map(offsets, offset =>
        h.keyed('div')(`list-${offset}`, [h.OnMount(ScrollList({ offset }))]),
      ),
      h.button([h.OnClick(Message.ClickedToggle())], ['Shuffle']),
    ],
  )
}

export const sharedPanelView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html => {
  const panel = h.div([h.OnMount(MeasurePanel())], ['Panel'])

  return h.div(
    [],
    [
      panel,
      panel,
      h.button(
        [h.OnClick(Message.ClickedIncrement())],
        [`count: ${model.count}`],
      ),
    ],
  )
}

export const makeLazySharedPanelView = () => {
  const lazySection = createLazy()

  return (model: Model, h: HtmlBuilder<Message, MountRequirements>): Html => {
    const panel = h.div([h.OnMount(MeasurePanel())], ['Panel'])

    return h.div(
      [],
      [
        lazySection(
          count => h.section([], [h.div([], [`count: ${count}`]), panel]),
          [model.count],
        ),
        panel,
        h.button([h.OnClick(Message.ClickedIncrement())], ['Next']),
      ],
    )
  }
}

export const makeCachedLazyPanelView = () => {
  const lazyPanel = createLazy()
  const panelView = (h: HtmlBuilder<Message, MountRequirements>): Html =>
    h.div([h.OnMount(MeasurePanel())], ['Panel'])

  return (model: Model, h: HtmlBuilder<Message, MountRequirements>): Html =>
    h.div(
      [],
      [
        h.button([h.OnClick(Message.ClickedIncrement())], ['Insert']),
        ...(model.count > 0 ? [h.div([], ['Inserted'])] : []),
        lazyPanel(panelView, [h]),
      ],
    )
}

export const makeReusedScrollListView = () => {
  let firstRenderList: Html | undefined

  return (model: Model, h: HtmlBuilder<Message, MountRequirements>): Html => {
    const reused =
      firstRenderList ??
      h.div([h.OnMount(ScrollList({ offset: 1 }))], ['Reused'])
    firstRenderList = reused

    return h.div(
      [],
      [
        h.button([h.OnClick(Message.ClickedIncrement())], ['Insert']),
        h.button([h.OnClick(Message.ClickedToggle())], ['Remove']),
        ...(!model.isOpen && model.count > 0
          ? [h.div([h.OnMount(ScrollList({ offset: 2 }))], ['Inserted'])]
          : []),
        ...(model.isOpen ? [] : [reused]),
      ],
    )
  }
}

const closedPanel = (h: HtmlBuilder<Message, MountRequirements>): Html =>
  brandViewResult(
    h.div([h.OnMount(MeasurePanel())], ['Closed']),
    'mountPanel/closedPanel',
  )

const openPanel = (h: HtmlBuilder<Message, MountRequirements>): Html =>
  brandViewResult(
    h.div([h.OnMount(MeasurePanel())], ['Open']),
    'mountPanel/openPanel',
  )

export const branchedPanelView = (
  model: Model,
  h: HtmlBuilder<Message, MountRequirements>,
): Html =>
  h.div(
    [],
    [
      model.isOpen ? openPanel(h) : closedPanel(h),
      h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
    ],
  )

export const EffectsLayer = Layer.mergeAll(
  MeasurePanel.layer,
  FocusButton.layer,
  ScrollList.layer,
)
