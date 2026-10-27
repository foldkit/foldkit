import {
  Array,
  Effect,
  HashSet,
  Layer,
  Match,
  Number,
  Option,
  Queue,
  Record,
  Schema,
  Stream,
  Tuple,
  pipe,
} from 'effect'
import { Update } from 'foldkit'
import * as Block from 'foldkit/block'
import {
  type ChildAttribute,
  type Html,
  type TagName,
  childAttributes,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Render from 'foldkit/render'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import {
  ScrollContainer,
  contentHeight,
  externalScrollTop,
  externalViewport,
  intersectsViewport,
  observeExternalPosition,
  registerExternalViewport,
  resolveExternalViewport,
  scrollExternalViewport,
  viewportHeight,
  viewportTop,
} from './scrollContainer.js'

export { ScrollContainer } from './scrollContainer.js'

// MODEL

/** Measurement state of the virtual list's scrollable container.
 *
 * Before the Mount reports the container's dimensions we cannot compute a
 * visible slice. The view handles `Unmeasured` by rendering an empty
 * container until the first measurement arrives.
 */
const Measurement = defineTaggedUnion({
  Unmeasured: {},
  Measured: {
    containerWidth: Schema.Number,
    containerHeight: Schema.Number,
  },
})

/** Alignment of a row within the viewport after a programmatic scroll. */
export const ScrollAlignment = Schema.Literals([
  'Start',
  'Center',
  'End',
  'Nearest',
])

export type ScrollAlignment = typeof ScrollAlignment.Type

/** Logical destination for initial and programmatic scrolling. */
export const ScrollTarget = defineTaggedUnion({
  Index: { index: Schema.Number },
  Key: { key: Schema.String },
  Offset: { offset: Schema.Number },
  End: {},
})

export type ScrollTarget = typeof ScrollTarget.Type

const ViewportAnchor = defineTaggedUnion({
  Offset: { scrollTop: Schema.Number },
  Row: {
    key: Schema.String,
    index: Schema.Number,
    viewportOffset: Schema.Number,
  },
  End: {},
})

/** Stable row observation captured from the live scroll container. */
export const ObservedAnchor = defineTaggedUnion({
  None: {},
  Row: {
    key: Schema.String,
    index: Schema.Number,
    viewportOffset: Schema.Number,
  },
})

export type ObservedAnchor = typeof ObservedAnchor.Type

/** Public snapshot of a user or browser driven container scroll. */
export const ContainerScrollObservation = Schema.Struct({
  scrollTop: Schema.Number,
  scrollHeight: Schema.Number,
  containerHeight: Schema.Number,
  anchor: ObservedAnchor,
})

export type ContainerScrollObservation = typeof ContainerScrollObservation.Type

/** Outcome of applying a logical scroll request after the view commits. */
export const ApplyScrollOutcome = defineTaggedUnion({
  Applied: {
    scrollTop: Schema.Number,
    scrollHeight: Schema.Number,
    containerHeight: Schema.Number,
    anchor: ObservedAnchor,
  },
  Skipped: {},
})

const ScrollRequest = defineTaggedUnion({
  Target: {
    target: ScrollTarget,
    alignment: ScrollAlignment,
  },
  Anchor: { anchor: ViewportAnchor, baselineScrollTop: Schema.Number },
})

const ScrollObservationOrigin = defineTaggedUnion({
  Native: {},
  Applied: { version: Schema.Number },
  Layout: {},
})

const appliedScrolls = new WeakMap<
  HTMLElement,
  Readonly<{ version: number; scrollTop: number }>
>()

const PendingScroll = defineTaggedUnion({
  Idle: {},
  Pending: { request: ScrollRequest, version: Schema.Number },
})

const InitialScroll = defineTaggedUnion({
  Applied: {},
  Pending: { target: ScrollTarget, alignment: ScrollAlignment },
})

const EndBehavior = defineTaggedUnion({
  PreserveAnchor: {},
  Follow: { thresholdPx: Schema.Number },
})

/** Whether the loaded history has another page before its first row. */
export const HistoryPage = defineTaggedUnion({
  More: {},
  Complete: {},
})

export type HistoryPage = typeof HistoryPage.Type

const HistoryState = defineTaggedUnion({
  Disabled: {},
  Enabled: {
    reservePx: Schema.Number,
    prefetchViewports: Schema.Number,
    page: HistoryPage,
  },
})

/** Schema for the virtual list's state. Tracks scroll position, container
 *  measurement, and any in-flight programmatic scroll. */
export const Model = Schema.Struct({
  id: Schema.String,
  rowHeightPx: Schema.Number,
  scrollContainer: ScrollContainer,
  scrollTop: Schema.Number,
  measurement: Measurement,
  viewportAnchor: ViewportAnchor,
  measuredRowHeights: Schema.Record(Schema.String, Schema.Number),
  startPaddingPx: Schema.Number,
  history: HistoryState,
  historyPageVersion: Schema.Number,
  layoutVersion: Schema.Number,
  initialScroll: InitialScroll,
  endBehavior: EndBehavior,
  maybeMeasurementTarget: Schema.Option(ScrollRequest.Target),
  pendingScroll: PendingScroll,
  pendingScrollVersion: Schema.Number,
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the virtual list component can produce. */
export const Message = defineMessageUnion({
  RequestedScrollTo: {
    target: ScrollTarget,
    maybeAlignment: Schema.Option(ScrollAlignment),
  },
  RequestedScrollToIndex: {
    index: Schema.Number,
    maybeAlignment: Schema.Option(ScrollAlignment),
  },
  RequestedScrollToKey: {
    key: Schema.String,
    maybeAlignment: Schema.Option(ScrollAlignment),
  },
  RequestedScrollToOffset: { offset: Schema.Number },
  RequestedScrollToEnd: {},
  InformedOfItemsChange: { itemKeys: Schema.Array(Schema.String) },
  InformedOfHistoryPrepend: {
    itemKeys: Schema.Array(Schema.String),
    prependedItemCount: Schema.Number,
    page: HistoryPage,
  },
  ObservedContainerScroll: {
    ...ContainerScrollObservation.fields,
    layoutVersion: Schema.optional(Schema.Number),
    origin: Schema.optional(ScrollObservationOrigin),
  },
  ApproachedLoadedStart: {
    distanceToLoadedStartPx: Schema.Number,
    containerHeight: Schema.Number,
  },
  EndedContainerScroll: {},
  ResizedContainer: {
    containerWidth: Schema.Number,
    containerHeight: Schema.Number,
    viewport: Schema.optional(ContainerScrollObservation),
  },
  MeasuredRows: {
    measurements: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        height: Schema.Number,
        layoutVersion: Schema.Number,
        index: Schema.optional(Schema.Number),
        layoutHeightPx: Schema.optional(Schema.Number),
      }),
    ),
  },
  CompletedApplyScroll: {
    version: Schema.Number,
    outcome: ApplyScrollOutcome,
  },
})

export type Message = typeof Message.Type

// OUT MESSAGE

/** Public observations emitted by VirtualList for parent-owned scroll policy. */
export const OutMessage = defineMessageUnion({
  ObservedContainerScroll: ContainerScrollObservation.fields,
  ApproachedLoadedStart: {
    distanceToLoadedStartPx: Schema.Number,
    containerHeight: Schema.Number,
  },
  EndedContainerScroll: {},
})

const VirtualListDefinition = Block.makeDefinition('VirtualList', {
  Model,
  Message,
  OutMessage,
})

// INIT

/** Configuration for creating a virtual list model with `init`. */
export type InitConfig = Readonly<{
  id: string
  rowHeightPx: number
  initialScrollTop?: number
  initialScroll?: Readonly<{
    target: ScrollTarget
    alignment?: ScrollAlignment
  }>
  followEnd?: Readonly<{
    thresholdPx?: number
  }>
}> &
  (
    | Readonly<{
        history?: undefined
        scrollContainer?: ScrollContainer
      }>
    | Readonly<{
        history: Readonly<{ reservePx: number; prefetchViewports: number }>
        scrollContainer?: typeof ScrollContainer.Self.Type
      }>
  )

const initialScrollFromConfig = (
  config: InitConfig,
): typeof InitialScroll.Type => {
  if (config.initialScroll !== undefined) {
    return InitialScroll.Pending({
      target: config.initialScroll.target,
      alignment: config.initialScroll.alignment ?? 'Start',
    })
  }

  if (config.initialScrollTop !== undefined) {
    return InitialScroll.Pending({
      target: ScrollTarget.Offset({ offset: config.initialScrollTop }),
      alignment: 'Start',
    })
  }

  return InitialScroll.Applied()
}

const makeInitialModel = (config: InitConfig): Model => {
  const initialScroll = initialScrollFromConfig(config)
  const scrollContainer = config.scrollContainer ?? ScrollContainer.Self()
  if (config.history !== undefined && scrollContainer._tag !== 'Self') {
    throw new Error('VirtualList history requires ScrollContainer.Self().')
  }

  return {
    id: config.id,
    rowHeightPx: config.rowHeightPx,
    scrollContainer,
    scrollTop: config.initialScrollTop ?? 0,
    measurement: Measurement.Unmeasured(),
    viewportAnchor: ViewportAnchor.Offset({
      scrollTop: config.initialScrollTop ?? 0,
    }),
    measuredRowHeights: Record.empty(),
    startPaddingPx: Math.max(0, config.history?.reservePx ?? 0),
    history:
      config.history === undefined
        ? HistoryState.Disabled()
        : HistoryState.Enabled({
            reservePx: Math.max(0, config.history.reservePx),
            prefetchViewports: Math.max(0, config.history.prefetchViewports),
            page: HistoryPage.More(),
          }),
    historyPageVersion: 0,
    layoutVersion: 0,
    initialScroll,
    endBehavior:
      config.followEnd === undefined
        ? EndBehavior.PreserveAnchor()
        : EndBehavior.Follow({
            thresholdPx: config.followEnd.thresholdPx ?? 1,
          }),
    maybeMeasurementTarget: Option.none(),
    pendingScroll: PendingScroll.Idle(),
    pendingScrollVersion: 0,
  }
}

// UPDATE

const scrollTopForNearestAlignment = (
  currentScrollTop: number,
  containerHeight: number,
  startOffset: number,
  endOffset: number,
): number => {
  const viewportEnd = currentScrollTop + containerHeight
  const rowSpansViewport =
    startOffset < currentScrollTop && endOffset > viewportEnd

  if (rowSpansViewport) {
    return currentScrollTop
  }

  if (startOffset < currentScrollTop) {
    return startOffset
  }

  if (endOffset > viewportEnd) {
    return endOffset - containerHeight
  }

  return currentScrollTop
}

const scrollTopForRow = (
  currentScrollTop: number,
  containerHeight: number,
  startOffset: number,
  endOffset: number,
  alignment: ScrollAlignment,
  isExternal = false,
): number => {
  const targetScrollTop = Match.value(alignment).pipe(
    Match.withReturnType<number>(),
    Match.when('Start', () => startOffset),
    Match.when(
      'Center',
      () => startOffset + (endOffset - startOffset - containerHeight) / 2,
    ),
    Match.when('End', () => endOffset - containerHeight),
    Match.when('Nearest', () =>
      scrollTopForNearestAlignment(
        currentScrollTop,
        containerHeight,
        startOffset,
        endOffset,
      ),
    ),
    Match.exhaustive,
  )

  return isExternal ? targetScrollTop : Math.max(0, targetScrollTop)
}

const listSurface = (element: HTMLElement): HTMLElement => {
  const surface = element.querySelector(':scope > [data-virtual-list-surface]')
  return surface instanceof HTMLElement ? surface : element
}

const readScrollTop = (element: HTMLElement): number =>
  externalViewport(element) === undefined
    ? element.scrollTop
    : externalScrollTop(element)

const scrollObservationOrigin = (
  element: HTMLElement,
  event: Event | undefined,
): typeof ScrollObservationOrigin.Type => {
  const applied = appliedScrolls.get(element)
  if (event !== undefined) {
    appliedScrolls.delete(element)
  }

  if (
    applied !== undefined &&
    Math.abs(readScrollTop(element) - applied.scrollTop) <= 1
  ) {
    return ScrollObservationOrigin.Applied({ version: applied.version })
  } else if (event === undefined) {
    return ScrollObservationOrigin.Layout()
  } else {
    return ScrollObservationOrigin.Native()
  }
}

const renderedRows = (element: HTMLElement): ReadonlyArray<HTMLElement> =>
  pipe(
    listSurface(element).children,
    Array.fromIterable,
    Array.filter(
      (row): row is HTMLElement =>
        row instanceof HTMLElement &&
        row.hasAttribute('data-virtual-list-item-key'),
    ),
  )

const rowIndex = (element: HTMLElement): Option.Option<number> =>
  pipe(
    element.getAttribute('data-virtual-list-item-index'),
    Option.fromNullishOr,
    Option.flatMap(Number.parse),
  )

const observedAnchor = (element: HTMLElement): typeof ObservedAnchor.Type => {
  const top = viewportTop(element)
  const viewportBottom = top + viewportHeight(element)
  const isAbsolute = listSurface(element).hasAttribute(
    'data-virtual-list-absolute',
  )
  const maybeRow = Array.findFirst(renderedRows(element), row => {
    const rowRect = row.getBoundingClientRect()
    const height = isAbsolute
      ? pipe(
          row.getAttribute('data-virtual-list-layout-height'),
          Option.fromNullishOr,
          Option.flatMap(Number.parse),
          Option.getOrElse(() => rowRect.height),
        )
      : rowRect.height
    return rowRect.top + height > top && rowRect.top < viewportBottom
  })

  if (Option.isNone(maybeRow)) {
    return ObservedAnchor.None()
  }

  const key = maybeRow.value.getAttribute('data-virtual-list-item-key')
  const maybeIndex = rowIndex(maybeRow.value)
  if (key === null || Option.isNone(maybeIndex)) {
    return ObservedAnchor.None()
  }

  return ObservedAnchor.Row({
    key,
    index: maybeIndex.value,
    viewportOffset: maybeRow.value.getBoundingClientRect().top - top,
  })
}

const maxScrollTop = (element: HTMLElement): number =>
  Math.max(0, contentHeight(element) - viewportHeight(element))

const endScrollTop = (element: HTMLElement): number =>
  externalViewport(element) === undefined
    ? maxScrollTop(element)
    : contentHeight(element) - viewportHeight(element)

const isBottomOrigin = (element: HTMLElement): boolean =>
  element.hasAttribute('data-virtual-list-bottom-origin')

const logicalScrollTop = (element: HTMLElement): number =>
  isBottomOrigin(element)
    ? maxScrollTop(element) + element.scrollTop
    : readScrollTop(element)

const rawScrollTop = (element: HTMLElement, scrollTop: number): number =>
  isBottomOrigin(element) ? scrollTop - maxScrollTop(element) : scrollTop

const clampScrollTop = (element: HTMLElement, scrollTop: number): number =>
  isBottomOrigin(element)
    ? Math.max(-maxScrollTop(element), Math.min(scrollTop, 0))
    : Math.max(0, Math.min(scrollTop, maxScrollTop(element)))

const rowForIndex = (
  element: HTMLElement,
  index: number,
): Option.Option<HTMLElement> => {
  const rows = renderedRows(element)
  const maybeExact = Array.findFirst(rows, row =>
    Option.exists(rowIndex(row), rowIndex => rowIndex === index),
  )

  if (Option.isSome(maybeExact)) {
    return maybeExact
  }

  const maybeFirst = Array.head(rows)
  const maybeLast = Array.last(rows)
  if (Option.isSome(maybeFirst)) {
    const maybeFirstIndex = rowIndex(maybeFirst.value)
    if (Option.isSome(maybeFirstIndex) && index < maybeFirstIndex.value) {
      return maybeFirst
    }
  }
  if (Option.isSome(maybeLast)) {
    const maybeLastIndex = rowIndex(maybeLast.value)
    if (Option.isSome(maybeLastIndex) && index > maybeLastIndex.value) {
      return maybeLast
    }
  }

  return Option.none()
}

const rowForKey = (
  element: HTMLElement,
  key: string,
): Option.Option<HTMLElement> =>
  Array.findFirst(
    renderedRows(element),
    row => row.getAttribute('data-virtual-list-item-key') === key,
  )

const rowOffsets = (container: HTMLElement, row: HTMLElement): RowOffsets => {
  const top = viewportTop(container)
  const rowRect = row.getBoundingClientRect()
  const startOffset = logicalScrollTop(container) + rowRect.top - top
  return { startOffset, endOffset: startOffset + rowRect.height }
}

const rowForTarget = (
  element: HTMLElement,
  target: typeof ScrollTarget.Index.Type | typeof ScrollTarget.Key.Type,
): Option.Option<HTMLElement> =>
  ScrollTarget.matchOrElse(
    target,
    {
      Index: ({ index }) => rowForIndex(element, index),
      Key: ({ key }) => rowForKey(element, key),
    },
    () => Option.none(),
  )

const scrollTopForRowTarget = (
  element: HTMLElement,
  target: typeof ScrollTarget.Index.Type | typeof ScrollTarget.Key.Type,
  alignment: ScrollAlignment,
): Option.Option<number> =>
  Option.map(rowForTarget(element, target), row => {
    const offsets = rowOffsets(element, row)
    return rawScrollTop(
      element,
      scrollTopForRow(
        logicalScrollTop(element),
        viewportHeight(element),
        offsets.startOffset,
        offsets.endOffset,
        alignment,
        externalViewport(element) !== undefined,
      ),
    )
  })

const scrollTopForTarget = (
  element: HTMLElement,
  target: ScrollTarget,
  alignment: ScrollAlignment,
): Option.Option<number> =>
  ScrollTarget.match<Option.Option<number>>(target, {
    Index: indexTarget =>
      scrollTopForRowTarget(element, indexTarget, alignment),
    Key: keyTarget => scrollTopForRowTarget(element, keyTarget, alignment),
    Offset: ({ offset }) =>
      Option.some(
        rawScrollTop(
          element,
          Math.max(0, Math.min(offset, maxScrollTop(element))),
        ),
      ),
    End: () => Option.some(rawScrollTop(element, endScrollTop(element))),
  })

const rowForAnchor = (
  element: HTMLElement,
  anchor: typeof ViewportAnchor.Row.Type,
): Option.Option<HTMLElement> =>
  Option.orElse(rowForKey(element, anchor.key), () =>
    rowForIndex(element, anchor.index),
  )

const scrollTopForAnchor = (
  element: HTMLElement,
  anchor: typeof ViewportAnchor.Type,
): Option.Option<number> =>
  ViewportAnchor.match<Option.Option<number>>(anchor, {
    Offset: ({ scrollTop }) => Option.some(scrollTop),
    Row: rowAnchor =>
      Option.map(rowForAnchor(element, rowAnchor), row =>
        rawScrollTop(
          element,
          externalViewport(element) === undefined
            ? Math.max(
                0,
                rowOffsets(element, row).startOffset - rowAnchor.viewportOffset,
              )
            : rowOffsets(element, row).startOffset - rowAnchor.viewportOffset,
        ),
      ),
    End: () => Option.some(rawScrollTop(element, endScrollTop(element))),
  })

const scrollTopForRequest = (
  element: HTMLElement,
  request: typeof ScrollRequest.Type,
): Option.Option<number> =>
  ScrollRequest.match<Option.Option<number>>(request, {
    Target: ({ target, alignment }) =>
      scrollTopForTarget(element, target, alignment),
    Anchor: ({ anchor }) => scrollTopForAnchor(element, anchor),
  })

const mountedContainers = new Map<string, Set<HTMLElement>>()

export const ApplyScroll = VirtualListDefinition.makeCommand('ApplyScroll', {
  args: {
    id: Schema.String,
    request: ScrollRequest,
    version: Schema.Number,
  },
  messages: [Message.CompletedApplyScroll],
  handler: function* () {
    return ({ id, request, version }) =>
      Effect.gen(function* () {
        yield* Render.afterCommit

        const containers = mountedContainers.get(id)
        if (containers === undefined || containers.size !== 1) {
          return Message.CompletedApplyScroll({
            version,
            outcome: ApplyScrollOutcome.Skipped(),
          })
        }

        const maybeElement = pipe(containers, Array.fromIterable, Array.head)
        if (Option.isNone(maybeElement)) {
          return Message.CompletedApplyScroll({
            version,
            outcome: ApplyScrollOutcome.Skipped(),
          })
        }

        const element = maybeElement.value

        const maybeActiveVersion = pipe(
          element.getAttribute('data-virtual-list-scroll-version'),
          Option.fromNullishOr,
          Option.flatMap(Number.parse),
        )
        if (
          Option.isNone(maybeActiveVersion) ||
          maybeActiveVersion.value !== version
        ) {
          return Message.CompletedApplyScroll({
            version,
            outcome: ApplyScrollOutcome.Skipped(),
          })
        }

        const isStaleAnchor = ScrollRequest.match<boolean>(request, {
          Target: () => false,
          Anchor: ({ baselineScrollTop }) =>
            Math.abs(readScrollTop(element) - baselineScrollTop) > 1 ||
            (externalViewport(element) !== undefined &&
              !intersectsViewport(element)),
        })
        if (isStaleAnchor) {
          return Message.CompletedApplyScroll({
            version,
            outcome: ApplyScrollOutcome.Skipped(),
          })
        }

        const maybeScrollTop = scrollTopForRequest(element, request)
        if (Option.isNone(maybeScrollTop)) {
          return Message.CompletedApplyScroll({
            version,
            outcome: ApplyScrollOutcome.Skipped(),
          })
        }

        const viewport = externalViewport(element)
        const nextScrollTop =
          viewport === undefined
            ? clampScrollTop(element, maybeScrollTop.value)
            : maybeScrollTop.value
        const shouldApplyScroll = ScrollRequest.match<boolean>(request, {
          Target: () => readScrollTop(element) !== nextScrollTop,
          Anchor: () => Math.abs(readScrollTop(element) - nextScrollTop) > 1,
        })
        if (shouldApplyScroll) {
          const previousScrollTop = readScrollTop(element)
          if (viewport === undefined) {
            element.scrollTo({ top: nextScrollTop })
          } else {
            scrollExternalViewport(viewport, nextScrollTop)
          }
          const scrollTop = readScrollTop(element)
          if (scrollTop !== previousScrollTop) {
            appliedScrolls.set(element, { version, scrollTop })
          }
        }
        return Message.CompletedApplyScroll({
          version,
          outcome: ApplyScrollOutcome.Applied({
            scrollTop: readScrollTop(element),
            scrollHeight: contentHeight(element),
            containerHeight: viewportHeight(element),
            anchor: observedAnchor(element),
          }),
        })
      })
  },
})

/** Options shared by row-targeted programmatic scrolling helpers. */
export type ScrollToOptions = Readonly<{
  alignment?: ScrollAlignment
}>

const buildScrollRequestStep = (request: typeof ScrollRequest.Type) =>
  VirtualListDefinition.makeStep(model => {
    const nextVersion = Number.increment(model.pendingScrollVersion)
    return {
      model: modifyFields(model, {
        pendingScrollVersion: () => nextVersion,
        maybeMeasurementTarget: current =>
          request._tag === 'Target' ? Option.some(request) : current,
        pendingScroll: () =>
          PendingScroll.Pending({ request, version: nextVersion }),
      }),
      commands: [
        ApplyScroll({
          id: model.id,
          request,
          version: nextVersion,
        }),
      ],
    }
  })

const currentScrollRequest = (model: Model): typeof ScrollRequest.Type =>
  PendingScroll.match<typeof ScrollRequest.Type>(model.pendingScroll, {
    Idle: () =>
      InitialScroll.match<typeof ScrollRequest.Type>(model.initialScroll, {
        Applied: () =>
          Option.getOrElse(model.maybeMeasurementTarget, () =>
            ScrollRequest.Anchor({
              anchor: model.viewportAnchor,
              baselineScrollTop: model.scrollTop,
            }),
          ),
        Pending: ({ target, alignment }) =>
          ScrollRequest.Target({ target, alignment }),
      }),
    Pending: ({ request }) => request,
  })

const reconcileLayoutStep = VirtualListDefinition.makeStep(model =>
  buildScrollRequestStep(currentScrollRequest(model)),
)

const anchorFromSnapshot = (
  model: Model,
  scrollTop: number,
  scrollHeight: number,
  containerHeight: number,
  anchor: typeof ObservedAnchor.Type,
): typeof ViewportAnchor.Type => {
  const distanceFromEnd =
    model.history._tag === 'Enabled'
      ? Math.max(0, -scrollTop)
      : Math.max(0, scrollHeight - containerHeight - scrollTop)
  const isFollowingEnd = EndBehavior.match<boolean>(model.endBehavior, {
    PreserveAnchor: () => false,
    Follow: ({ thresholdPx }) => distanceFromEnd <= thresholdPx,
  })

  if (isFollowingEnd) {
    return ViewportAnchor.End()
  }

  return ObservedAnchor.match<typeof ViewportAnchor.Type>(anchor, {
    None: () => ViewportAnchor.Offset({ scrollTop }),
    Row: ({ key, index, viewportOffset }) =>
      ViewportAnchor.Row({ key, index, viewportOffset }),
  })
}

const applyScrollSnapshot = (
  model: Model,
  snapshot: Readonly<{
    scrollTop: number
    scrollHeight: number
    containerHeight: number
    anchor: typeof ObservedAnchor.Type
    layoutVersion?: number | undefined
  }>,
): Model =>
  modifyFields(model, {
    scrollTop: () => snapshot.scrollTop,
    viewportAnchor: () => {
      const nextAnchor = anchorFromSnapshot(
        model,
        snapshot.scrollTop,
        snapshot.scrollHeight,
        snapshot.containerHeight,
        snapshot.anchor,
      )
      if (
        snapshot.layoutVersion !== undefined &&
        snapshot.layoutVersion !== model.layoutVersion &&
        nextAnchor._tag !== 'End'
      ) {
        return model.viewportAnchor
      }

      return nextAnchor
    },
  })

const measureContainer = (
  model: Model,
  containerWidth: number,
  containerHeight: number,
) => {
  const wasUnmeasured = model.measurement._tag === 'Unmeasured'
  const didWidthChange = Measurement.match<boolean>(model.measurement, {
    Unmeasured: () => false,
    Measured: measurement => measurement.containerWidth !== containerWidth,
  })
  const recordContainerMeasurementStep = VirtualListDefinition.makeFieldsStep(
    () => ({
      measurement: () =>
        Measurement.Measured({ containerWidth, containerHeight }),
      measuredRowHeights: measuredRowHeights =>
        didWidthChange ? Record.empty() : measuredRowHeights,
      layoutVersion: layoutVersion =>
        didWidthChange ? Number.increment(layoutVersion) : layoutVersion,
    }),
  )

  const { initialScroll } = model
  if (initialScroll._tag === 'Pending') {
    return Update.combineSteps(model, [
      recordContainerMeasurementStep,
      buildScrollRequestStep(
        ScrollRequest.Target({
          target: initialScroll.target,
          alignment: initialScroll.alignment,
        }),
      ),
    ])
  }

  if (wasUnmeasured) {
    return recordContainerMeasurementStep(model)
  }

  return Update.combineSteps(model, [
    recordContainerMeasurementStep,
    reconcileLayoutStep,
  ])
}

const hasChangedMeasurement = (
  model: Model,
  measurement: Readonly<{
    key: string
    height: number
    layoutVersion: number
    index?: number | undefined
    layoutHeightPx?: number | undefined
  }>,
): boolean => {
  if (measurement.layoutVersion !== model.layoutVersion) {
    return false
  }

  return pipe(
    model.measuredRowHeights,
    Record.get(measurement.key),
    Option.match({
      onNone: () =>
        measurement.layoutHeightPx === undefined ||
        measurement.height !== measurement.layoutHeightPx,
      onSome: height => height !== measurement.height,
    }),
  )
}

const applyRowMeasurements = (
  model: Model,
  measurements: ReadonlyArray<{
    key: string
    height: number
    layoutVersion: number
    index?: number | undefined
    layoutHeightPx?: number | undefined
  }>,
) => {
  const changedMeasurements = Array.filter(measurements, measurement =>
    hasChangedMeasurement(model, measurement),
  )
  if (Array.isArrayEmpty(changedMeasurements)) {
    return { model }
  }

  const measuredRowHeights = Array.reduce(
    changedMeasurements,
    model.measuredRowHeights,
    (heights, measurement) =>
      Record.set(heights, measurement.key, measurement.height),
  )
  const nextModel = modifyFields(model, {
    measuredRowHeights: () => measuredRowHeights,
  })
  if (model.history._tag === 'Enabled') {
    const shouldReconcileAnchor = ViewportAnchor.match<boolean>(
      model.viewportAnchor,
      {
        Offset: () => false,
        End: () => false,
        Row: ({ index }) =>
          Array.some(
            changedMeasurements,
            measurement =>
              measurement.index === undefined || measurement.index >= index,
          ),
      },
    )
    if (!shouldReconcileAnchor) {
      return { model: nextModel }
    }
  }

  return reconcileLayoutStep(nextModel)
}

type RowOffsets = Readonly<{
  startOffset: number
  endOffset: number
}>

const requestScroll = (
  model: Model,
  target: ScrollTarget,
  maybeAlignment: Option.Option<ScrollAlignment>,
) =>
  Update.combineSteps(model, [
    VirtualListDefinition.makeFieldsStep(() => ({
      initialScroll: () => InitialScroll.Applied(),
    })),
    buildScrollRequestStep(
      ScrollRequest.Target({
        target,
        alignment: Option.getOrElse(maybeAlignment, () => 'Start'),
      }),
    ),
  ])

const applyItemsChange = (model: Model, itemKeys: ReadonlyArray<string>) => {
  const currentKeys = HashSet.fromIterable(itemKeys)
  return Update.combineSteps(model, [
    VirtualListDefinition.makeFieldsStep(() => ({
      measuredRowHeights: Record.filter((_, key) =>
        HashSet.has(currentKeys, key),
      ),
      layoutVersion: Number.increment,
      maybeMeasurementTarget: current =>
        model.pendingScroll._tag === 'Pending' &&
        model.pendingScroll.request._tag === 'Target'
          ? current
          : Option.none(),
    })),
    reconcileLayoutStep,
  ])
}

/** Stable key and row-height definitions supplied to `view`. */
export type HistoryRows<Item> = Readonly<{
  itemToKey: (item: Item, index: number) => string
}> &
  RowHeightInputs<Item>

/** Inputs for a newly prepended history page. Use the same stable key
 *  function supplied to `view`. */
export type HistoryPrependInput<Item> = Readonly<{
  items: ReadonlyArray<Item>
  prependedItems: ReadonlyArray<Item>
  itemToKey: (item: Item, index: number) => string
  page: HistoryPage
}>

const applyHistoryPrepend = (
  model: Model,
  {
    itemKeys,
    prependedItemCount,
    page,
  }: typeof Message.InformedOfHistoryPrepend.Type,
) => {
  return HistoryState.match<
    ReturnType<typeof applyItemsChange> | Readonly<{ model: Model }>
  >(model.history, {
    Disabled: () => applyItemsChange(model, itemKeys),
    Enabled: ({ reservePx, prefetchViewports }) => {
      const currentKeys = HashSet.fromIterable(itemKeys)
      const nextHistory = HistoryState.Enabled({
        reservePx,
        prefetchViewports,
        page,
      })
      const nextViewportAnchor = ViewportAnchor.match(model.viewportAnchor, {
        Offset: ({ scrollTop }) => ViewportAnchor.Offset({ scrollTop }),
        Row: ({ key, index, viewportOffset }) =>
          ViewportAnchor.Row({
            key,
            index: index + prependedItemCount,
            viewportOffset,
          }),
        End: () => ViewportAnchor.End(),
      })
      const nextModel = modifyFields(model, {
        measuredRowHeights: Record.filter((_, key) =>
          HashSet.has(currentKeys, key),
        ),
        history: () => nextHistory,
        startPaddingPx: padding => (page._tag === 'Complete' ? 0 : padding),
        historyPageVersion: Number.increment,
        viewportAnchor: () => nextViewportAnchor,
        layoutVersion: Number.increment,
      })

      return { model: nextModel }
    },
  })
}

// HELPERS

/** Slice of the data array that the view should render, plus the spacer
 *  heights that keep the scrollbar physically correct. The first row in the
 *  slice corresponds to data index `startIndex`. */
type VisibleWindow = Readonly<{
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
  const offsets: Array<number> = [0]
  let cumulativeHeight = 0
  let index = 0
  for (const item of items) {
    cumulativeHeight += itemToRowHeightPx(item, index)
    offsets.push(cumulativeHeight)
    index += 1
  }
  return offsets
}

const lastOrZero = (values: ReadonlyArray<number>): number =>
  pipe(
    values,
    Array.last,
    Option.getOrElse(() => 0),
  )

/** Alignment of content when its total height is shorter than the viewport. */
export const ContentAlignment = Schema.Literals(['Start', 'End'])

export type ContentAlignment = typeof ContentAlignment.Type

/** Set size and row positions exposed to assistive technology for paged data. */
export const AccessibleSet = defineTaggedUnion({
  Loaded: {},
  Unknown: {},
  Known: { size: Schema.Number, firstPosition: Schema.Number },
})

export type AccessibleSet = typeof AccessibleSet.Type

type ListLayout = Readonly<{
  maybeCumulativeOffsets: Option.Option<ReadonlyArray<number>>
  rowHeightPx: number
  totalHeight: number
  leadingInset: number
  containerHeight: number
  maxScrollTop: number
}>

type CachedListLayout = Readonly<{
  measuredRowHeights: Model['measuredRowHeights']
  measurement: Model['measurement']
  rowHeightPx: number
  startPaddingPx: number
  itemToKey: unknown
  itemToRowHeightPx: unknown
  itemToEstimatedRowHeightPx: unknown
  dynamicRowHeights: true | undefined
  contentAlignment: ContentAlignment
  layout: ListLayout
}>

const listLayoutCache = new WeakMap<ReadonlyArray<unknown>, CachedListLayout>()

const measuredRowHeight = (model: Model, key: string): Option.Option<number> =>
  Record.get(model.measuredRowHeights, key)

const listLayout = <Item>(
  model: Model,
  items: ReadonlyArray<Item>,
  itemToKey: (item: Item, index: number) => string,
  itemToRowHeightPx: ((item: Item, index: number) => number) | undefined,
  dynamicRowHeights: true | undefined,
  itemToEstimatedRowHeightPx:
    | ((item: Item, index: number) => number)
    | undefined,
  contentAlignment: ContentAlignment,
): ListLayout => {
  const cachedLayout = listLayoutCache.get(items)
  const isCachedLayoutReusable =
    cachedLayout !== undefined &&
    cachedLayout.measuredRowHeights === model.measuredRowHeights &&
    cachedLayout.measurement === model.measurement &&
    cachedLayout.rowHeightPx === model.rowHeightPx &&
    cachedLayout.startPaddingPx === model.startPaddingPx &&
    cachedLayout.itemToKey === itemToKey &&
    cachedLayout.itemToRowHeightPx === itemToRowHeightPx &&
    cachedLayout.itemToEstimatedRowHeightPx === itemToEstimatedRowHeightPx &&
    cachedLayout.dynamicRowHeights === dynamicRowHeights &&
    cachedLayout.contentAlignment === contentAlignment
  if (isCachedLayoutReusable) {
    return cachedLayout.layout
  }

  const rowHeightFor = (item: Item, index: number): number => {
    if (dynamicRowHeights !== undefined) {
      const key = itemToKey(item, index)
      return Option.getOrElse(
        measuredRowHeight(model, key),
        () => itemToEstimatedRowHeightPx?.(item, index) ?? model.rowHeightPx,
      )
    }
    if (itemToRowHeightPx !== undefined) {
      return itemToRowHeightPx(item, index)
    }
    return model.rowHeightPx
  }

  const maybeCumulativeOffsets =
    dynamicRowHeights === undefined && itemToRowHeightPx === undefined
      ? Option.none()
      : Option.some(prefixSum(items, rowHeightFor))
  const totalHeight = Option.match(maybeCumulativeOffsets, {
    onNone: () => items.length * model.rowHeightPx,
    onSome: lastOrZero,
  })
  const containerHeight = Measurement.match<number>(model.measurement, {
    Unmeasured: () => 0,
    Measured: ({ containerHeight }) => containerHeight,
  })
  const alignmentInset =
    contentAlignment === 'End'
      ? Math.max(0, containerHeight - model.startPaddingPx - totalHeight)
      : 0
  const leadingInset = alignmentInset + model.startPaddingPx
  const layout = {
    maybeCumulativeOffsets,
    rowHeightPx: model.rowHeightPx,
    totalHeight,
    leadingInset,
    containerHeight,
    maxScrollTop: Math.max(0, leadingInset + totalHeight - containerHeight),
  }
  listLayoutCache.set(items, {
    measuredRowHeights: model.measuredRowHeights,
    measurement: model.measurement,
    rowHeightPx: model.rowHeightPx,
    startPaddingPx: model.startPaddingPx,
    itemToKey,
    itemToRowHeightPx,
    itemToEstimatedRowHeightPx,
    dynamicRowHeights,
    contentAlignment,
    layout,
  })
  return layout
}

const offsetAt = (layout: ListLayout, index: number): number =>
  Option.match(layout.maybeCumulativeOffsets, {
    onNone: () => index * layout.rowHeightPx,
    onSome: cumulativeOffsets =>
      pipe(
        cumulativeOffsets,
        Array.get(index),
        Option.getOrElse(() => layout.totalHeight),
      ),
  })

const rowOffsetsForIndex = (
  layout: ListLayout,
  itemCount: number,
  index: number,
): Option.Option<RowOffsets> => {
  if (itemCount === 0) {
    return Option.none()
  }

  const clampedIndex = Math.max(0, Math.min(index, itemCount - 1))
  return Option.some({
    startOffset: layout.leadingInset + offsetAt(layout, clampedIndex),
    endOffset: layout.leadingInset + offsetAt(layout, clampedIndex + 1),
  })
}

const indexForKey = <Item>(
  items: ReadonlyArray<Item>,
  itemToKey: (item: Item, index: number) => string,
  key: string,
): Option.Option<number> =>
  Array.findFirstIndex(items, (item, index) => itemToKey(item, index) === key)

const clampLayoutScrollTop = (layout: ListLayout, scrollTop: number): number =>
  Math.max(0, Math.min(scrollTop, layout.maxScrollTop))

const layoutScrollTop = (
  model: Model,
  layout: ListLayout,
  scrollTop: number = model.scrollTop,
): number =>
  model.scrollContainer._tag !== 'Self'
    ? scrollTop
    : clampLayoutScrollTop(
        layout,
        model.history._tag === 'Enabled'
          ? layout.maxScrollTop + scrollTop
          : scrollTop,
      )

const alignedLayoutScrollTop = (
  model: Model,
  layout: ListLayout,
  offsets: RowOffsets,
  alignment: ScrollAlignment,
): number => {
  const isExternal = model.scrollContainer._tag !== 'Self'
  const target = scrollTopForRow(
    layoutScrollTop(model, layout),
    layout.containerHeight,
    offsets.startOffset,
    offsets.endOffset,
    alignment,
    isExternal,
  )
  return isExternal ? target : clampLayoutScrollTop(layout, target)
}

const layoutEndScrollTop = (model: Model, layout: ListLayout): number =>
  model.scrollContainer._tag === 'Self'
    ? layout.maxScrollTop
    : layout.leadingInset + layout.totalHeight - layout.containerHeight

const scrollTopForLayoutTarget = <Item>(
  model: Model,
  layout: ListLayout,
  items: ReadonlyArray<Item>,
  itemToKey: (item: Item, index: number) => string,
  target: ScrollTarget,
  alignment: ScrollAlignment,
): Option.Option<number> =>
  ScrollTarget.match<Option.Option<number>>(target, {
    Index: ({ index }) =>
      Option.map(rowOffsetsForIndex(layout, items.length, index), offsets =>
        alignedLayoutScrollTop(model, layout, offsets, alignment),
      ),
    Key: ({ key }) =>
      pipe(
        indexForKey(items, itemToKey, key),
        Option.flatMap(index =>
          rowOffsetsForIndex(layout, items.length, index),
        ),
        Option.map(offsets =>
          alignedLayoutScrollTop(model, layout, offsets, alignment),
        ),
      ),
    Offset: ({ offset }) => Option.some(clampLayoutScrollTop(layout, offset)),
    End: () => Option.some(layoutEndScrollTop(model, layout)),
  })

const scrollTopForLayoutAnchor = <Item>(
  model: Model,
  layout: ListLayout,
  items: ReadonlyArray<Item>,
  itemToKey: (item: Item, index: number) => string,
  anchor: typeof ViewportAnchor.Type,
): number =>
  ViewportAnchor.match<number>(anchor, {
    Offset: ({ scrollTop }) => layoutScrollTop(model, layout, scrollTop),
    Row: ({ key, index, viewportOffset }) => {
      const anchorIndex = Option.getOrElse(
        indexForKey(items, itemToKey, key),
        () => index,
      )
      const maybeOffsets = rowOffsetsForIndex(layout, items.length, anchorIndex)
      return Option.match(maybeOffsets, {
        onNone: () => 0,
        onSome: offsets =>
          model.scrollContainer._tag === 'Self'
            ? clampLayoutScrollTop(layout, offsets.startOffset - viewportOffset)
            : offsets.startOffset - viewportOffset,
      })
    },
    End: () => layoutEndScrollTop(model, layout),
  })

const scrollTopForView = <Item>(
  model: Model,
  layout: ListLayout,
  items: ReadonlyArray<Item>,
  itemToKey: (item: Item, index: number) => string,
): number =>
  PendingScroll.match<number>(model.pendingScroll, {
    Idle: () => layoutScrollTop(model, layout),
    Pending: ({ request }) =>
      ScrollRequest.match<number>(request, {
        Target: ({ target, alignment }) =>
          Option.getOrElse(
            scrollTopForLayoutTarget(
              model,
              layout,
              items,
              itemToKey,
              target,
              alignment,
            ),
            () => layoutScrollTop(model, layout),
          ),
        Anchor: ({ anchor }) =>
          scrollTopForLayoutAnchor(model, layout, items, itemToKey, anchor),
      }),
  })

const firstOffsetIndex = (
  offsets: ReadonlyArray<number>,
  threshold: number,
  isInclusive: boolean,
): number => {
  let start = 0
  let end = offsets.length
  while (start < end) {
    const midpoint = Math.floor((start + end) / 2)
    const offset = Option.getOrThrow(Array.get(offsets, midpoint))
    if (offset > threshold || (isInclusive && offset === threshold)) {
      end = midpoint
    } else {
      start = midpoint + 1
    }
  }
  return start
}

const visibleWindowForLayout = (
  layout: ListLayout,
  scrollTop: number,
  itemCount: number,
  overscan: number,
): VisibleWindow => {
  const contentScrollTop = Math.max(0, scrollTop - layout.leadingInset)
  const contentViewportEnd = Math.max(
    0,
    scrollTop + layout.containerHeight - layout.leadingInset,
  )
  const firstVisibleIndex = Option.match(layout.maybeCumulativeOffsets, {
    onNone: () => Math.floor(contentScrollTop / layout.rowHeightPx),
    onSome: cumulativeOffsets => {
      const index = firstOffsetIndex(cumulativeOffsets, contentScrollTop, false)
      return index === cumulativeOffsets.length
        ? itemCount
        : Math.max(0, index - 1)
    },
  })
  const lastVisibleIndex = Option.match(layout.maybeCumulativeOffsets, {
    onNone: () => Math.ceil(contentViewportEnd / layout.rowHeightPx),
    onSome: cumulativeOffsets =>
      Math.min(
        itemCount,
        firstOffsetIndex(cumulativeOffsets, contentViewportEnd, true),
      ),
  })
  const startIndex = clampIndex(firstVisibleIndex - overscan, itemCount)
  const endIndex = clampIndex(lastVisibleIndex + overscan, itemCount)
  return {
    startIndex,
    endIndex,
    topSpacerHeight: layout.leadingInset + offsetAt(layout, startIndex),
    bottomSpacerHeight: layout.totalHeight - offsetAt(layout, endIndex),
  }
}

// ELEMENT LIFECYCLE

const rowMeasurement = (
  entry: ResizeObserverEntry,
): Option.Option<{
  key: string
  height: number
  layoutVersion: number
  index?: number | undefined
  layoutHeightPx?: number | undefined
}> => {
  if (!(entry.target instanceof HTMLElement)) {
    return Option.none()
  }

  const key = entry.target.getAttribute('data-virtual-list-item-key')
  const layoutVersion = pipe(
    entry.target.getAttribute('data-virtual-list-layout-version'),
    Option.fromNullishOr,
    Option.flatMap(Number.parse),
  )
  const maybeIndex = pipe(
    entry.target.getAttribute('data-virtual-list-item-index'),
    Option.fromNullishOr,
    Option.flatMap(Number.parse),
  )
  const maybeLayoutHeightPx = pipe(
    entry.target.getAttribute('data-virtual-list-layout-height'),
    Option.fromNullishOr,
    Option.flatMap(Number.parse),
  )
  if (key === null || Option.isNone(layoutVersion)) {
    return Option.none()
  }

  return Option.some({
    key,
    height: entry.target.getBoundingClientRect().height,
    layoutVersion: layoutVersion.value,
    index: Option.getOrUndefined(maybeIndex),
    layoutHeightPx: Option.getOrUndefined(maybeLayoutHeightPx),
  })
}

type ObserveVirtualListMessage =
  | typeof Message.ObservedContainerScroll.Type
  | typeof Message.ApproachedLoadedStart.Type
  | typeof Message.EndedContainerScroll.Type
  | typeof Message.ResizedContainer.Type
  | typeof Message.MeasuredRows.Type

const START_GESTURE_TOUCH_DISTANCE_PX = 4
const WHEEL_BURST_QUIET_MS = 160
const SCROLL_SETTLE_FALLBACK_MS = 500

const observeVirtualList = (
  element: Element,
  id: string,
  observeHistory: boolean,
  scrollContainer: ScrollContainer,
): Stream.Stream<ObserveVirtualListMessage> =>
  Stream.callback<ObserveVirtualListMessage>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        if (!(element instanceof HTMLElement)) {
          return () => undefined
        }

        let isTouchActive = false
        const viewport = resolveExternalViewport(element, scrollContainer)
        const unregisterViewport =
          viewport === undefined
            ? () => undefined
            : registerExternalViewport(viewport)
        const scrollOwner = viewport?.owner ?? element
        let previousScrollTop = element.scrollTop
        let previousDistanceFromEnd = Math.max(
          0,
          element.scrollHeight - element.clientHeight - element.scrollTop,
        )
        let lastApproachedPageVersion: string | undefined
        let scrollSettleTimeout: ReturnType<typeof setTimeout> | undefined

        const maybeEmitApproachedLoadedStart = (isTowardStart: boolean) => {
          if (
            element.getAttribute('data-virtual-list-history-page') !== 'More'
          ) {
            return
          }

          const maybeStartPaddingPx = pipe(
            element.getAttribute('data-virtual-list-start-padding'),
            Option.fromNullishOr,
            Option.flatMap(Number.parse),
          )
          const maybePrefetchViewports = pipe(
            element.getAttribute(
              'data-virtual-list-history-prefetch-viewports',
            ),
            Option.fromNullishOr,
            Option.flatMap(Number.parse),
          )
          const pageVersion = element.getAttribute(
            'data-virtual-list-history-page-version',
          )
          if (
            Option.isNone(maybeStartPaddingPx) ||
            Option.isNone(maybePrefetchViewports) ||
            pageVersion === null
          ) {
            return
          }

          const distanceToLoadedStartPx =
            logicalScrollTop(element) - maybeStartPaddingPx.value
          if (
            distanceToLoadedStartPx >
            element.clientHeight * maybePrefetchViewports.value
          ) {
            lastApproachedPageVersion = undefined
            return
          }

          if (!isTowardStart || lastApproachedPageVersion === pageVersion) {
            return
          }

          lastApproachedPageVersion = pageVersion
          Queue.offerUnsafe(
            queue,
            Message.ApproachedLoadedStart({
              distanceToLoadedStartPx,
              containerHeight: element.clientHeight,
            }),
          )
        }

        const emitEndedContainerScroll = () => {
          if (isTouchActive) {
            return
          }

          lastApproachedPageVersion = undefined
          if (scrollSettleTimeout !== undefined) {
            clearTimeout(scrollSettleTimeout)
            scrollSettleTimeout = undefined
          }
          Queue.offerUnsafe(queue, Message.EndedContainerScroll())
        }

        const scheduleScrollSettleFallback = () => {
          if (scrollSettleTimeout !== undefined) {
            clearTimeout(scrollSettleTimeout)
          }
          scrollSettleTimeout = setTimeout(() => {
            scrollSettleTimeout = undefined
            emitEndedContainerScroll()
          }, SCROLL_SETTLE_FALLBACK_MS)
        }

        const emitContainerMeasurement = () =>
          Queue.offerUnsafe(
            queue,
            Message.ResizedContainer({
              containerWidth: element.clientWidth,
              containerHeight: viewportHeight(element),
              ...(viewport === undefined
                ? {}
                : {
                    viewport: {
                      scrollTop: readScrollTop(element),
                      scrollHeight: contentHeight(element),
                      containerHeight: viewportHeight(element),
                      anchor: observedAnchor(element),
                    },
                  }),
            }),
          )

        emitContainerMeasurement()

        const scrollListener = (event?: Event) => {
          const origin = scrollObservationOrigin(element, event)
          const distanceFromEnd = Math.max(
            0,
            element.scrollHeight - element.clientHeight - element.scrollTop,
          )
          const isTowardStart =
            element.scrollTop < previousScrollTop - 1 &&
            distanceFromEnd > previousDistanceFromEnd + 1
          previousScrollTop = element.scrollTop
          previousDistanceFromEnd = distanceFromEnd
          Queue.offerUnsafe(
            queue,
            Message.ObservedContainerScroll({
              scrollTop: readScrollTop(element),
              scrollHeight: contentHeight(element),
              containerHeight: viewportHeight(element),
              anchor: observedAnchor(element),
              origin,
              layoutVersion: pipe(
                element.getAttribute('data-virtual-list-layout-version'),
                Option.fromNullishOr,
                Option.flatMap(Number.parse),
                Option.getOrUndefined,
              ),
            }),
          )
          if (observeHistory) {
            scheduleScrollSettleFallback()
            maybeEmitApproachedLoadedStart(isTowardStart)
          }
        }
        scrollOwner.addEventListener('scroll', scrollListener, {
          passive: true,
        })

        const scrollEndListener = () => emitEndedContainerScroll()

        let activeTouch:
          | Readonly<{
              identifier: number
              startX: number
              startY: number
            }>
          | undefined
        let isWheelBurstActive = false
        let wheelBurstTimeout: ReturnType<typeof setTimeout> | undefined

        const touchStartListener = (event: TouchEvent) => {
          isTouchActive = true
          if (scrollSettleTimeout !== undefined) {
            clearTimeout(scrollSettleTimeout)
            scrollSettleTimeout = undefined
          }

          if (event.touches.length !== 1) {
            activeTouch = undefined
            return
          }

          const maybeTouch = Array.head(
            globalThis.Array.from(event.changedTouches),
          )
          if (Option.isSome(maybeTouch)) {
            activeTouch = {
              identifier: maybeTouch.value.identifier,
              startX: maybeTouch.value.clientX,
              startY: maybeTouch.value.clientY,
            }
          }
        }

        const touchMoveListener = (event: TouchEvent) => {
          if (activeTouch === undefined || event.touches.length !== 1) {
            return
          }

          const maybeTouch = Array.findFirst(
            globalThis.Array.from(event.changedTouches),
            touch => touch.identifier === activeTouch?.identifier,
          )
          if (Option.isNone(maybeTouch)) {
            return
          }

          const deltaX = maybeTouch.value.clientX - activeTouch.startX
          const deltaY = maybeTouch.value.clientY - activeTouch.startY
          if (
            Math.abs(deltaY) < START_GESTURE_TOUCH_DISTANCE_PX ||
            Math.abs(deltaY) <= Math.abs(deltaX)
          ) {
            return
          }

          if (deltaY > 0) {
            maybeEmitApproachedLoadedStart(true)
          }
          activeTouch = undefined
        }

        const touchEndListener = (event: TouchEvent) => {
          if (
            activeTouch !== undefined &&
            Array.some(
              globalThis.Array.from(event.changedTouches),
              touch => touch.identifier === activeTouch?.identifier,
            )
          ) {
            activeTouch = undefined
          }
          if (event.touches.length === 0) {
            isTouchActive = false
            scheduleScrollSettleFallback()
          }
        }

        const wheelListener = (event: WheelEvent) => {
          if (wheelBurstTimeout !== undefined) {
            clearTimeout(wheelBurstTimeout)
          }
          wheelBurstTimeout = setTimeout(() => {
            isWheelBurstActive = false
            wheelBurstTimeout = undefined
          }, WHEEL_BURST_QUIET_MS)

          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
            return
          }
          scheduleScrollSettleFallback()
          if (!isWheelBurstActive && event.deltaY < 0) {
            isWheelBurstActive = true
            maybeEmitApproachedLoadedStart(true)
          }
        }

        const keyDownListener = (event: KeyboardEvent) => {
          if (event.target !== element || event.repeat) {
            return
          }
          if (
            event.key === 'ArrowUp' ||
            event.key === 'PageUp' ||
            event.key === 'Home' ||
            (event.key === ' ' && event.shiftKey)
          ) {
            scheduleScrollSettleFallback()
            maybeEmitApproachedLoadedStart(true)
          }
        }

        if (observeHistory) {
          element.addEventListener('scrollend', scrollEndListener)
          element.addEventListener('touchstart', touchStartListener, {
            passive: true,
          })
          element.addEventListener('touchmove', touchMoveListener, {
            passive: true,
          })
          element.addEventListener('touchend', touchEndListener, {
            passive: true,
          })
          element.addEventListener('touchcancel', touchEndListener, {
            passive: true,
          })
          element.addEventListener('wheel', wheelListener, { passive: true })
          element.addEventListener('keydown', keyDownListener)
        }

        let lastWidth = element.clientWidth
        let lastHeight = viewportHeight(element)
        let lastTop = readScrollTop(element)
        const reportGeometry = () => {
          const width = element.clientWidth
          const height = viewportHeight(element)
          const top = readScrollTop(element)
          if (width !== lastWidth || height !== lastHeight) {
            lastWidth = width
            lastHeight = height
            emitContainerMeasurement()
          } else if (viewport !== undefined && Math.abs(top - lastTop) > 0.5) {
            scrollListener()
          }

          lastTop = top
        }
        const containerResizeObserver = new ResizeObserver(() => {
          if (viewport === undefined) {
            emitContainerMeasurement()
          } else {
            reportGeometry()
          }
        })
        containerResizeObserver.observe(element)
        const stopPositionObservation =
          viewport === undefined
            ? () => undefined
            : observeExternalPosition(viewport, reportGeometry)

        const observedRows = new Map<HTMLElement, string>()
        const rowResizeObserver = new ResizeObserver(entries => {
          const measurements = Array.flatMap(entries, entry =>
            Option.match(rowMeasurement(entry), {
              onNone: () => [],
              onSome: measurement => [measurement],
            }),
          )
          if (Array.isArrayNonEmpty(measurements)) {
            Queue.offerUnsafe(queue, Message.MeasuredRows({ measurements }))
          }
        })

        const reconcileRows = () => {
          if (element.childElementCount === 0) {
            emitContainerMeasurement()
          }

          const rows = Array.filter(
            renderedRows(element),
            row => row.getAttribute('data-virtual-list-measure') === 'true',
          )
          const measurableRows = new Set(rows)
          for (const row of observedRows.keys()) {
            if (!measurableRows.has(row)) {
              rowResizeObserver.unobserve(row)
              observedRows.delete(row)
            }
          }

          for (const row of rows) {
            const layoutVersion =
              row.getAttribute('data-virtual-list-layout-version') ?? ''
            if (observedRows.get(row) !== layoutVersion) {
              rowResizeObserver.unobserve(row)
              observedRows.set(row, layoutVersion)
              rowResizeObserver.observe(row)
            }
          }
        }

        const mutationObserver = new MutationObserver(reconcileRows)
        mutationObserver.observe(element, {
          attributes: true,
          attributeFilter: [
            'data-virtual-list-layout-version',
            'data-virtual-list-measure',
          ],
          childList: true,
          subtree: true,
        })
        reconcileRows()

        const containers = mountedContainers.get(id) ?? new Set<HTMLElement>()
        containers.add(element)
        mountedContainers.set(id, containers)

        return () => {
          const containers = mountedContainers.get(id)
          if (containers !== undefined) {
            containers.delete(element)
            if (containers.size === 0) {
              mountedContainers.delete(id)
            }
          }
          mutationObserver.disconnect()
          rowResizeObserver.disconnect()
          containerResizeObserver.disconnect()
          scrollOwner.removeEventListener('scroll', scrollListener)
          stopPositionObservation()
          unregisterViewport()
          appliedScrolls.delete(element)
          if (observeHistory) {
            element.removeEventListener('scrollend', scrollEndListener)
            element.removeEventListener('touchstart', touchStartListener)
            element.removeEventListener('touchmove', touchMoveListener)
            element.removeEventListener('touchend', touchEndListener)
            element.removeEventListener('touchcancel', touchEndListener)
            element.removeEventListener('wheel', wheelListener)
            element.removeEventListener('keydown', keyDownListener)
            if (wheelBurstTimeout !== undefined) {
              clearTimeout(wheelBurstTimeout)
            }
            if (scrollSettleTimeout !== undefined) {
              clearTimeout(scrollSettleTimeout)
            }
          }
        }
      }),
      cleanup => Effect.sync(cleanup),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/** Container-owned Mount that tracks scrolling, container resizing, and
 *  rendered row measurements for dynamic-height lists. */
export const ObserveVirtualList = VirtualListDefinition.makeMountStream(
  'ObserveVirtualList',
  {
    args: {
      id: Schema.String,
      observeHistory: Schema.optional(Schema.Boolean),
      scrollContainer: Schema.optional(ScrollContainer),
    },
    messages: [
      Message.ObservedContainerScroll,
      Message.ApproachedLoadedStart,
      Message.EndedContainerScroll,
      Message.ResizedContainer,
      Message.MeasuredRows,
    ],
    handler: function* () {
      return ({
        element,
        id,
        observeHistory,
        scrollContainer,
        viewStateChanges,
      }) =>
        viewStateChanges.pipe(
          Stream.switchMap(viewState =>
            viewState === 'Live'
              ? observeVirtualList(
                  element,
                  id,
                  observeHistory ?? false,
                  scrollContainer ?? ScrollContainer.Self(),
                )
              : Stream.never,
          ),
        )
    },
  },
)

/** Mount Definitions rendered by VirtualList views. */
export const mounts = [ObserveVirtualList]

const VirtualListComposition = VirtualListDefinition.makeComposition({
  mounts,
})

/** Creates an initial VirtualList Model and Commands from a config. The container starts
 *  in `Unmeasured` state until its Mount reports the first measurement. */
export const init = VirtualListComposition.makeInit((config: InitConfig) => ({
  model: makeInitialModel(config),
}))

/** Processes a VirtualList Message and returns the next Model and optional Commands. */
export const update = VirtualListComposition.makeUpdate({
  RequestedScrollTo: (model, { target, maybeAlignment }) =>
    requestScroll(model, target, maybeAlignment),
  RequestedScrollToIndex: (model, { index, maybeAlignment }) =>
    requestScroll(model, ScrollTarget.Index({ index }), maybeAlignment),
  RequestedScrollToKey: (model, { key, maybeAlignment }) =>
    requestScroll(model, ScrollTarget.Key({ key }), maybeAlignment),
  RequestedScrollToOffset: (model, { offset }) =>
    requestScroll(model, ScrollTarget.Offset({ offset }), Option.none()),
  RequestedScrollToEnd: model =>
    requestScroll(model, ScrollTarget.End(), Option.none()),
  InformedOfItemsChange: (model, { itemKeys }) =>
    applyItemsChange(model, itemKeys),
  InformedOfHistoryPrepend: (model, message) =>
    applyHistoryPrepend(model, message),
  ObservedContainerScroll: (model, snapshot) => {
    const origin = snapshot.origin ?? ScrollObservationOrigin.Native()
    const outMessage = OutMessage.ObservedContainerScroll({
      scrollTop: snapshot.scrollTop,
      scrollHeight: snapshot.scrollHeight,
      containerHeight: snapshot.containerHeight,
      anchor: snapshot.anchor,
    })
    if (origin._tag !== 'Native') {
      const isIdleLayout =
        origin._tag === 'Layout' &&
        model.pendingScroll._tag === 'Idle' &&
        Option.isNone(model.maybeMeasurementTarget)
      const nextModel = isIdleLayout
        ? applyScrollSnapshot(model, snapshot)
        : modifyFields(model, { scrollTop: () => snapshot.scrollTop })
      if (
        nextModel.pendingScroll._tag === 'Pending' &&
        nextModel.pendingScroll.request._tag === 'Anchor' &&
        Math.abs(
          nextModel.pendingScroll.request.baselineScrollTop -
            snapshot.scrollTop,
        ) > 1
      ) {
        return Update.withOutMessage(
          buildScrollRequestStep(
            ScrollRequest.Anchor({
              anchor: nextModel.pendingScroll.request.anchor,
              baselineScrollTop: snapshot.scrollTop,
            }),
          )(nextModel),
          outMessage,
        )
      }

      return { model: nextModel, outMessage }
    }

    const nextModel = modifyFields(applyScrollSnapshot(model, snapshot), {
      initialScroll: () => InitialScroll.Applied(),
      maybeMeasurementTarget: () => Option.none(),
    })
    return PendingScroll.match<
      Update.ReturnWithOutMessage<
        Model,
        Message,
        typeof OutMessage.Type,
        Effect.Services<ReturnType<typeof ApplyScroll>['effect']>
      >
    >(model.pendingScroll, {
      Idle: () => ({ model: nextModel, outMessage }),
      Pending: ({ request }) =>
        ScrollRequest.match(request, {
          Target: () => ({
            model: modifyFields(nextModel, {
              pendingScroll: () => PendingScroll.Idle(),
              pendingScrollVersion: Number.increment,
            }),
            outMessage,
          }),
          Anchor: () =>
            Update.withOutMessage(
              buildScrollRequestStep(
                ScrollRequest.Anchor({
                  anchor: nextModel.viewportAnchor,
                  baselineScrollTop: nextModel.scrollTop,
                }),
              )(nextModel),
              outMessage,
            ),
        }),
    })
  },
  ApproachedLoadedStart: (
    model,
    { distanceToLoadedStartPx, containerHeight },
  ) => ({
    model,
    outMessage: OutMessage.ApproachedLoadedStart({
      distanceToLoadedStartPx,
      containerHeight,
    }),
  }),
  EndedContainerScroll: model => ({
    model,
    outMessage: OutMessage.EndedContainerScroll(),
  }),
  ResizedContainer: (model, { containerWidth, containerHeight, viewport }) => {
    if (viewport === undefined) {
      return measureContainer(model, containerWidth, containerHeight)
    }

    const measuredModel =
      model.measurement._tag === 'Unmeasured'
        ? applyScrollSnapshot(model, viewport)
        : modifyFields(model, { scrollTop: () => viewport.scrollTop })
    return measureContainer(measuredModel, containerWidth, containerHeight)
  },
  MeasuredRows: (model, { measurements }) =>
    applyRowMeasurements(model, measurements),
  CompletedApplyScroll: (model, { version, outcome }) => {
    if (version !== model.pendingScrollVersion) {
      return { model }
    }
    return ApplyScrollOutcome.match(outcome, {
      Applied: snapshot => {
        const scrolledModel = applyScrollSnapshot(model, snapshot)
        return {
          model: modifyFields(scrolledModel, {
            initialScroll: () =>
              snapshot.anchor._tag === 'Row'
                ? InitialScroll.Applied()
                : model.initialScroll,
            pendingScroll: () => PendingScroll.Idle(),
          }),
        }
      },
      Skipped: () => ({
        model: modifyFields(model, {
          pendingScroll: () => PendingScroll.Idle(),
        }),
      }),
    })
  },
})

/** Provides VirtualList's Command and Mount handlers. */
export const EffectsLayer = Layer.mergeAll(
  ApplyScroll.layer,
  ObserveVirtualList.layer,
)

// VIEW

const DEFAULT_OVERSCAN = 5

/** Per-render view inputs passed to `view` via `h.block`'s `viewInputs` field.
 *
 *  VirtualList owns scroll and resize observation through a Mount on its
 *  container. Dynamic rows are measured by the same lifecycle owner. */
type BaseViewInputs<Item> = Readonly<{
  items: ReadonlyArray<Item>
  /** Children of the keyed row. Return several cells for a table row. */
  itemToView: (item: Item, index: number) => Html | ReadonlyArray<Html>
  /** Additional row attributes, such as a Class or native table aria-rowindex.
   * Keep VirtualList's geometry styles and data-virtual-list attributes intact.
   */
  itemToAttributes?: (
    item: Item,
    index: number,
  ) => ReadonlyArray<ChildAttribute>
  accessibleSet?: AccessibleSet
  overscan?: number
  containerClassName?: string
  /** Attributes on the viewport in Self mode, or the list surface externally.
   * VirtualList owns surface padding, row sizing and positioning. Use classes
   * for decoration without replacing its inline geometry styles.
   */
  containerAttributes?: ReadonlyArray<ChildAttribute>
  contentAlignment?: ContentAlignment
}>

/** Mutually exclusive configuration for fixed, exact variable, or measured
 *  dynamic row heights. */
export type RowHeightInputs<Item> =
  | Readonly<{
      itemToRowHeightPx?: undefined
      dynamicRowHeights?: undefined
      itemToEstimatedRowHeightPx?: never
    }>
  | Readonly<{
      itemToRowHeightPx?: never
      dynamicRowHeights: true
      itemToEstimatedRowHeightPx?: (item: Item, index: number) => number
    }>
  | Readonly<{
      itemToRowHeightPx: (item: Item, index: number) => number
      dynamicRowHeights?: never
      itemToEstimatedRowHeightPx?: never
    }>

/** Row definitions and layout supplied through a Binding's `embedView`.
 *
 * Ordinary lists support spacer or absolute rows. Self absolute lists add an
 * inner content surface; the configured id and container attributes stay on
 * the outer viewport. Native `tbody` rows require `rowElement: 'tr'`, a positive
 * `tableColumns` count and an external scroll container. The parent owns the
 * table, column definitions, header and logical row indices. History mode
 * requires Self scrolling and ordinary spacer rows.
 */
export type ViewInputs<Item> = BaseViewInputs<Item> &
  HistoryRows<Item> &
  (
    | Readonly<{
        containerElement?: 'ul' | 'ol' | 'div'
        rowElement?: Exclude<TagName, 'textarea' | 'tr'>
        rowLayout?: 'Spacers' | 'Absolute'
        tableColumns?: never
      }>
    | Readonly<{
        containerElement: 'tbody'
        rowElement: 'tr'
        rowLayout?: 'Spacers'
        tableColumns: number
      }>
  )

/** Refines the shared view to the completed Block's item contract. */
type ViewForItem<Item> = Block.RefineViewInputs<
  typeof viewImpl,
  ViewInputs<Item>
>

export const view = <Item>() =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  viewImpl as unknown as ViewForItem<Item>

const isHtmlArray = (
  value: Html | ReadonlyArray<Html>,
): value is ReadonlyArray<Html> => Array.isArray(value)

type InternalVirtualListViewInputs = ViewInputs<unknown>

const viewImpl =
  VirtualListComposition.makeView.withInputs<InternalVirtualListViewInputs>(
    (model, viewInputs, h) => {
      const {
        items,
        itemToView,
        accessibleSet = AccessibleSet.Loaded(),
        overscan = DEFAULT_OVERSCAN,
        rowElement = 'li',
        containerElement = 'ul',
        rowLayout = 'Spacers',
        itemToAttributes,
        containerClassName,
        containerAttributes = [],
        contentAlignment = 'Start',
      } = viewInputs
      const {
        itemToKey,
        itemToRowHeightPx,
        dynamicRowHeights,
        itemToEstimatedRowHeightPx,
      } = viewInputs
      const historyAttributes = HistoryState.match(model.history, {
        Disabled: () => [],
        Enabled: ({ prefetchViewports, page }) => [
          h.DataAttribute(
            'virtual-list-history-prefetch-viewports',
            String(prefetchViewports),
          ),
          h.DataAttribute('virtual-list-history-page', page._tag),
          h.DataAttribute(
            'virtual-list-history-page-version',
            String(model.historyPageVersion),
          ),
        ],
      })
      const observeHistory = model.history._tag === 'Enabled'
      const isExternal = model.scrollContainer._tag !== 'Self'
      const isTable = containerElement === 'tbody'
      const isAbsolute = rowLayout === 'Absolute'
      const tableColumns =
        viewInputs.containerElement === 'tbody' ? viewInputs.tableColumns : 0
      if (observeHistory && (isExternal || isTable || isAbsolute)) {
        throw new Error(
          'VirtualList history requires a Self scroll container and spacer list rows.',
        )
      }
      if (
        isTable &&
        (!isExternal ||
          isAbsolute ||
          !globalThis.Number.isInteger(tableColumns) ||
          tableColumns < 1)
      ) {
        throw new Error(
          'VirtualList table rows require an external scroll container, spacer layout and a positive tableColumns count.',
        )
      }

      const layout = listLayout(
        model,
        items,
        itemToKey,
        itemToRowHeightPx,
        dynamicRowHeights,
        itemToEstimatedRowHeightPx,
        contentAlignment,
      )
      const baseContainerAttributes = [
        h.Id(model.id),
        ...(!isTable ? [h.Role('list')] : []),
        ...historyAttributes,
        ...(observeHistory
          ? [h.DataAttribute('virtual-list-bottom-origin', 'true')]
          : []),
        h.DataAttribute(
          'virtual-list-scroll-version',
          String(model.pendingScrollVersion),
        ),
        h.DataAttribute(
          'virtual-list-start-padding',
          String(model.startPaddingPx),
        ),
        h.DataAttribute(
          'virtual-list-layout-version',
          String(model.layoutVersion),
        ),
        h.OnMount(
          ObserveVirtualList({
            id: model.id,
            ...(observeHistory ? { observeHistory } : {}),
            ...(isExternal ? { scrollContainer: model.scrollContainer } : {}),
          }),
        ),
        h.Style({
          ...(!isExternal
            ? {
                overflow: 'auto',
                'overflow-anchor': 'none',
              }
            : {}),
          ...(observeHistory
            ? { display: 'flex', 'flex-direction': 'column-reverse' }
            : {}),
          'list-style': 'none',
          margin: '0',
          padding: '0',
          ...(isAbsolute && isExternal
            ? {
                position: 'relative',
                height: `${layout.leadingInset + layout.totalHeight}px`,
                'overflow-anchor': 'none',
              }
            : {}),
        }),
        ...(containerClassName !== undefined
          ? [h.Class(containerClassName)]
          : []),
      ]

      const allContainerAttributes = [
        ...childAttributes(baseContainerAttributes),
        ...containerAttributes,
      ]

      const renderSurface = (
        children: ReadonlyArray<Html>,
        attributes: ReadonlyArray<(typeof allContainerAttributes)[number]>,
      ) => h.keyed(containerElement)(model.id, attributes, children)
      const surfaceAttributes = childAttributes([
        h.DataAttribute('virtual-list-surface', 'true'),
        h.DataAttribute('virtual-list-absolute', 'true'),
        h.Style({
          position: 'relative',
          height: `${layout.leadingInset + layout.totalHeight}px`,
          'overflow-anchor': 'none',
          'list-style': 'none',
          margin: '0',
          padding: '0',
        }),
      ])
      const renderContainer = (children: ReadonlyArray<Html>): Html => {
        if (isAbsolute && !isExternal) {
          return h.div(allContainerAttributes, [
            renderSurface(children, [
              ...surfaceAttributes,
              ...childAttributes([h.Role('presentation')]),
            ]),
          ])
        }

        return renderSurface(children, [
          ...allContainerAttributes,
          ...(isAbsolute
            ? childAttributes([
                h.DataAttribute('virtual-list-surface', 'true'),
                h.DataAttribute('virtual-list-absolute', 'true'),
              ])
            : []),
        ])
      }
      const announcedSet = AccessibleSet.match<
        Readonly<{ size: number; positionOffset: number }>
      >(accessibleSet, {
        Loaded: () => ({ size: items.length, positionOffset: 0 }),
        Unknown: () => ({ size: -1, positionOffset: 0 }),
        Known: ({ size, firstPosition }) => ({
          size,
          positionOffset: firstPosition - 1,
        }),
      })
      const maybeWindow = Measurement.match<Option.Option<VisibleWindow>>(
        model.measurement,
        {
          Unmeasured: () => Option.none(),
          Measured: () =>
            Option.some(
              visibleWindowForLayout(
                layout,
                scrollTopForView(model, layout, items, itemToKey),
                items.length,
                overscan,
              ),
            ),
        },
      )

      return Option.match(maybeWindow, {
        onNone: () => renderContainer([]),

        onSome: ({
          startIndex,
          endIndex,
          topSpacerHeight,
          bottomSpacerHeight,
        }) => {
          const visibleItems = items.slice(startIndex, endIndex)

          const spacer = (name: string, height: number, order: number) => {
            const styles = {
              height: `${height}px`,
              'overflow-anchor': 'none',
              ...(observeHistory
                ? { order: String(order), 'flex-shrink': '0' }
                : {}),
            }
            if (isTable) {
              return h.keyed('tr')(
                `${model.id}-${name}-spacer`,
                [h.AriaHidden(true)],
                [
                  h.td([
                    h.Colspan(tableColumns),
                    h.Style({
                      ...styles,
                      padding: '0',
                      border: '0',
                      'line-height': '0',
                    }),
                  ]),
                ],
              )
            }

            return h.keyed(rowElement)(`${model.id}-${name}-spacer`, [
              h.Role('presentation'),
              h.AriaHidden(true),
              h.Style(styles),
            ])
          }
          const topSpacer = spacer('top', topSpacerHeight, items.length + 1)
          const bottomSpacer = spacer('bottom', bottomSpacerHeight, 0)

          const renderedRows = Array.map(visibleItems, (item, sliceIndex) => {
            const dataIndex = startIndex + sliceIndex
            const key = itemToKey(item, dataIndex)
            const rowHeight =
              offsetAt(layout, dataIndex + 1) - offsetAt(layout, dataIndex)
            const children = itemToView(item, dataIndex)

            return h.keyed(rowElement)(
              key,
              [
                ...(!isTable
                  ? [
                      h.Role('listitem'),
                      h.AriaSetsize(announcedSet.size),
                      h.AriaPosinset(
                        announcedSet.positionOffset + dataIndex + 1,
                      ),
                    ]
                  : []),
                h.DataAttribute('virtual-list-item-key', key),
                h.DataAttribute('virtual-list-item-index', String(dataIndex)),
                ...(dynamicRowHeights === undefined
                  ? []
                  : [
                      h.DataAttribute('virtual-list-measure', 'true'),
                      h.DataAttribute(
                        'virtual-list-layout-version',
                        String(model.layoutVersion),
                      ),
                      h.DataAttribute(
                        'virtual-list-layout-height',
                        String(rowHeight),
                      ),
                    ]),
                h.Style({
                  ...(dynamicRowHeights === undefined
                    ? { height: `${rowHeight}px` }
                    : {}),
                  ...(!isTable ? { display: 'grid' } : {}),
                  ...(observeHistory
                    ? {
                        order: String(items.length - dataIndex),
                        'flex-shrink': '0',
                      }
                    : {}),
                  ...(isAbsolute
                    ? {
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        transform: `translateY(${layout.leadingInset + offsetAt(layout, dataIndex)}px)`,
                      }
                    : {}),
                }),
                ...(itemToAttributes?.(item, dataIndex) ?? []),
              ],
              isHtmlArray(children) ? children : [children],
            )
          })

          return renderContainer(
            isAbsolute
              ? renderedRows
              : [topSpacer, ...renderedRows, bottomSpacer],
          )
        },
      })
    },
  )

const makeOperations = <Item>() => ({
  informHistoryPrepended: (input: HistoryPrependInput<Item>) =>
    Tuple.make(
      Message.InformedOfHistoryPrepend({
        itemKeys: Array.map(input.items, input.itemToKey),
        prependedItemCount: input.prependedItems.length,
        page: input.page,
      }),
    ),
  informItemsChanged: (itemKeys: ReadonlyArray<string>) =>
    Tuple.make(Message.InformedOfItemsChange({ itemKeys })),
  requestScrollTo: (target: ScrollTarget, options: ScrollToOptions = {}) =>
    Tuple.make(
      Message.RequestedScrollTo({
        target,
        maybeAlignment: Option.fromNullishOr(options.alignment),
      }),
    ),
  requestScrollToIndex: (index: number, options: ScrollToOptions = {}) =>
    Tuple.make(
      Message.RequestedScrollToIndex({
        index,
        maybeAlignment: Option.fromNullishOr(options.alignment),
      }),
    ),
  requestScrollToKey: (key: string, options: ScrollToOptions = {}) =>
    Tuple.make(
      Message.RequestedScrollToKey({
        key,
        maybeAlignment: Option.fromNullishOr(options.alignment),
      }),
    ),
  requestScrollToOffset: (offset: number) =>
    Tuple.make(Message.RequestedScrollToOffset({ offset })),
  requestScrollToEnd: Message.RequestedScrollToEnd,
})

const operations = makeOperations<unknown>()

const prepareVirtualListBlock = () =>
  VirtualListComposition.prepareBlock({
    init,
    update,
    view: viewImpl,
    operations,
    EffectsLayer,
  })
/** Complete VirtualList Block definition using an unknown item type. */
export const block: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareVirtualListBlock
> = Block.assemble(prepareVirtualListBlock)

/** Programmatically scrolls to a logical target. */
export const scrollTo = block.operations.requestScrollTo

/** Programmatically scrolls the container so the row at `index` is visible.
 *  The next view resolves the logical index with its current sizing mode, and
 *  the Command aligns the live rendered row. */
export const scrollToIndex = block.operations.requestScrollToIndex

/** Programmatically scrolls to the row whose `itemToKey` result matches
 *  `key`. The next view resolves the key against its current items. */
export const scrollToKey = block.operations.requestScrollToKey

/** Programmatically scrolls to an exact pixel offset from the start of the
 *  list. Negative offsets clamp to zero. */
export const scrollToOffset = block.operations.requestScrollToOffset

/** Programmatically scrolls to the end of the list. */
export const scrollToEnd = block.operations.requestScrollToEnd

const makeBlockParts = <Item>() => {
  const refinedView = view<Item>()

  return {
    composition: VirtualListComposition,
    implementation: {
      init,
      update,
      view: refinedView,
      operations: makeOperations<Item>(),
      EffectsLayer,
    },
  }
}

/** A completed VirtualList Block refined to one item type. */
export interface Completed<Item> extends Block.CompletedWithViewAndOutMessage<
  ReturnType<typeof makeBlockParts<Item>>['composition'],
  ReturnType<typeof makeBlockParts<Item>>['implementation']
> {}

/** Creates a completed VirtualList Block refined to one item type.
 *
 * Bind the result to a parent Composition. Init selects Self, Ancestor or
 * Window scrolling; view inputs supply rows, stable keys and a spacer or
 * absolute layout. Construction installs no browser observers until mounted.
 */
export const create = <Item>(): Completed<Item> => {
  const { composition, implementation } = makeBlockParts<Item>()

  const prepare = () => composition.prepareBlock(implementation)
  const completedBlock: Block.FromAssemblyWithViewAndOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return completedBlock
}
