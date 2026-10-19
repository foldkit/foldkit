import {
  Array,
  Effect,
  HashSet,
  Match,
  Number,
  Option,
  Queue,
  Record,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import {
  type ChildAttribute,
  type Html,
  type TagName,
  childAttributes,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'
import * as Render from 'foldkit/render'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'
import { type View as SubmodelView, defineView } from 'foldkit/submodel'

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

const ObservedAnchor = defineTaggedUnion({
  None: {},
  Row: {
    key: Schema.String,
    index: Schema.Number,
    viewportOffset: Schema.Number,
  },
})

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
  Anchor: { anchor: ViewportAnchor },
})

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

/** Schema for the virtual list's state. Tracks scroll position, container
 *  measurement, and any in-flight programmatic scroll. */
export const Model = Schema.Struct({
  id: Schema.String,
  rowHeightPx: Schema.Number,
  scrollTop: Schema.Number,
  measurement: Measurement,
  viewportAnchor: ViewportAnchor,
  measuredRowHeights: Schema.Record(Schema.String, Schema.Number),
  layoutVersion: Schema.Number,
  initialScroll: InitialScroll,
  endBehavior: EndBehavior,
  pendingScroll: PendingScroll,
  pendingScrollVersion: Schema.Number,
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the virtual list component can produce. */
export const Message = defineMessageUnion({
  ObservedContainerScroll: {
    scrollTop: Schema.Number,
    scrollHeight: Schema.Number,
    containerHeight: Schema.Number,
    anchor: ObservedAnchor,
  },
  ResizedContainer: {
    containerWidth: Schema.Number,
    containerHeight: Schema.Number,
  },
  MeasuredRows: {
    measurements: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        height: Schema.Number,
        layoutVersion: Schema.Number,
      }),
    ),
  },
  CompletedApplyScroll: {
    version: Schema.Number,
    outcome: ApplyScrollOutcome,
  },
})

export type Message = typeof Message.Type

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
}>

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

/** Creates an initial virtual list model from a config. The container starts
 *  in `Unmeasured` state until its Mount reports the first measurement. */
export const init = (config: InitConfig): Model => {
  const initialScroll = initialScrollFromConfig(config)

  return {
    id: config.id,
    rowHeightPx: config.rowHeightPx,
    scrollTop: config.initialScrollTop ?? 0,
    measurement: Measurement.Unmeasured(),
    viewportAnchor: ViewportAnchor.Offset({
      scrollTop: config.initialScrollTop ?? 0,
    }),
    measuredRowHeights: Record.empty(),
    layoutVersion: 0,
    initialScroll,
    endBehavior:
      config.followEnd === undefined
        ? EndBehavior.PreserveAnchor()
        : EndBehavior.Follow({
            thresholdPx: config.followEnd.thresholdPx ?? 1,
          }),
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

  return Math.max(0, targetScrollTop)
}

const renderedRows = (element: HTMLElement): ReadonlyArray<HTMLElement> =>
  pipe(
    element.children,
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
  const containerRect = element.getBoundingClientRect()
  const viewportTop = containerRect.top + element.clientTop
  const viewportBottom = viewportTop + element.clientHeight
  const maybeRow = Array.findFirst(renderedRows(element), row => {
    const rowRect = row.getBoundingClientRect()
    return rowRect.bottom > viewportTop && rowRect.top < viewportBottom
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
    viewportOffset: maybeRow.value.getBoundingClientRect().top - viewportTop,
  })
}

const maxScrollTop = (element: HTMLElement): number =>
  Math.max(0, element.scrollHeight - element.clientHeight)

const clampScrollTop = (element: HTMLElement, scrollTop: number): number =>
  Math.max(0, Math.min(scrollTop, maxScrollTop(element)))

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
  const viewportTop =
    container.getBoundingClientRect().top + container.clientTop
  const rowRect = row.getBoundingClientRect()
  const startOffset = container.scrollTop + rowRect.top - viewportTop
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
    return scrollTopForRow(
      element.scrollTop,
      element.clientHeight,
      offsets.startOffset,
      offsets.endOffset,
      alignment,
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
    Offset: ({ offset }) => Option.some(offset),
    End: () => Option.some(maxScrollTop(element)),
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
        Math.max(
          0,
          rowOffsets(element, row).startOffset - rowAnchor.viewportOffset,
        ),
      ),
    End: () => Option.some(maxScrollTop(element)),
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

export const ApplyScroll = Command.define('ApplyScroll', {
  args: {
    id: Schema.String,
    request: ScrollRequest,
    version: Schema.Number,
  },
  messages: [Message.CompletedApplyScroll],
  execute: ({ id, request, version }) =>
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

      const maybeScrollTop = scrollTopForRequest(element, request)
      if (Option.isNone(maybeScrollTop)) {
        return Message.CompletedApplyScroll({
          version,
          outcome: ApplyScrollOutcome.Skipped(),
        })
      }

      element.scrollTop = clampScrollTop(element, maybeScrollTop.value)
      return Message.CompletedApplyScroll({
        version,
        outcome: ApplyScrollOutcome.Applied({
          scrollTop: element.scrollTop,
          scrollHeight: element.scrollHeight,
          containerHeight: element.clientHeight,
          anchor: observedAnchor(element),
        }),
      })
    }),
})

type ScrollReturn = Update.Return<Model, Message>

/** Options shared by row-targeted programmatic scrolling helpers. */
export type ScrollToOptions = Readonly<{
  alignment?: ScrollAlignment
}>

const buildScrollRequest = (
  model: Model,
  request: typeof ScrollRequest.Type,
): ScrollReturn => {
  const nextVersion = Number.increment(model.pendingScrollVersion)
  return {
    model: modifyFields(model, {
      pendingScrollVersion: () => nextVersion,
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
}

const currentScrollRequest = (model: Model): typeof ScrollRequest.Type =>
  PendingScroll.match<typeof ScrollRequest.Type>(model.pendingScroll, {
    Idle: () =>
      InitialScroll.match<typeof ScrollRequest.Type>(model.initialScroll, {
        Applied: () => ScrollRequest.Anchor({ anchor: model.viewportAnchor }),
        Pending: ({ target, alignment }) =>
          ScrollRequest.Target({ target, alignment }),
      }),
    Pending: ({ request }) => request,
  })

const reconcileLayout = (model: Model): ScrollReturn =>
  buildScrollRequest(model, currentScrollRequest(model))

const anchorFromSnapshot = (
  model: Model,
  scrollTop: number,
  scrollHeight: number,
  containerHeight: number,
  anchor: typeof ObservedAnchor.Type,
): typeof ViewportAnchor.Type => {
  const distanceFromEnd = Math.max(
    0,
    scrollHeight - containerHeight - scrollTop,
  )
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
  }>,
): Model =>
  modifyFields(model, {
    scrollTop: () => snapshot.scrollTop,
    viewportAnchor: () =>
      anchorFromSnapshot(
        model,
        snapshot.scrollTop,
        snapshot.scrollHeight,
        snapshot.containerHeight,
        snapshot.anchor,
      ),
  })

const measureContainer = (
  model: Model,
  containerWidth: number,
  containerHeight: number,
): ScrollReturn => {
  const wasUnmeasured = model.measurement._tag === 'Unmeasured'
  const didWidthChange = Measurement.match<boolean>(model.measurement, {
    Unmeasured: () => false,
    Measured: measurement => measurement.containerWidth !== containerWidth,
  })
  const recordContainerMeasurement: Update.Step<
    Model,
    Message
  > = stepModel => ({
    model: modifyFields(stepModel, {
      measurement: () =>
        Measurement.Measured({ containerWidth, containerHeight }),
      measuredRowHeights: measuredRowHeights =>
        didWidthChange ? Record.empty() : measuredRowHeights,
      layoutVersion: layoutVersion =>
        didWidthChange ? Number.increment(layoutVersion) : layoutVersion,
    }),
  })

  const { initialScroll } = model
  if (initialScroll._tag === 'Pending') {
    return Update.combine(model, [
      recordContainerMeasurement,
      stepModel =>
        buildScrollRequest(
          stepModel,
          ScrollRequest.Target({
            target: initialScroll.target,
            alignment: initialScroll.alignment,
          }),
        ),
    ])
  }

  if (wasUnmeasured) {
    return recordContainerMeasurement(model)
  }

  return Update.combine(model, [recordContainerMeasurement, reconcileLayout])
}

const hasChangedMeasurement = (
  model: Model,
  measurement: Readonly<{
    key: string
    height: number
    layoutVersion: number
  }>,
): boolean => {
  if (measurement.layoutVersion !== model.layoutVersion) {
    return false
  }

  return pipe(
    model.measuredRowHeights,
    Record.get(measurement.key),
    Option.match({
      onNone: () => true,
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
  }>,
): ScrollReturn => {
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
  return Update.combine(model, [
    stepModel => ({
      model: modifyFields(stepModel, {
        measuredRowHeights: () => measuredRowHeights,
      }),
    }),
    reconcileLayout,
  ])
}

/** Processes a VirtualList Message and returns the next Model and optional Commands. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ObservedContainerScroll: snapshot => {
      const nextPendingScrollVersion = PendingScroll.match<number>(
        model.pendingScroll,
        {
          Idle: () => model.pendingScrollVersion,
          Pending: () => Number.increment(model.pendingScrollVersion),
        },
      )
      return {
        model: modifyFields(applyScrollSnapshot(model, snapshot), {
          initialScroll: () => InitialScroll.Applied(),
          pendingScroll: () => PendingScroll.Idle(),
          pendingScrollVersion: () => nextPendingScrollVersion,
        }),
      }
    },

    ResizedContainer: ({ containerWidth, containerHeight }) =>
      measureContainer(model, containerWidth, containerHeight),

    MeasuredRows: ({ measurements }) =>
      applyRowMeasurements(model, measurements),

    CompletedApplyScroll: ({ version, outcome }) => {
      if (version !== model.pendingScrollVersion) {
        return { model }
      }

      return ApplyScrollOutcome.match<ScrollReturn>(outcome, {
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

type RowOffsets = Readonly<{
  startOffset: number
  endOffset: number
}>

/** Programmatically scrolls to a logical target. */
export const scrollTo = (
  model: Model,
  target: ScrollTarget,
  options: ScrollToOptions = {},
): ScrollReturn =>
  Update.combine(model, [
    stepModel => ({
      model: modifyFields(stepModel, {
        initialScroll: () => InitialScroll.Applied(),
      }),
    }),
    stepModel =>
      buildScrollRequest(
        stepModel,
        ScrollRequest.Target({
          target,
          alignment: options.alignment ?? 'Start',
        }),
      ),
  ])

/** Programmatically scrolls the container so the row at `index` is visible.
 *  The next view resolves the logical index with its current sizing mode, and
 *  the Command aligns the live rendered row. */
export const scrollToIndex = (
  model: Model,
  index: number,
  options: ScrollToOptions = {},
): ScrollReturn => scrollTo(model, ScrollTarget.Index({ index }), options)

/** Programmatically scrolls to the row whose `itemToKey` result matches
 *  `key`. The next view resolves the key against its current items. */
export const scrollToKey = (
  model: Model,
  key: string,
  options: ScrollToOptions = {},
): ScrollReturn => scrollTo(model, ScrollTarget.Key({ key }), options)

/** Programmatically scrolls to an exact pixel offset from the start of the
 *  list. Negative offsets clamp to zero. */
export const scrollToOffset = (model: Model, offset: number): ScrollReturn =>
  scrollTo(model, ScrollTarget.Offset({ offset }))

/** Programmatically scrolls to the end of the list. */
export const scrollToEnd = (model: Model): ScrollReturn =>
  scrollTo(model, ScrollTarget.End())

/** Notifies VirtualList that its parent-owned items changed. The next view
 *  resolves the stored stable-key anchor against the new items, and the
 *  Command restores that anchor after the DOM patch. */
export const informItemsChanged = (
  model: Model,
  itemKeys: ReadonlyArray<string>,
): ScrollReturn => {
  const currentKeys = HashSet.fromIterable(itemKeys)
  return Update.combine(model, [
    stepModel => ({
      model: modifyFields(stepModel, {
        measuredRowHeights: Record.filter((_, key) =>
          HashSet.has(currentKeys, key),
        ),
        layoutVersion: Number.increment,
      }),
    }),
    reconcileLayout,
  ])
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
  const heights = Array.map(items, itemToRowHeightPx)
  return Array.scan(heights, 0, (cumulative, height) => cumulative + height)
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

type ListLayout = Readonly<{
  maybeCumulativeOffsets: Option.Option<ReadonlyArray<number>>
  rowHeightPx: number
  totalHeight: number
  leadingInset: number
  containerHeight: number
  maxScrollTop: number
}>

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
  const leadingInset =
    contentAlignment === 'End' ? Math.max(0, containerHeight - totalHeight) : 0
  return {
    maybeCumulativeOffsets,
    rowHeightPx: model.rowHeightPx,
    totalHeight,
    leadingInset,
    containerHeight,
    maxScrollTop: Math.max(0, leadingInset + totalHeight - containerHeight),
  }
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

const alignedLayoutScrollTop = (
  model: Model,
  layout: ListLayout,
  offsets: RowOffsets,
  alignment: ScrollAlignment,
): number =>
  clampLayoutScrollTop(
    layout,
    scrollTopForRow(
      model.scrollTop,
      layout.containerHeight,
      offsets.startOffset,
      offsets.endOffset,
      alignment,
    ),
  )

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
    End: () => Option.some(layout.maxScrollTop),
  })

const scrollTopForLayoutAnchor = <Item>(
  layout: ListLayout,
  items: ReadonlyArray<Item>,
  itemToKey: (item: Item, index: number) => string,
  anchor: typeof ViewportAnchor.Type,
): number =>
  ViewportAnchor.match<number>(anchor, {
    Offset: ({ scrollTop }) => clampLayoutScrollTop(layout, scrollTop),
    Row: ({ key, index, viewportOffset }) => {
      const anchorIndex = Option.getOrElse(
        indexForKey(items, itemToKey, key),
        () => index,
      )
      const maybeOffsets = rowOffsetsForIndex(layout, items.length, anchorIndex)
      return Option.match(maybeOffsets, {
        onNone: () => 0,
        onSome: offsets =>
          clampLayoutScrollTop(layout, offsets.startOffset - viewportOffset),
      })
    },
    End: () => layout.maxScrollTop,
  })

const scrollTopForView = <Item>(
  model: Model,
  layout: ListLayout,
  items: ReadonlyArray<Item>,
  itemToKey: (item: Item, index: number) => string,
): number =>
  PendingScroll.match<number>(model.pendingScroll, {
    Idle: () => clampLayoutScrollTop(layout, model.scrollTop),
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
            () => clampLayoutScrollTop(layout, model.scrollTop),
          ),
        Anchor: ({ anchor }) =>
          scrollTopForLayoutAnchor(layout, items, itemToKey, anchor),
      }),
  })

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
    onSome: cumulativeOffsets =>
      pipe(
        cumulativeOffsets,
        Array.findFirstIndex(Number.isGreaterThan(contentScrollTop)),
        Option.match({
          onNone: () => itemCount,
          onSome: index => Math.max(0, index - 1),
        }),
      ),
  })
  const lastVisibleIndex = Option.match(layout.maybeCumulativeOffsets, {
    onNone: () => Math.ceil(contentViewportEnd / layout.rowHeightPx),
    onSome: cumulativeOffsets =>
      pipe(
        cumulativeOffsets,
        Array.findFirstIndex(Number.isGreaterThanOrEqualTo(contentViewportEnd)),
        Option.getOrElse(() => itemCount),
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
  if (key === null || Option.isNone(layoutVersion)) {
    return Option.none()
  }

  return Option.some({
    key,
    height: entry.target.getBoundingClientRect().height,
    layoutVersion: layoutVersion.value,
  })
}

type ObserveVirtualListMessage =
  | typeof Message.ObservedContainerScroll.Type
  | typeof Message.ResizedContainer.Type
  | typeof Message.MeasuredRows.Type

const observeVirtualList = (
  element: Element,
  id: string,
): Stream.Stream<ObserveVirtualListMessage> =>
  Stream.callback<ObserveVirtualListMessage>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        if (!(element instanceof HTMLElement)) {
          return () => undefined
        }

        const emitContainerMeasurement = () =>
          Queue.offerUnsafe(
            queue,
            Message.ResizedContainer({
              containerWidth: element.clientWidth,
              containerHeight: element.clientHeight,
            }),
          )

        emitContainerMeasurement()

        const scrollListener = () =>
          Queue.offerUnsafe(
            queue,
            Message.ObservedContainerScroll({
              scrollTop: element.scrollTop,
              scrollHeight: element.scrollHeight,
              containerHeight: element.clientHeight,
              anchor: observedAnchor(element),
            }),
          )
        element.addEventListener('scroll', scrollListener, { passive: true })

        const containerResizeObserver = new ResizeObserver(entries => {
          const lastEntry = Array.last(entries)
          if (Option.isSome(lastEntry)) {
            Queue.offerUnsafe(
              queue,
              Message.ResizedContainer({
                containerWidth: lastEntry.value.contentRect.width,
                containerHeight: lastEntry.value.contentRect.height,
              }),
            )
          }
        })
        containerResizeObserver.observe(element)

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
          element.removeEventListener('scroll', scrollListener)
        }
      }),
      cleanup => Effect.sync(cleanup),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/** Container-owned Mount that tracks scrolling, container resizing, and
 *  rendered row measurements for dynamic-height lists. */
export const ObserveVirtualList = Mount.defineStream('ObserveVirtualList', {
  args: { id: Schema.String },
  messages: [
    Message.ObservedContainerScroll,
    Message.ResizedContainer,
    Message.MeasuredRows,
  ],
  execute: ({ element, id, viewStateChanges }) =>
    viewStateChanges.pipe(
      Stream.switchMap(viewState =>
        viewState === 'Live' ? observeVirtualList(element, id) : Stream.never,
      ),
    ),
})

// VIEW

const DEFAULT_OVERSCAN = 5

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *
 *  VirtualList owns scroll and resize observation through a Mount on its
 *  container. Dynamic rows are measured by the same lifecycle owner. */
type BaseViewInputs<Item> = Readonly<{
  items: ReadonlyArray<Item>
  itemToKey: (item: Item, index: number) => string
  itemToView: (item: Item, index: number) => Html
  overscan?: number
  rowElement?: Exclude<TagName, 'textarea'>
  containerClassName?: string
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

export type ViewInputs<Item> = BaseViewInputs<Item> & RowHeightInputs<Item>

/** Renders a virtualized list. Only items inside the viewport (plus an
 *  overscan buffer) are mounted; spacer elements above and below the
 *  slice keep the scrollbar's apparent total height correct.
 *
 *  Generic over `Item`: call as `VirtualList.view<MyItem>()` at the
 *  embed site to get a `SubmodelView` typed for your item type. The
 *  underlying view implementation is shared; the call only narrows the
 *  type. */
type ViewForItem<Item> = SubmodelView<Model, Message, ViewInputs<Item>>

export const view = <Item>() =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  viewImpl as unknown as ViewForItem<Item>

const viewImpl = defineView<Model, Message, ViewInputs<unknown>>(
  (model, viewInputs, h) => {
    const {
      items,
      itemToKey,
      itemToView,
      itemToRowHeightPx,
      dynamicRowHeights,
      itemToEstimatedRowHeightPx,
      overscan = DEFAULT_OVERSCAN,
      rowElement = 'li',
      containerClassName,
      containerAttributes = [],
      contentAlignment = 'Start',
    } = viewInputs

    const baseContainerAttributes = [
      h.Id(model.id),
      h.Role('list'),
      h.DataAttribute(
        'virtual-list-scroll-version',
        String(model.pendingScrollVersion),
      ),
      h.OnMount(ObserveVirtualList({ id: model.id })),
      h.Style({
        overflow: 'auto',
        'overflow-anchor': 'none',
        'list-style': 'none',
        margin: '0',
        padding: '0',
      }),
      ...(containerClassName !== undefined
        ? [h.Class(containerClassName)]
        : []),
    ]

    const allContainerAttributes = [
      ...childAttributes(baseContainerAttributes),
      ...containerAttributes,
    ]

    const renderContainer = (children: ReadonlyArray<Html>): Html =>
      h.keyed('ul')(model.id, allContainerAttributes, children)

    const layout = listLayout(
      model,
      items,
      itemToKey,
      itemToRowHeightPx,
      dynamicRowHeights,
      itemToEstimatedRowHeightPx,
      contentAlignment,
    )
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

        const topSpacer = h.keyed('li')(`${model.id}-top-spacer`, [
          h.Role('presentation'),
          h.Style({ height: `${topSpacerHeight}px` }),
        ])

        const bottomSpacer = h.keyed('li')(`${model.id}-bottom-spacer`, [
          h.Role('presentation'),
          h.Style({ height: `${bottomSpacerHeight}px` }),
        ])

        const renderedRows = Array.map(visibleItems, (item, sliceIndex) => {
          const dataIndex = startIndex + sliceIndex
          const key = itemToKey(item, dataIndex)
          const rowHeight =
            offsetAt(layout, dataIndex + 1) - offsetAt(layout, dataIndex)
          const rowSizingAttributes =
            dynamicRowHeights === undefined
              ? [
                  h.Style({
                    height: `${rowHeight}px`,
                    display: 'grid',
                  }),
                ]
              : [
                  h.DataAttribute('virtual-list-measure', 'true'),
                  h.DataAttribute(
                    'virtual-list-layout-version',
                    String(model.layoutVersion),
                  ),
                  h.Style({ display: 'grid' }),
                ]
          return h.keyed(rowElement)(
            key,
            [
              h.Role('listitem'),
              h.DataAttribute('virtual-list-item-key', key),
              h.DataAttribute('virtual-list-item-index', String(dataIndex)),
              h.AriaSetsize(items.length),
              h.AriaPosinset(dataIndex + 1),
              ...rowSizingAttributes,
            ],
            [itemToView(item, dataIndex)],
          )
        })

        return renderContainer([topSpacer, ...renderedRows, bottomSpacer])
      },
    })
  },
)
