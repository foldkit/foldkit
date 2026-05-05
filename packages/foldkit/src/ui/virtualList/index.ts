import {
  Array,
  Effect,
  Match as M,
  Number,
  Option,
  Queue,
  Schema as S,
  Stream,
  pipe,
} from 'effect'

import * as Command from '../../command/index.js'
import {
  type Attribute,
  type Html,
  type TagName,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { makeSubscriptions } from '../../runtime/subscription.js'
import { ts } from '../../schema/index.js'
import { evo } from '../../struct/index.js'

// MODEL

const Unmeasured = ts('Unmeasured')
const Measured = ts('Measured', { containerHeight: S.Number })

/** Measurement state of the virtual list's scrollable container.
 *
 * Before the container's `ResizeObserver` fires for the first time we don't
 * know its height and cannot compute a visible slice. The view must handle
 * `Unmeasured` explicitly, typically by rendering a placeholder until the
 * first measurement arrives.
 */
const Measurement = S.Union([Unmeasured, Measured])

const Idle = ts('Idle')
const ScrollingToIndex = ts('ScrollingToIndex', {
  index: S.Number,
  version: S.Number,
})

/** State of a programmatic scroll initiated by `scrollToIndex`. */
const PendingScroll = S.Union([Idle, ScrollingToIndex])

/** Schema for the virtual list's state. Tracks scroll position, container
 *  measurement, and any in-flight programmatic scroll. */
export const Model = S.Struct({
  id: S.String,
  rowHeightPx: S.Number,
  scrollTop: S.Number,
  measurement: Measurement,
  pendingScroll: PendingScroll,
  pendingScrollVersion: S.Number,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the user scrolls the container. Carries the new scroll position
 *  read from the scroll event. */
export const ScrolledContainer = m('ScrolledContainer', {
  scrollTop: S.Number,
})
/** Sent when the container resizes. Carries the new container height read
 *  from the `ResizeObserver` entry. */
export const MeasuredContainer = m('MeasuredContainer', {
  containerHeight: S.Number,
})
/** Sent when a `scrollToIndex` Command completes. Carries the version it was
 *  issued with so the update can ignore stale completions. */
export const CompletedApplyScroll = m('CompletedApplyScroll', {
  version: S.Number,
})

/** Union of all messages the virtual list component can produce. */
export const Message: S.Union<
  [
    typeof ScrolledContainer,
    typeof MeasuredContainer,
    typeof CompletedApplyScroll,
  ]
> = S.Union([ScrolledContainer, MeasuredContainer, CompletedApplyScroll])

export type ScrolledContainer = typeof ScrolledContainer.Type
export type MeasuredContainer = typeof MeasuredContainer.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a virtual list model with `init`. */
export type InitConfig = Readonly<{
  id: string
  rowHeightPx: number
  initialScrollTop?: number
}>

/** Creates an initial virtual list model from a config. The container starts
 *  in `Unmeasured` state. The first `ResizeObserver` entry transitions it to
 *  `Measured`. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  rowHeightPx: config.rowHeightPx,
  scrollTop: config.initialScrollTop ?? 0,
  measurement: Unmeasured(),
  pendingScroll: Idle(),
  pendingScrollVersion: 0,
})

// UPDATE

export const ApplyScroll = Command.define('ApplyScroll', CompletedApplyScroll)

const applyScroll = (
  id: string,
  scrollTop: number,
  version: number,
): Command.Command<Message> =>
  ApplyScroll(
    Effect.sync(() => {
      const element = document.getElementById(id)
      if (element !== null) {
        element.scrollTop = scrollTop
      }
      return CompletedApplyScroll({ version })
    }),
  )

/** Processes a virtual list message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ScrolledContainer: ({ scrollTop }) => [
        evo(model, { scrollTop: () => scrollTop }),
        [],
      ],

      MeasuredContainer: ({ containerHeight }) => {
        const wasUnmeasured = model.measurement._tag === 'Unmeasured'
        const needsInitialApply = wasUnmeasured && model.scrollTop !== 0

        if (needsInitialApply) {
          const nextVersion = Number.increment(model.pendingScrollVersion)
          return [
            evo(model, {
              measurement: () => Measured({ containerHeight }),
              pendingScrollVersion: () => nextVersion,
              pendingScroll: () =>
                ScrollingToIndex({
                  index: Math.floor(model.scrollTop / model.rowHeightPx),
                  version: nextVersion,
                }),
            }),
            [applyScroll(model.id, model.scrollTop, nextVersion)],
          ]
        } else {
          return [
            evo(model, { measurement: () => Measured({ containerHeight }) }),
            [],
          ]
        }
      },

      CompletedApplyScroll: ({ version }) => {
        if (version !== model.pendingScrollVersion) {
          return [model, []]
        } else {
          return [evo(model, { pendingScroll: () => Idle() }), []]
        }
      },
    }),
  )

const buildScrollToIndex = (
  model: Model,
  index: number,
  targetScrollTop: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const nextVersion = Number.increment(model.pendingScrollVersion)
  return [
    evo(model, {
      pendingScrollVersion: () => nextVersion,
      pendingScroll: () => ScrollingToIndex({ index, version: nextVersion }),
    }),
    [applyScroll(model.id, targetScrollTop, nextVersion)],
  ]
}

/** Programmatically scrolls the container so the row at `index` is visible.
 *  Returns the next model and a Command that mutates `element.scrollTop`. The
 *  natural scroll event then flows back through `ScrolledContainer` and the
 *  component re-renders the new visible slice.
 *
 *  Uses version-based cancellation: each call increments
 *  `pendingScrollVersion` so a stale `CompletedApplyScroll` (e.g. from a
 *  previous in-flight scroll) is ignored when its version no longer matches.
 *
 *  Should be called after the container has rendered. If the container is not
 *  yet in the DOM the Command silently no-ops (the model still transitions
 *  through `ScrollingToIndex` → `Idle` via the version-matched completion).
 *
 *  Assumes uniform row heights: target scroll position is computed as
 *  `index * model.rowHeightPx`. For variable-height rows, use
 *  `scrollToIndexVariable`. */
export const scrollToIndex = (
  model: Model,
  index: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  buildScrollToIndex(model, index, index * model.rowHeightPx)

/** Variable-height counterpart of `scrollToIndex`. Walks the heights of items
 *  before `index` to compute the target `scrollTop`. Use this when rendering
 *  the list with `itemToRowHeightPx`; use `scrollToIndex` for uniform heights.
 *
 *  Out-of-range indices clamp to the corresponding edge: negative or zero
 *  scrolls to the top, indices past the end scroll past the last row.
 *
 *  Note: when restoring `initialScrollTop` on the first measurement of a
 *  variable-height list, the runtime falls back to uniform-height math (using
 *  `model.rowHeightPx`) because items aren't reachable from the `update`
 *  function. Consumers who need an accurate initial scroll on a
 *  variable-height list should call `scrollToIndexVariable` after the first
 *  `MeasuredContainer` arrives. */
export const scrollToIndexVariable = <Item>(
  model: Model,
  items: ReadonlyArray<Item>,
  itemToRowHeightPx: (item: Item, index: number) => number,
  index: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const cumulativeOffsets = prefixSum(items, itemToRowHeightPx)
  const targetScrollTop = pipe(
    cumulativeOffsets,
    Array.get(Math.max(0, index)),
    Option.getOrElse(() => lastOrZero(cumulativeOffsets)),
  )
  return buildScrollToIndex(model, index, targetScrollTop)
}

// HELPERS

/** Slice of the data array that the view should render, plus the spacer
 *  heights that keep the scrollbar physically correct. The first row in the
 *  slice corresponds to data index `startIndex`. */
export type VisibleWindow = Readonly<{
  startIndex: number
  endIndex: number
  topSpacerHeight: number
  bottomSpacerHeight: number
}>

const clampIndex = (index: number, itemCount: number): number =>
  Math.max(0, Math.min(index, itemCount))

const prefixSum = <Item>(
  items: ReadonlyArray<Item>,
  itemToRowHeightPx: (item: Item, index: number) => number,
): ReadonlyArray<number> => {
  const heights = Array.map(items, itemToRowHeightPx)
  return Array.scan(heights, 0, (cumulative, height) => cumulative + height)
}

const lastOrZero = (values: ReadonlyArray<number>): number =>
  pipe(
    values,
    Array.last,
    Option.getOrElse(() => 0),
  )

/** Computes the visible slice of a data array given the current scroll
 *  position, container height, row height, and an overscan buffer.
 *
 *  Assumes uniform row heights via `model.rowHeightPx`. For variable-height
 *  rows, use `visibleWindowVariable`.
 *
 *  Returns `Option.none()` when the container has not yet been measured;
 *  callers should render a placeholder (or `Html.empty`) and wait for the
 *  first `MeasuredContainer` message. */
export const visibleWindow = (
  model: Model,
  itemCount: number,
  overscan: number,
): Option.Option<VisibleWindow> =>
  M.value(model.measurement).pipe(
    M.withReturnType<Option.Option<VisibleWindow>>(),
    M.tagsExhaustive({
      Unmeasured: () => Option.none(),
      Measured: ({ containerHeight }) => {
        const firstVisibleIndex = Math.floor(
          model.scrollTop / model.rowHeightPx,
        )
        const lastVisibleIndex = Math.ceil(
          (model.scrollTop + containerHeight) / model.rowHeightPx,
        )

        const startIndex = clampIndex(firstVisibleIndex - overscan, itemCount)
        const endIndex = clampIndex(lastVisibleIndex + overscan, itemCount)

        const topSpacerHeight = startIndex * model.rowHeightPx
        const bottomSpacerHeight = (itemCount - endIndex) * model.rowHeightPx

        return Option.some({
          startIndex,
          endIndex,
          topSpacerHeight,
          bottomSpacerHeight,
        })
      },
    }),
  )

/** Variable-height counterpart of `visibleWindow`. Walks the heights of every
 *  item to build a prefix-sum array, then locates the visible slice with two
 *  linear searches.
 *
 *  Cost is O(N) per call, walking the whole `items` array once to build the
 *  prefix sums. For lists in the 10k-item range, this comfortably fits inside
 *  a 60Hz scroll budget. Larger lists or hotter scroll paths can layer a
 *  prefix-sum cache invalidated when items change; that lives behind the same
 *  return shape so consumers don't have to know.
 *
 *  Returns `Option.none()` when the container has not yet been measured. */
export const visibleWindowVariable = <Item>(
  model: Model,
  items: ReadonlyArray<Item>,
  itemToRowHeightPx: (item: Item, index: number) => number,
  overscan: number,
): Option.Option<VisibleWindow> =>
  M.value(model.measurement).pipe(
    M.withReturnType<Option.Option<VisibleWindow>>(),
    M.tagsExhaustive({
      Unmeasured: () => Option.none(),
      Measured: ({ containerHeight }) => {
        const itemCount = items.length
        const cumulativeOffsets = prefixSum(items, itemToRowHeightPx)
        const totalHeight = lastOrZero(cumulativeOffsets)

        const firstVisibleIndex = pipe(
          cumulativeOffsets,
          Array.findFirstIndex(Number.isGreaterThan(model.scrollTop)),
          Option.match({
            onNone: () => itemCount,
            onSome: index => Math.max(0, index - 1),
          }),
        )

        const lastVisibleIndex = pipe(
          cumulativeOffsets,
          Array.findFirstIndex(
            Number.isGreaterThanOrEqualTo(model.scrollTop + containerHeight),
          ),
          Option.getOrElse(() => itemCount),
        )

        const startIndex = clampIndex(firstVisibleIndex - overscan, itemCount)
        const endIndex = clampIndex(lastVisibleIndex + overscan, itemCount)

        const topSpacerHeight = pipe(
          cumulativeOffsets,
          Array.get(startIndex),
          Option.getOrElse(() => 0),
        )
        const offsetAtEnd = pipe(
          cumulativeOffsets,
          Array.get(endIndex),
          Option.getOrElse(() => totalHeight),
        )
        const bottomSpacerHeight = totalHeight - offsetAtEnd

        return Option.some({
          startIndex,
          endIndex,
          topSpacerHeight,
          bottomSpacerHeight,
        })
      },
    }),
  )

// SUBSCRIPTION

const containerElement = (id: string): Option.Option<HTMLElement> =>
  Option.fromNullishOr(document.getElementById(id))

/** Schema describing the subscription dependencies for container scroll and
 *  resize tracking. */
export const SubscriptionDeps = S.Struct({
  containerEvents: S.Struct({
    id: S.String,
  }),
})

/** Subscriptions that track the container's scroll position and size.
 *
 *  - **scroll**: listens for `scroll` events on the container element and
 *    emits `ScrolledContainer` with the new `scrollTop`.
 *  - **resize**: observes the container with `ResizeObserver` and emits
 *    `MeasuredContainer` with the new height.
 *
 *  A `MutationObserver` watches the document for the container element
 *  appearing and disappearing, so the listeners attach the moment the
 *  element is inserted into the DOM and clean up when it is removed. This
 *  makes the subscription robust across SPA route changes: navigating to a
 *  page that mounts the list, away, and back all reattach correctly without
 *  the consumer having to teach the framework about navigation. */
export const subscriptions = makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  containerEvents: {
    modelToDependencies: model => ({ id: model.id }),
    dependenciesToStream: ({ id }) =>
      Stream.callback<Message>(queue =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const state: {
              scrollListener: (() => void) | null
              resizeObserver: ResizeObserver | null
              observedElement: HTMLElement | null
              pendingFrame: number | null
            } = {
              scrollListener: null,
              resizeObserver: null,
              observedElement: null,
              pendingFrame: null,
            }

            const detach = () => {
              if (state.resizeObserver !== null) {
                state.resizeObserver.disconnect()
                state.resizeObserver = null
              }
              if (
                state.observedElement !== null &&
                state.scrollListener !== null
              ) {
                state.observedElement.removeEventListener(
                  'scroll',
                  state.scrollListener,
                )
              }
              state.observedElement = null
              state.scrollListener = null
            }

            const attach = (element: HTMLElement) => {
              const listener = () =>
                Queue.offerUnsafe(
                  queue,
                  ScrolledContainer({ scrollTop: element.scrollTop }),
                )
              element.addEventListener('scroll', listener, { passive: true })
              state.scrollListener = listener
              state.observedElement = element

              state.resizeObserver = new ResizeObserver(entries => {
                const lastEntry = Array.last(entries)
                if (Option.isSome(lastEntry)) {
                  Queue.offerUnsafe(
                    queue,
                    MeasuredContainer({
                      containerHeight: lastEntry.value.contentRect.height,
                    }),
                  )
                }
              })
              state.resizeObserver.observe(element)
            }

            const reconcile = () => {
              const maybeElement = containerElement(id)
              if (Option.isNone(maybeElement)) {
                if (state.observedElement !== null) {
                  detach()
                }
                return
              }
              if (state.observedElement === maybeElement.value) {
                return
              }
              detach()
              attach(maybeElement.value)
            }

            reconcile()

            // NOTE: observes the entire document subtree because the container
            // can be inserted/removed by any parent the consumer chooses (route
            // changes, conditional renders, modal mounts), and the framework
            // has no way to know that hierarchy in advance. Reconcile is gated
            // by rAF and short-circuits when the cached observedElement is
            // still in the DOM, so per-mutation cost stays low even with
            // subtree: true.
            const mutationObserver = new MutationObserver(() => {
              if (state.pendingFrame !== null) {
                return
              }
              state.pendingFrame = requestAnimationFrame(() => {
                state.pendingFrame = null
                reconcile()
              })
            })
            mutationObserver.observe(document.body, {
              childList: true,
              subtree: true,
            })

            return { state, detach, mutationObserver }
          }),
          ({ state, detach, mutationObserver }) =>
            Effect.sync(() => {
              mutationObserver.disconnect()
              if (state.pendingFrame !== null) {
                cancelAnimationFrame(state.pendingFrame)
              }
              detach()
            }),
        ).pipe(Effect.flatMap(() => Effect.never)),
      ),
  },
})

// VIEW

const DEFAULT_OVERSCAN = 5

/** Configuration for rendering a virtual list with `view`.
 *
 *  VirtualList does not take a `toParentMessage` callback. All input
 *  (scroll events and resize observations) flows through the
 *  `containerEvents` Subscription, not through view-bound handlers.
 *  Consumers wrap the subscription's stream into their parent Message in
 *  their own `subscriptions` definition. */
export type ViewConfig<ParentMessage, Item> = Readonly<{
  model: Model
  items: ReadonlyArray<Item>
  itemToKey: (item: Item, index: number) => string
  itemToView: (item: Item, index: number) => Html
  /** Optional per-item row height in pixels. When provided, the list renders
   *  with variable-height rows: each row's wrapper takes the height returned
   *  by this callback, and scroll math walks the items to compute the visible
   *  slice and spacers. When absent, all rows use `model.rowHeightPx`. Use
   *  this for tables with wrapping cells, taller detail rows, or any list
   *  where rows differ. Prefer the uniform `rowHeightPx` path when row
   *  heights are stable: it avoids the per-render walk over `items`. */
  itemToRowHeightPx?: (item: Item, index: number) => number
  /** Number of rows rendered above and below the visible viewport. Higher
   *  values smooth out fast scroll at the cost of mounting more DOM. Default
   *  is 5; react-window uses 1 and react-virtualized uses 3. Pick a value
   *  that suits the row's mount cost. */
  overscan?: number
  rowElement?: TagName
  className?: string
  attributes?: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Renders a virtualized list. Only items inside the viewport (plus an
 *  overscan buffer) are mounted; spacer elements above and below the slice
 *  keep the scrollbar's apparent total height correct.
 *
 *  Items must be keyed via `itemToKey` so the VDOM matches `row 150` to
 *  `row 150` after the slice shifts during scroll, rather than matching by
 *  position and producing stale DOM.
 *
 *  Each row wrapper is rendered with `display: grid` so the consumer's
 *  `itemToView` content fills the configured `rowHeightPx` and the full row
 *  width. Use flex/grid with `align-items: center` inside `itemToView` to
 *  vertically center content within the row.
 *
 *  Each row carries `aria-setsize` (total item count) and `aria-posinset`
 *  (1-based logical row index) so screen readers announce the full list
 *  size and each row's position within it, rather than the much smaller
 *  count of currently mounted rows. */
export const view = <ParentMessage, Item>(
  config: ViewConfig<ParentMessage, Item>,
): Html => {
  const {
    AriaPosinset,
    AriaSetsize,
    Class,
    DataAttribute,
    Id,
    Role,
    Style,
    keyed,
  } = html<ParentMessage>()

  const {
    model,
    items,
    itemToKey,
    itemToView,
    itemToRowHeightPx,
    overscan = DEFAULT_OVERSCAN,
    rowElement = 'li',
    className,
    attributes = [],
  } = config

  const containerAttributes: ReadonlyArray<Attribute<ParentMessage>> = [
    Id(model.id),
    Role('list'),
    DataAttribute('virtual-list-id', model.id),
    Style({
      overflow: 'auto',
      'list-style': 'none',
      margin: '0',
      padding: '0',
    }),
    ...(className !== undefined ? [Class(className)] : []),
    ...attributes,
  ]

  const renderContainer = (children: ReadonlyArray<Html>): Html =>
    keyed('ul')(model.id, containerAttributes, children)

  const maybeWindow =
    itemToRowHeightPx !== undefined
      ? visibleWindowVariable(model, items, itemToRowHeightPx, overscan)
      : visibleWindow(model, items.length, overscan)

  const rowHeightFor = (item: Item, dataIndex: number): number =>
    itemToRowHeightPx !== undefined
      ? itemToRowHeightPx(item, dataIndex)
      : model.rowHeightPx

  return Option.match(maybeWindow, {
    onNone: () => renderContainer([]),

    onSome: ({ startIndex, endIndex, topSpacerHeight, bottomSpacerHeight }) => {
      const visibleItems = items.slice(startIndex, endIndex)

      const topSpacer = keyed('li')(
        `${model.id}-top-spacer`,
        [Role('presentation'), Style({ height: `${topSpacerHeight}px` })],
        [],
      )

      const bottomSpacer = keyed('li')(
        `${model.id}-bottom-spacer`,
        [Role('presentation'), Style({ height: `${bottomSpacerHeight}px` })],
        [],
      )

      const renderedRows = Array.map(visibleItems, (item, sliceIndex) => {
        const dataIndex = startIndex + sliceIndex
        return keyed(rowElement)(
          itemToKey(item, dataIndex),
          [
            Role('listitem'),
            DataAttribute('virtual-list-item-index', String(dataIndex)),
            AriaSetsize(items.length),
            AriaPosinset(dataIndex + 1),
            Style({
              height: `${rowHeightFor(item, dataIndex)}px`,
              display: 'grid',
            }),
          ],
          [itemToView(item, dataIndex)],
        )
      })

      return renderContainer([topSpacer, ...renderedRows, bottomSpacer])
    },
  })
}

/** Creates a memoized virtual list view. Static config is captured in a
 *  closure; only `model` and `items` are compared per render via
 *  `createLazy`. */
export const lazy = <ParentMessage, Item>(
  staticConfig: Omit<ViewConfig<ParentMessage, Item>, 'model' | 'items'>,
): ((model: Model, items: ReadonlyArray<Item>) => Html) => {
  const lazyView = createLazy()

  return (model, items) =>
    lazyView(
      (currentModel: Model, currentItems: ReadonlyArray<Item>) =>
        view({
          ...staticConfig,
          model: currentModel,
          items: currentItems,
        }),
      [model, items],
    )
}
