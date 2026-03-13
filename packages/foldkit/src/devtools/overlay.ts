import { clsx } from 'clsx'
import {
  Array as Array_,
  Effect,
  HashSet,
  Match,
  Option,
  Predicate,
  Schema,
  Stream,
  SubscriptionRef,
  pipe,
} from 'effect'

import type { Command } from '../command'
import { type Html, html } from '../html'
import { m } from '../message'
import { makeElement } from '../runtime/runtime'
import { makeSubscriptions } from '../runtime/subscription'
import { evo } from '../struct'
import * as Tabs from '../ui/tabs'
import { overlayStyles } from './overlay-styles'
import { type DevtoolsStore, INIT_INDEX, type StoreState } from './store'

// MODEL

const DisplayEntry = Schema.Struct({
  tag: Schema.String,
  commandCount: Schema.Number,
  timestamp: Schema.Number,
  isModelChanged: Schema.Boolean,
})

const INSPECTOR_TABS_ID = 'dt-inspector'

const InspectorTabsModel = Schema.Struct({
  id: Schema.String,
  activeIndex: Schema.Number,
  focusedIndex: Schema.Number,
  activationMode: Schema.Literal('Automatic', 'Manual'),
})

const Model = Schema.Struct({
  isOpen: Schema.Boolean,
  entries: Schema.Array(DisplayEntry),
  startIndex: Schema.Number,
  isPaused: Schema.Boolean,
  pausedAtIndex: Schema.Number,
  maybeInspectedModel: Schema.OptionFromSelf(Schema.Unknown),
  maybeInspectedMessage: Schema.OptionFromSelf(Schema.Unknown),
  expandedPaths: Schema.HashSetFromSelf(Schema.String),
  changedPaths: Schema.HashSetFromSelf(Schema.String),
  affectedPaths: Schema.HashSetFromSelf(Schema.String),
  inspectorTabs: InspectorTabsModel,
})
type Model = typeof Model.Type

// MESSAGE

const ClickedToggle = m('ClickedToggle')
const ClickedRow = m('ClickedRow', { index: Schema.Number })
const ClickedResume = m('ClickedResume')
const ClickedClear = m('ClickedClear')
const CompletedSideEffect = m('CompletedSideEffect')
const ReceivedInspectedState = m('ReceivedInspectedState', {
  model: Schema.Unknown,
  maybeMessage: Schema.OptionFromSelf(Schema.Unknown),
  changedPaths: Schema.HashSetFromSelf(Schema.String),
  affectedPaths: Schema.HashSetFromSelf(Schema.String),
})
const ToggledTreeNode = m('ToggledTreeNode', { path: Schema.String })
const GotInspectorTabsMessage = m('GotInspectorTabsMessage', {
  message: Schema.Unknown,
})
const ReceivedStoreUpdate = m('ReceivedStoreUpdate', {
  entries: Schema.Array(DisplayEntry),
  startIndex: Schema.Number,
  isPaused: Schema.Boolean,
  pausedAtIndex: Schema.Number,
})

const Message = Schema.Union(
  ClickedToggle,
  ClickedRow,
  ClickedResume,
  ClickedClear,
  CompletedSideEffect,
  ReceivedInspectedState,
  ToggledTreeNode,
  GotInspectorTabsMessage,
  ReceivedStoreUpdate,
)
type Message = typeof Message.Type

// HELPERS

const MILLIS_PER_SECOND = 1000
const TREE_INDENT_PX = 12
const MAX_PREVIEW_KEYS = 3

const formatTimeDelta = (deltaMs: number): string =>
  deltaMs === 0
    ? '0ms'
    : deltaMs < MILLIS_PER_SECOND
      ? `+${Math.round(deltaMs)}ms`
      : `+${(deltaMs / MILLIS_PER_SECOND).toFixed(1)}s`

const MESSAGE_LIST_SELECTOR = '.message-list'

const toDisplayEntries = ({ entries }: StoreState) =>
  Array_.map(entries, ({ tag, commandCount, timestamp, isModelChanged }) => ({
    tag,
    commandCount,
    timestamp,
    isModelChanged,
  }))

const toDisplayState = (state: StoreState) => ({
  entries: toDisplayEntries(state),
  startIndex: state.startIndex,
  isPaused: state.isPaused,
  pausedAtIndex: state.pausedAtIndex,
})

const isExpandable = (value: unknown): boolean =>
  value !== null && typeof value === 'object'

const Tagged = Schema.Struct({ _tag: Schema.String })
const isTagged = Schema.is(Tagged)

const objectPreview = (value: Record<string, unknown>): string => {
  const keys = Object.keys(value).filter(key => key !== '_tag')
  if (Array_.isEmptyArray(keys)) {
    return '{}'
  }
  const preview = keys.slice(0, MAX_PREVIEW_KEYS).join(', ')
  return keys.length > MAX_PREVIEW_KEYS ? `{ ${preview}, … }` : `{ ${preview} }`
}

const collapsedPreview = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `(${value.length})`
  }
  if (typeof value === 'object' && value !== null) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return objectPreview(value as Record<string, unknown>)
  }
  return ''
}

// DIFF

type DiffResult = Readonly<{
  changedPaths: HashSet.HashSet<string>
  affectedPaths: HashSet.HashSet<string>
}>

const emptyDiff: DiffResult = {
  changedPaths: HashSet.empty(),
  affectedPaths: HashSet.empty(),
}

const computeDiff = (previous: unknown, current: unknown): DiffResult => {
  const changed = new Set<string>()

  const walk = (prev: unknown, curr: unknown, path: string): void => {
    if (prev === curr) {
      return
    }

    if (!isExpandable(curr) || !isExpandable(prev)) {
      changed.add(path)
      return
    }

    const currIsArray = Array.isArray(curr)
    const prevIsArray = Array.isArray(prev)

    if (currIsArray !== prevIsArray) {
      changed.add(path)
      return
    }

    if (currIsArray) {
      /* eslint-disable @typescript-eslint/consistent-type-assertions */
      walkArray(
        prev as ReadonlyArray<unknown>,
        curr as ReadonlyArray<unknown>,
        path,
      )
    } else {
      walkObject(
        prev as Record<string, unknown>,
        curr as Record<string, unknown>,
        path,
      )
      /* eslint-enable @typescript-eslint/consistent-type-assertions */
    }
  }

  const walkObject = (
    prev: Record<string, unknown>,
    curr: Record<string, unknown>,
    path: string,
  ): void => {
    Object.keys(curr).forEach(key => {
      const childPath = `${path}.${key}`
      if (key in prev) {
        walk(prev[key], curr[key], childPath)
      } else {
        changed.add(childPath)
      }
    })
  }

  const walkArray = (
    prev: ReadonlyArray<unknown>,
    curr: ReadonlyArray<unknown>,
    path: string,
  ): void => {
    const prevRefToIndex = new Map(
      prev.map((item, index) => [item, index] as const),
    )

    curr.forEach((item, index) => {
      const childPath = `${path}.${index}`
      const prevIndex = prevRefToIndex.get(item)

      if (prevIndex === undefined || prevIndex !== index) {
        changed.add(childPath)
      }
    })
  }

  walk(previous, current, 'root')

  const affected = new Set(changed)
  const addAncestors = (path: string): void => {
    const lastDot = path.lastIndexOf('.')
    if (lastDot !== -1) {
      const parent = path.substring(0, lastDot)
      if (!affected.has(parent)) {
        affected.add(parent)
        addAncestors(parent)
      }
    }
  }
  changed.forEach(addAncestors)

  return {
    changedPaths: HashSet.fromIterable(changed),
    affectedPaths: HashSet.fromIterable(affected),
  }
}

// UPDATE

const makeUpdate = (store: DevtoolsStore, shadow: ShadowRoot) => {
  const jumpTo = (index: number): Command<typeof CompletedSideEffect> =>
    Effect.gen(function* () {
      yield* store.jumpTo(index)
      return CompletedSideEffect()
    })

  const inspectState = (
    index: number,
  ): Command<typeof ReceivedInspectedState> =>
    Effect.gen(function* () {
      const model = yield* store.getModelAtIndex(index)
      const maybeMessage = yield* store.getMessageAtIndex(index)

      const diff =
        index === INIT_INDEX
          ? emptyDiff
          : yield* pipe(
              store.getModelAtIndex(index - 1),
              Effect.map(previousModel => computeDiff(previousModel, model)),
              Effect.catchAll(() => Effect.succeed(emptyDiff)),
            )

      return ReceivedInspectedState({ model, maybeMessage, ...diff })
    })

  const inspectLatest: Command<typeof ReceivedInspectedState> = Effect.gen(
    function* () {
      const state = yield* SubscriptionRef.get(store.stateRef)
      const latestIndex =
        state.entries.length === 0
          ? INIT_INDEX
          : state.startIndex + state.entries.length - 1

      return yield* inspectState(latestIndex)
    },
  )

  const resume = Effect.gen(function* () {
    yield* store.resume
    return CompletedSideEffect()
  })

  const clear = Effect.gen(function* () {
    yield* store.clear
    return CompletedSideEffect()
  })

  const scrollToBottom = Effect.sync(() => {
    const messageList = shadow.querySelector(MESSAGE_LIST_SELECTOR)
    if (messageList instanceof HTMLElement) {
      messageList.scrollTop = messageList.scrollHeight
    }
    return CompletedSideEffect()
  })

  return (
    model: Model,
    message: Message,
  ): [Model, ReadonlyArray<Command<Message>>] =>
    Match.value(message).pipe(
      Match.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
      Match.tagsExhaustive({
        ClickedToggle: () => [
          evo(model, {
            isOpen: isOpen => !isOpen,
          }),
          [],
        ],
        ClickedRow: ({ index }) => [
          model,
          [jumpTo(index), inspectState(index)],
        ],
        ClickedResume: () => [
          evo(model, {
            expandedPaths: () => HashSet.empty<string>(),
            changedPaths: () => HashSet.empty<string>(),
            affectedPaths: () => HashSet.empty<string>(),
          }),
          [resume, inspectLatest],
        ],
        ClickedClear: () => [
          evo(model, {
            maybeInspectedModel: () => Option.none(),
            maybeInspectedMessage: () => Option.none(),
            expandedPaths: () => HashSet.empty<string>(),
            changedPaths: () => HashSet.empty<string>(),
            affectedPaths: () => HashSet.empty<string>(),
          }),
          [clear],
        ],
        CompletedSideEffect: () => [model, []],
        ReceivedInspectedState: ({
          model: inspectedModel,
          maybeMessage,
          changedPaths,
          affectedPaths,
        }) => [
          evo(model, {
            maybeInspectedModel: () => Option.some(inspectedModel),
            maybeInspectedMessage: () => maybeMessage,
            changedPaths: () => changedPaths,
            affectedPaths: () => affectedPaths,
          }),
          [],
        ],
        GotInspectorTabsMessage: ({ message: tabsMessage }) => {
          const [nextTabsModel, tabsCommands] = Tabs.update(
            model.inspectorTabs,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            tabsMessage as Tabs.Message,
          )

          return [
            evo(model, {
              inspectorTabs: () => nextTabsModel,
            }),
            tabsCommands.map(
              Effect.map(innerMessage =>
                GotInspectorTabsMessage({ message: innerMessage }),
              ),
            ),
          ]
        },
        ToggledTreeNode: ({ path }) => [
          evo(model, {
            expandedPaths: paths => HashSet.toggle(paths, path),
          }),
          [],
        ],
        ReceivedStoreUpdate: ({
          entries,
          startIndex,
          isPaused,
          pausedAtIndex,
        }) => {
          const liveCommands = isPaused ? [] : [scrollToBottom, inspectLatest]

          return [
            evo(model, {
              entries: () => [...entries],
              startIndex: () => startIndex,
              isPaused: () => isPaused,
              pausedAtIndex: () => pausedAtIndex,
            }),
            liveCommands,
          ]
        },
      }),
    )
}

// SUBSCRIPTION

const SubscriptionDeps = Schema.Struct({
  storeUpdates: Schema.Null,
})

const makeOverlaySubscriptions = (store: DevtoolsStore) =>
  makeSubscriptions(SubscriptionDeps)<Model, Message>({
    storeUpdates: {
      modelToDependencies: () => null,
      depsToStream: () =>
        Stream.concat(
          Stream.make(
            pipe(
              SubscriptionRef.get(store.stateRef),
              Effect.map(state => ReceivedStoreUpdate(toDisplayState(state))),
            ),
          ),
          pipe(
            store.stateRef.changes,
            Stream.map(state =>
              Effect.succeed(ReceivedStoreUpdate(toDisplayState(state))),
            ),
          ),
        ),
    },
  })

// VIEW

const indexClass = 'text-2xs text-dt-muted font-mono min-w-5'

const headerButtonClass =
  'dt-header-button bg-transparent border-none text-dt-muted cursor-pointer text-base font-mono transition-colors'

const ROW_BASE =
  'dt-row flex items-center py-1 px-1 cursor-pointer gap-1.5 transition-colors border-l-3 border-b'

const makeView = (): ((model: Model) => Html) => {
  const {
    div,
    span,
    button,
    svg,
    path,
    Class,
    Style,
    OnClick,
    AriaHidden,
    Xmlns,
    Fill,
    ViewBox,
    StrokeWidth,
    Stroke,
    StrokeLinecap,
    StrokeLinejoin,
    D,
  } = html<Message>()

  // JSON TREE

  const leafValueView = (value: unknown): Html =>
    Match.value(value).pipe(
      Match.when(Predicate.isNull, () =>
        span([Class('json-null italic')], ['null']),
      ),
      Match.when(Predicate.isUndefined, () =>
        span([Class('json-null italic')], ['undefined']),
      ),
      Match.when(Predicate.isString, stringValue =>
        span([Class('json-string')], [`"${stringValue}"`]),
      ),
      Match.when(Predicate.isNumber, numberValue =>
        span([Class('json-number')], [String(numberValue)]),
      ),
      Match.when(Predicate.isBoolean, booleanValue =>
        span([Class('json-boolean')], [String(booleanValue)]),
      ),
      Match.orElse(unknownValue =>
        span([Class('json-null')], [String(unknownValue)]),
      ),
    )

  const keyView = (key: string): Html =>
    span([Class('json-key')], [`${key}:\u00a0`])

  const CHEVRON_RIGHT = 'M8.25 4.5l7.5 7.5-7.5 7.5'
  const CHEVRON_DOWN = 'M19.5 8.25l-7.5 7.5-7.5-7.5'

  const arrowView = (isExpanded: boolean): Html =>
    svg(
      [
        AriaHidden(true),
        Class('json-arrow shrink-0'),
        Xmlns('http://www.w3.org/2000/svg'),
        Fill('none'),
        ViewBox('0 0 24 24'),
        StrokeWidth('2'),
        Stroke('currentColor'),
      ],
      [
        path(
          [
            StrokeLinecap('round'),
            StrokeLinejoin('round'),
            D(isExpanded ? CHEVRON_DOWN : CHEVRON_RIGHT),
          ],
          [],
        ),
      ],
    )

  const tagLabelView = (tag: string): Html => span([Class('json-tag')], [tag])

  const diffDotView: Html = span([Class('diff-dot')], [])
  const inlineDiffDotView: Html = span([Class('diff-dot-inline')], [])

  type FlatNode = Readonly<{
    value: unknown
    treePath: string
    depth: number
    maybeKey: Option.Option<string>
    isExpandable: boolean
    isExpanded: boolean
    isChanged: boolean
    isAffected: boolean
    maybeTag: Option.Option<string>
  }>

  const flattenTree = (
    value: unknown,
    treePath: string,
    expandedPaths: HashSet.HashSet<string>,
    changedPaths: HashSet.HashSet<string>,
    affectedPaths: HashSet.HashSet<string>,
    depth: number,
    maybeKey: Option.Option<string>,
    accumulator: Array<FlatNode>,
  ): void => {
    const isRoot = treePath === 'root'
    const nodeIsExpandable = isExpandable(value)
    const isExpanded =
      nodeIsExpandable && (isRoot || HashSet.has(expandedPaths, treePath))
    const maybeTag = nodeIsExpandable
      ? pipe(
          Option.liftPredicate(value, isTagged),
          Option.map(tagged => tagged._tag),
        )
      : Option.none()

    accumulator.push({
      value,
      treePath,
      depth,
      maybeKey,
      isExpandable: nodeIsExpandable,
      isExpanded,
      isChanged: HashSet.has(changedPaths, treePath),
      isAffected: HashSet.has(affectedPaths, treePath),
      maybeTag,
    })

    if (!isExpanded) {
      return
    }

    if (Array.isArray(value)) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      ;(value as ReadonlyArray<unknown>).forEach((item, arrayIndex) =>
        flattenTree(
          item,
          `${treePath}.${arrayIndex}`,
          expandedPaths,
          changedPaths,
          affectedPaths,
          depth + 1,
          Option.some(String(arrayIndex)),
          accumulator,
        ),
      )
    } else {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== '_tag')
        .forEach(([key, childValue]) =>
          flattenTree(
            childValue,
            `${treePath}.${key}`,
            expandedPaths,
            changedPaths,
            affectedPaths,
            depth + 1,
            Option.some(key),
            accumulator,
          ),
        )
    }
  }

  const flatNodeView = (node: FlatNode): Html => {
    const indent = Style({ paddingLeft: `${node.depth * TREE_INDENT_PX}px` })
    const hasDiffDot = node.isChanged || node.isAffected

    if (!node.isExpandable) {
      return div(
        [
          Class(
            clsx(
              'tree-row flex items-center gap-px font-mono text-2xs',
              node.isChanged && 'diff-changed',
            ),
          ),
          indent,
        ],
        [
          ...(hasDiffDot ? [diffDotView] : []),
          ...Option.toArray(Option.map(node.maybeKey, keyView)),
          leafValueView(node.value),
        ],
      )
    }

    const nodeIsArray = Array.isArray(node.value)
    const isRoot = node.treePath === 'root'

    return div(
      [
        Class(
          clsx(
            'tree-row flex items-center gap-px font-mono text-2xs',
            !isRoot && 'tree-row-expandable cursor-pointer',
            node.isChanged && 'diff-changed',
          ),
        ),
        indent,
        ...(isRoot ? [] : [OnClick(ToggledTreeNode({ path: node.treePath }))]),
      ],
      [
        ...(isRoot ? [] : [arrowView(node.isExpanded)]),
        ...(!isRoot && hasDiffDot ? [diffDotView] : []),
        ...Option.toArray(Option.map(node.maybeKey, keyView)),
        ...Option.toArray(Option.map(node.maybeTag, tagLabelView)),
        span(
          [Class('json-preview')],
          [
            node.isExpanded
              ? nodeIsArray
                ? /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  `(${(node.value as ReadonlyArray<unknown>).length})`
                : ''
              : collapsedPreview(node.value),
          ],
        ),
      ],
    )
  }

  const treeView = (
    value: unknown,
    rootPath: string,
    expandedPaths: HashSet.HashSet<string>,
    changedPaths: HashSet.HashSet<string>,
    affectedPaths: HashSet.HashSet<string>,
    maybeRootLabel: Option.Option<string>,
  ): Html => {
    const nodes: Array<FlatNode> = []
    flattenTree(
      value,
      rootPath,
      expandedPaths,
      changedPaths,
      affectedPaths,
      0,
      maybeRootLabel,
      nodes,
    )

    return div(
      [Class('inspector-tree flex-1 overflow-y-auto min-h-0 min-w-0')],
      nodes.map(flatNodeView),
    )
  }

  const inspectedTimestamp = (model: Model): string => {
    const selectedIndex = model.isPaused
      ? model.pausedAtIndex
      : model.entries.length === 0
        ? INIT_INDEX
        : model.startIndex + model.entries.length - 1

    if (selectedIndex === INIT_INDEX) {
      return '0ms'
    }

    const baseTimestamp = Option.match(Array_.head(model.entries), {
      onNone: () => 0,
      onSome: first => first.timestamp,
    })

    return pipe(
      Array_.get(model.entries, selectedIndex - model.startIndex),
      Option.map(entry => {
        const delta = entry.timestamp - baseTimestamp
        return delta < MILLIS_PER_SECOND
          ? `+${delta.toFixed(2)}ms`
          : `+${(delta / MILLIS_PER_SECOND).toFixed(3)}s`
      }),
      Option.getOrElse(() => ''),
    )
  }

  const emptyInspectorView: Html = div(
    [
      Class(
        'flex-1 flex items-center justify-center text-dt-muted text-2xs font-mono italic min-w-0',
      ),
    ],
    ['Click a message to inspect'],
  )

  const INSPECTOR_TABS = ['Model', 'Message'] as const

  const inspectorPaneView = (model: Model): Html =>
    div(
      [Class('flex flex-col border-l min-w-0 flex-1')],
      [
        Tabs.view<Message, (typeof INSPECTOR_TABS)[number]>({
          model: model.inspectorTabs,
          toMessage: tabsMessage =>
            GotInspectorTabsMessage({ message: tabsMessage }),
          tabs: INSPECTOR_TABS,
          className: 'flex flex-col flex-1 min-h-0',
          tabListClassName: 'flex border-b shrink-0',
          tabToConfig: (tab, { isActive }) => ({
            buttonClassName: clsx(
              'dt-tab-button cursor-pointer text-base font-mono px-3 py-1',
              isActive ? 'text-dt' : 'text-dt-muted',
            ),
            buttonContent: span([], [tab]),
            panelClassName: 'flex flex-col flex-1 min-h-0',
            panelContent: Option.match(model.maybeInspectedModel, {
              onNone: () => emptyInspectorView,
              onSome: inspectedModel =>
                tab === 'Model'
                  ? treeView(
                      inspectedModel,
                      'root',
                      model.expandedPaths,
                      model.changedPaths,
                      model.affectedPaths,
                      Option.none(),
                    )
                  : Option.match(model.maybeInspectedMessage, {
                      onNone: () =>
                        div(
                          [
                            Class(
                              'flex-1 flex items-center justify-center text-dt-muted text-2xs font-mono italic min-w-0',
                            ),
                          ],
                          ['Init — no message'],
                        ),
                      onSome: message =>
                        div(
                          [Class('flex flex-col flex-1 min-h-0')],
                          [
                            div(
                              [
                                Class(
                                  'px-2 py-1 border-b text-2xs text-dt-muted font-mono shrink-0',
                                ),
                              ],
                              [inspectedTimestamp(model)],
                            ),
                            div(
                              [Class('flex-1 min-h-0 pt-1 pl-1')],
                              [
                                treeView(
                                  message,
                                  'root',
                                  model.expandedPaths,
                                  HashSet.empty(),
                                  HashSet.empty(),
                                  Option.none(),
                                ),
                              ],
                            ),
                          ],
                        ),
                    }),
            }),
          }),
        }),
      ],
    )

  // MESSAGE LIST

  const badgeView = (model: Model): Html =>
    button(
      [
        Class(
          clsx(
            'fixed bottom-4 right-4 w-14 h-14 rounded-full bg-dt-bg text-dt cursor-pointer flex items-center justify-center font-mono font-semibold outline-none dt-badge',
            model.isPaused ? 'dt-badge-paused' : 'dt-badge-accent',
          ),
        ),
        OnClick(ClickedToggle()),
      ],
      [
        model.isOpen
          ? svg(
              [
                AriaHidden(true),
                Class('w-5 h-5'),
                Xmlns('http://www.w3.org/2000/svg'),
                Fill('none'),
                ViewBox('0 0 24 24'),
                StrokeWidth('1.5'),
                Stroke('currentColor'),
              ],
              [
                path(
                  [
                    StrokeLinecap('round'),
                    StrokeLinejoin('round'),
                    D('M6 18L18 6M6 6l12 12'),
                  ],
                  [],
                ),
              ],
            )
          : span([Class('text-base')], [String(model.entries.length)]),
      ],
    )

  const headerView = (model: Model): Html =>
    model.isPaused
      ? div(
          [
            Class(
              'flex items-center justify-between px-3 py-1.5 border-b shrink-0',
            ),
          ],
          [
            button(
              [
                Class(
                  'dt-resume-button bg-transparent border-none text-dt-live cursor-pointer text-base font-mono font-medium',
                ),
                OnClick(ClickedResume()),
              ],
              ['Resume →'],
            ),
            span(
              [Class('text-base text-dt-paused font-mono')],
              [
                model.pausedAtIndex === INIT_INDEX
                  ? 'Paused at init'
                  : `Paused at message ${model.pausedAtIndex + 1}`,
              ],
            ),
            button(
              [Class(headerButtonClass), OnClick(ClickedClear())],
              ['Clear history'],
            ),
          ],
        )
      : div(
          [
            Class(
              'flex items-center justify-between px-3 py-1.5 border-b shrink-0',
            ),
          ],
          [
            span(
              [Class('text-base text-dt-live font-medium font-mono')],
              ['Live'],
            ),
            button(
              [Class(headerButtonClass), OnClick(ClickedClear())],
              ['Clear history'],
            ),
          ],
        )

  const initRowView = (isSelected: boolean, isPausedHere: boolean): Html =>
    div(
      [
        Class(clsx(ROW_BASE, isSelected && 'selected')),
        OnClick(ClickedRow({ index: INIT_INDEX })),
      ],
      [
        span([Class('pause-column')], isPausedHere ? [pauseIconView] : []),
        span([Class('dot-column')], []),
        span([Class(indexClass)], []),
        span([Class('text-base text-dt-muted font-mono')], ['Init']),
      ],
    )

  const pauseIconView: Html = svg(
    [
      AriaHidden(true),
      Class('dt-pause-icon'),
      Xmlns('http://www.w3.org/2000/svg'),
      Fill('none'),
      ViewBox('0 0 24 24'),
      StrokeWidth('2.5'),
      Stroke('currentColor'),
    ],
    [
      path(
        [
          StrokeLinecap('round'),
          StrokeLinejoin('round'),
          D('M5.75 3v18M18.25 3v18'),
        ],
        [],
      ),
    ],
  )

  const messageRowView = (
    tag: string,
    absoluteIndex: number,
    isSelected: boolean,
    isPausedHere: boolean,
    timeDelta: number,
    isModelChanged: boolean,
  ): Html =>
    div(
      [
        Class(clsx(ROW_BASE, isSelected && 'selected')),
        OnClick(ClickedRow({ index: absoluteIndex })),
      ],
      [
        span([Class('pause-column')], isPausedHere ? [pauseIconView] : []),
        span([Class('dot-column')], isModelChanged ? [inlineDiffDotView] : []),
        span([Class(indexClass)], [String(absoluteIndex + 1)]),
        span([Class('text-base text-dt font-mono flex-1 truncate')], [tag]),
        span(
          [
            Class(
              'text-2xs text-dt-muted font-mono shrink-0 text-right min-w-5',
            ),
          ],
          [formatTimeDelta(timeDelta)],
        ),
      ],
    )

  const messageListView = (model: Model): Html => {
    const baseTimestamp = Option.match(Array_.head(model.entries), {
      onNone: () => 0,
      onSome: first => first.timestamp,
    })

    const lastIndex =
      model.entries.length === 0
        ? INIT_INDEX
        : model.startIndex + model.entries.length - 1

    const selectedIndex = model.isPaused ? model.pausedAtIndex : lastIndex
    const isInitSelected = selectedIndex === INIT_INDEX

    const messageRows = Array_.map(model.entries, (entry, arrayIndex) => {
      const absoluteIndex = model.startIndex + arrayIndex
      const isSelected = selectedIndex === absoluteIndex
      const isPausedHere =
        model.isPaused && model.pausedAtIndex === absoluteIndex

      return messageRowView(
        entry.tag,
        absoluteIndex,
        isSelected,
        isPausedHere,
        entry.timestamp - baseTimestamp,
        entry.isModelChanged,
      )
    })

    return div(
      [Class('message-list flex-1 overflow-y-auto min-h-0')],
      [
        initRowView(
          isInitSelected,
          model.isPaused && model.pausedAtIndex === INIT_INDEX,
        ),
        ...messageRows,
      ],
    )
  }

  // PANEL

  const panelView = (model: Model): Html =>
    div(
      [
        Class(
          'fixed right-4 dt-panel dt-panel-wide bg-dt-bg border rounded-lg flex flex-col overflow-hidden font-mono text-dt',
        ),
      ],
      [
        headerView(model),
        div(
          [Class('flex flex-1 min-h-0')],
          [
            div(
              [Class('flex flex-col min-h-0 dt-message-pane')],
              [messageListView(model)],
            ),
            inspectorPaneView(model),
          ],
        ),
      ],
    )

  return (model: Model): Html =>
    div([], [...(model.isOpen ? [panelView(model)] : []), badgeView(model)])
}

// CREATE

export const createOverlay = (store: DevtoolsStore) =>
  Effect.gen(function* () {
    const existingHost = document.getElementById('foldkit-devtools')
    if (existingHost) {
      existingHost.remove()
    }

    const host = document.createElement('div')
    host.id = 'foldkit-devtools'
    document.body.appendChild(host)

    const shadow = host.attachShadow({ mode: 'open' })

    const styleElement = document.createElement('style')
    styleElement.textContent = overlayStyles
    shadow.appendChild(styleElement)

    const container = document.createElement('div')
    shadow.appendChild(container)

    const currentState = yield* SubscriptionRef.get(store.stateRef)

    const init = (): [Model, ReadonlyArray<Command<Message>>] => [
      {
        isOpen: false,
        maybeInspectedModel: Option.none(),
        maybeInspectedMessage: Option.none(),
        expandedPaths: HashSet.empty(),
        changedPaths: HashSet.empty(),
        affectedPaths: HashSet.empty(),
        inspectorTabs: Tabs.init({ id: INSPECTOR_TABS_ID }),
        ...toDisplayState(currentState),
      },
      [],
    ]

    const overlayRuntime = makeElement({
      Model,
      init,
      update: makeUpdate(store, shadow),
      view: makeView(),
      container,
      subscriptions: makeOverlaySubscriptions(store),
      devtools: false,
    })

    yield* Effect.forkDaemon(overlayRuntime())
  })
