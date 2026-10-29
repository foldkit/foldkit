import { Array, Effect, Number, Option, Schema } from 'effect'

import { brandViewResult } from '../../brand/index.js'
import { type Html, type HtmlBuilder, createLazy } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { modifyFields } from '../../struct/index.js'
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

/** A view that keys the `ScrollList` element by `count`, so every
 *  `ClickedIncrement` replaces the element and remounts `ScrollList` with the
 *  new offset. */
export const keyedScrollListView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('keyed-scroll-list')],
    [
      h.keyed('div')(`list-${model.count}`, [
        h.OnMount(ScrollList({ offset: model.count })),
      ]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Next']),
    ],
  )

/** A view that keys a wrapper by `count` and puts `ScrollList` on an unkeyed
 *  child, so replacing the wrapper also replaces the element that owns the
 *  Mount. */
export const keyedAncestorScrollListView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('keyed-ancestor-scroll-list')],
    [
      h.keyed('section')(
        `section-${model.count}`,
        [],
        [h.div([h.OnMount(ScrollList({ offset: model.count }))])],
      ),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Next']),
    ],
  )

/** A view that renders `ScrollList` on an unkeyed element whose args follow
 *  `count`, until `ClickedToggle` removes it. The renderer patches that
 *  element in place while it stays, so the Mount keeps the args it was
 *  acquired with. */
export const unkeyedScrollListView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('unkeyed-scroll-list')],
    [
      ...(model.isOpen
        ? []
        : [h.div([h.OnMount(ScrollList({ offset: model.count }))])]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Next']),
      h.button([h.OnClick(Message.ClickedToggle())], ['Remove']),
    ],
  )

const OFFSETS: ReadonlyArray<number> = [1, 2, 3, 4]
const SHUFFLED_OFFSETS: ReadonlyArray<number> = [3, 1, 4, 2]

/** A view that renders four keyed `ScrollList` elements and shuffles their
 *  order on `ClickedToggle`. The renderer moves every element, so no Mount
 *  ends. */
export const reorderedScrollListView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('reordered-scroll-list')],
    [
      ...Array.map(model.isOpen ? SHUFFLED_OFFSETS : OFFSETS, offset =>
        h.keyed('div')(`list-${offset}`, [h.OnMount(ScrollList({ offset }))]),
      ),
      h.button([h.OnClick(Message.ClickedToggle())], ['Shuffle']),
    ],
  )

/** A view that renders one `MeasurePanel` VNode at two positions. The
 *  renderer clones the second occurrence, so each position owns its own
 *  element and Mount. */
export const sharedPanelView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const panel = h.div([h.OnMount(MeasurePanel())], ['Panel'])

  return h.div(
    [h.Class('shared-panel')],
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

/** Builds a view that renders one `MeasurePanel` VNode inside a `createLazy`
 *  view and again outside it. The renderer clones the outside occurrence, so
 *  each position owns its own element and Mount. */
export const makeLazySharedPanelView = () => {
  const lazySection = createLazy()

  return (model: Model, h: HtmlBuilder<Message>): Html => {
    const panel = h.div([h.OnMount(MeasurePanel())], ['Panel'])

    return h.div(
      [h.Class('lazy-shared-panel')],
      [
        lazySection(
          count => h.section([h.Class(`count-${count}`)], [panel]),
          [model.count],
        ),
        panel,
        h.button(
          [h.OnClick(Message.ClickedIncrement())],
          [`count: ${model.count}`],
        ),
      ],
    )
  }
}

/** Builds a view whose last child is a `createLazy` view with constant args,
 *  so every render after the first returns the same memoized `MeasurePanel`
 *  VNode. Once `count` is positive an unkeyed `div` is inserted before it. The
 *  renderer pairs the memoized VNode with itself, so its Mount stays. */
export const makeCachedLazyPanelView = () => {
  const lazyPanel = createLazy()
  const panelView = (h: HtmlBuilder<Message>): Html =>
    h.div([h.OnMount(MeasurePanel())], ['Panel'])

  return (model: Model, h: HtmlBuilder<Message>): Html => {
    const inserted = model.count > 0 ? [h.div([], ['Inserted'])] : []

    return h.div(
      [h.Class('cached-lazy-panel')],
      [
        h.button([h.OnClick(Message.ClickedIncrement())], ['Insert']),
        ...inserted,
        lazyPanel(panelView, [h]),
      ],
    )
  }
}

/** Builds a view that returns the same `ScrollList` VNode on every render and,
 *  once `count` is positive, inserts an unkeyed `div` carrying
 *  `ScrollList({ offset: 2 })` before it. The renderer clones a VNode reused
 *  from its previous render, so the reused element pairs with the inserted
 *  `div` by position: the existing Mount stays with that element, keeping
 *  offset 1, and the clone acquires a new one. `ClickedToggle` removes both. */
export const makeReusedScrollListView = () => {
  let firstRenderList: Html | undefined

  return (model: Model, h: HtmlBuilder<Message>): Html => {
    const reused =
      firstRenderList ??
      h.div([h.OnMount(ScrollList({ offset: 1 }))], ['Reused'])
    firstRenderList = reused

    const inserted =
      model.count > 0
        ? [h.div([h.OnMount(ScrollList({ offset: 2 }))], ['Inserted'])]
        : []
    const lists = model.isOpen ? [] : [...inserted, reused]

    return h.div(
      [h.Class('reused-scroll-list')],
      [
        h.button([h.OnClick(Message.ClickedIncrement())], ['Insert']),
        h.button([h.OnClick(Message.ClickedToggle())], ['Remove']),
        ...lists,
      ],
    )
  }
}

/** A view that renders one unkeyed element whose `OnMount` switches from
 *  `MeasurePanel` to `FocusButton` on `ClickedToggle`. The renderer patches the
 *  element in place. */
export const switchedMountView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('switched-mount')],
    [
      h.div([h.OnMount(model.isOpen ? FocusButton() : MeasurePanel())]),
      h.button([h.OnClick(Message.ClickedToggle())], ['Switch']),
    ],
  )

/** A view that renders keyed `ScrollList` elements for offsets 1 and 2, and
 *  drops the first one on `ClickedToggle`. */
export const droppedFirstScrollListView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('dropped-first-scroll-list')],
    [
      ...Array.map(model.isOpen ? [2] : [1, 2], offset =>
        h.keyed('div')(`list-${offset}`, [h.OnMount(ScrollList({ offset }))]),
      ),
      h.button([h.OnClick(Message.ClickedToggle())], ['Drop']),
    ],
  )

/** A view that renders one unkeyed element and puts `MeasurePanel` on it only
 *  while the Model is closed. The renderer patches the element in place. */
export const toggledMountView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('toggled-mount')],
    [
      h.div(model.isOpen ? [] : [h.OnMount(MeasurePanel())]),
      h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
    ],
  )

const closedPanel = (h: HtmlBuilder<Message>): Html =>
  brandViewResult(
    h.div([h.OnMount(MeasurePanel())], ['Closed']),
    'mountPanel/closedPanel',
  )

const openPanel = (h: HtmlBuilder<Message>): Html =>
  brandViewResult(
    h.div([h.OnMount(MeasurePanel())], ['Open']),
    'mountPanel/openPanel',
  )

/** A view that switches between two view functions rendering the same tag and
 *  Mount. The identities stamped by `brandViewResult` stand in for the ones
 *  `@foldkit/vite-plugin` injects, so toggling replaces the element. */
export const branchedPanelView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('branched-panel')],
    [
      model.isOpen ? openPanel(h) : closedPanel(h),
      h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
    ],
  )
