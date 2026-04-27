import {
  Array,
  Effect,
  Match as M,
  Number,
  Option,
  Schema as S,
  Stream,
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
const Measurement = S.Union(Unmeasured, Measured)

const Idle = ts('Idle')
const ScrollingToIndex = ts('ScrollingToIndex', {
  index: S.Number,
  version: S.Number,
})

/** State of a programmatic scroll initiated by `scrollToIndex`. */
const PendingScroll = S.Union(Idle, ScrollingToIndex)

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
> = S.Union(ScrolledContainer, MeasuredContainer, CompletedApplyScroll)

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
 *  through `ScrollingToIndex` → `Idle` via the version-matched completion). */
export const scrollToIndex = (
  model: Model,
  index: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const nextVersion = Number.increment(model.pendingScrollVersion)
  const targetScrollTop = index * model.rowHeightPx

  return [
    evo(model, {
      pendingScrollVersion: () => nextVersion,
      pendingScroll: () => ScrollingToIndex({ index, version: nextVersion }),
    }),
    [applyScroll(model.id, targetScrollTop, nextVersion)],
  ]
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

/** Computes the visible slice of a data array given the current scroll
 *  position, container height, row height, and an overscan buffer.
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

// SUBSCRIPTION

const containerElement = (id: string): Option.Option<HTMLElement> =>
  Option.fromNullable(document.getElementById(id))

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
      Stream.async<Message>(emit => {
        let scrollListener: (() => void) | null = null
        let resizeObserver: ResizeObserver | null = null
        let observedElement: HTMLElement | null = null
        let pendingFrame: number | null = null

        const detach = () => {
          if (resizeObserver !== null) {
            resizeObserver.disconnect()
            resizeObserver = null
          }
          if (observedElement !== null && scrollListener !== null) {
            observedElement.removeEventListener('scroll', scrollListener)
          }
          observedElement = null
          scrollListener = null
        }

        const attach = (element: HTMLElement) => {
          const listener = () =>
            emit.single(ScrolledContainer({ scrollTop: element.scrollTop }))
          element.addEventListener('scroll', listener, { passive: true })
          scrollListener = listener
          observedElement = element

          resizeObserver = new ResizeObserver(entries => {
            const lastEntry = Array.last(entries)
            if (Option.isSome(lastEntry)) {
              emit.single(
                MeasuredContainer({
                  containerHeight: lastEntry.value.contentRect.height,
                }),
              )
            }
          })
          resizeObserver.observe(element)
        }

        const reconcile = () => {
          const maybeElement = containerElement(id)
          if (Option.isNone(maybeElement)) {
            if (observedElement !== null) {
              detach()
            }
            return
          }
          if (observedElement === maybeElement.value) {
            return
          }
          detach()
          attach(maybeElement.value)
        }

        reconcile()

        // NOTE: observes the entire document subtree because the container
        // can be inserted/removed by any parent the consumer chooses (route
        // changes, conditional renders, modal mounts), and the framework has
        // no way to know that hierarchy in advance. Reconcile is gated by rAF
        // and short-circuits when the cached observedElement is still in the
        // DOM, so per-mutation cost stays low even with subtree: true.
        const mutationObserver = new MutationObserver(() => {
          if (pendingFrame !== null) {
            return
          }
          pendingFrame = requestAnimationFrame(() => {
            pendingFrame = null
            reconcile()
          })
        })
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
        })

        return Effect.sync(() => {
          mutationObserver.disconnect()
          if (pendingFrame !== null) {
            cancelAnimationFrame(pendingFrame)
          }
          detach()
        })
      }),
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
export type ViewConfig<Message, Item> = Readonly<{
  model: Model
  items: ReadonlyArray<Item>
  itemToKey: (item: Item, index: number) => string
  itemToView: (item: Item, index: number) => Html
  /** Number of rows rendered above and below the visible viewport. Higher
   *  values smooth out fast scroll at the cost of mounting more DOM. Default
   *  is 5; react-window uses 1 and react-virtualized uses 3. Pick a value
   *  that suits the row's mount cost. */
  overscan?: number
  rowElement?: TagName
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
}>

/** Renders a virtualized list. Only items inside the viewport (plus an
 *  overscan buffer) are mounted; spacer divs above and below the slice keep
 *  the scrollbar's apparent total height correct.
 *
 *  Items must be keyed via `itemToKey` so the VDOM matches `row 150` to
 *  `row 150` after the slice shifts during scroll, rather than matching by
 *  position and producing stale DOM.
 *
 *  Each row wrapper is rendered with `display: grid` so the consumer's
 *  `itemToView` content fills the configured `rowHeightPx` and the full row
 *  width. Use flex/grid with `align-items: center` inside `itemToView` to
 *  vertically center content within the row. */
export const view = <Message, Item>(
  config: ViewConfig<Message, Item>,
): Html => {
  const { Class, DataAttribute, Id, Role, Style, keyed } = html<Message>()

  const {
    model,
    items,
    itemToKey,
    itemToView,
    overscan = DEFAULT_OVERSCAN,
    rowElement = 'li',
    className,
    attributes = [],
  } = config

  const containerAttributes: ReadonlyArray<Attribute<Message>> = [
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

  return Option.match(visibleWindow(model, items.length, overscan), {
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
            DataAttribute('virtual-list-item-index', String(dataIndex)),
            Style({ height: `${model.rowHeightPx}px`, display: 'grid' }),
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
export const lazy = <Message, Item>(
  staticConfig: Omit<ViewConfig<Message, Item>, 'model' | 'items'>,
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
