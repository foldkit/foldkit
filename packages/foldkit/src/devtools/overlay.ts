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
import { OptionExt } from '../effectExtensions'
import { type Html, html } from '../html'
import { m } from '../message'
import { makeElement } from '../runtime/runtime'
import { makeSubscriptions } from '../runtime/subscription'
import { evo } from '../struct'
import { overlayStyles } from './overlay-styles'
import { type DevtoolsStore, INIT_INDEX, type StoreState } from './store'

// MODEL

const DisplayEntry = Schema.Struct({
  tag: Schema.String,
  commandCount: Schema.Number,
  timestamp: Schema.Number,
})

const Model = Schema.Struct({
  isOpen: Schema.Boolean,
  entries: Schema.Array(DisplayEntry),
  startIndex: Schema.Number,
  isPaused: Schema.Boolean,
  pausedAtIndex: Schema.Number,
  maybeInspectedModel: Schema.OptionFromSelf(Schema.Unknown),
  expandedPaths: Schema.HashSetFromSelf(Schema.String),
  changedPaths: Schema.HashSetFromSelf(Schema.String),
  affectedPaths: Schema.HashSetFromSelf(Schema.String),
})
type Model = typeof Model.Type

// MESSAGE

const ClickedToggle = m('ClickedToggle')
const ClickedRow = m('ClickedRow', { index: Schema.Number })
const ClickedResume = m('ClickedResume')
const ClickedClear = m('ClickedClear')
const CompletedSideEffect = m('CompletedSideEffect')
const ReceivedInspectedModel = m('ReceivedInspectedModel', {
  model: Schema.Unknown,
  changedPaths: Schema.HashSetFromSelf(Schema.String),
  affectedPaths: Schema.HashSetFromSelf(Schema.String),
})
const ToggledTreeNode = m('ToggledTreeNode', { path: Schema.String })
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
  ReceivedInspectedModel,
  ToggledTreeNode,
  ReceivedStoreUpdate,
)
type Message = typeof Message.Type

// HELPERS

const MILLIS_PER_SECOND = 1000
const TREE_INDENT_PX = 14
const MAX_PREVIEW_KEYS = 3

const formatTimeDelta = (deltaMs: number): string =>
  deltaMs < MILLIS_PER_SECOND
    ? `+${Math.round(deltaMs)}ms`
    : `+${(deltaMs / MILLIS_PER_SECOND).toFixed(1)}s`

const MESSAGE_LIST_SELECTOR = '.message-list'

const toDisplayEntries = ({ entries }: StoreState) =>
  Array_.map(entries, ({ tag, commandCount, timestamp }) => ({
    tag,
    commandCount,
    timestamp,
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

  const inspectModel = (
    index: number,
  ): Command<typeof ReceivedInspectedModel> =>
    Effect.gen(function* () {
      const model = yield* store.getModelAtIndex(index)

      const diff =
        index === INIT_INDEX
          ? emptyDiff
          : yield* pipe(
              store.getModelAtIndex(index - 1),
              Effect.map(previousModel => computeDiff(previousModel, model)),
              Effect.catchAll(() => Effect.succeed(emptyDiff)),
            )

      return ReceivedInspectedModel({ model, ...diff })
    })

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
          [jumpTo(index), inspectModel(index)],
        ],
        ClickedResume: () => [
          evo(model, {
            maybeInspectedModel: () => Option.none(),
            expandedPaths: () => HashSet.empty<string>(),
            changedPaths: () => HashSet.empty<string>(),
            affectedPaths: () => HashSet.empty<string>(),
          }),
          [resume],
        ],
        ClickedClear: () => [
          evo(model, {
            maybeInspectedModel: () => Option.none(),
            expandedPaths: () => HashSet.empty<string>(),
            changedPaths: () => HashSet.empty<string>(),
            affectedPaths: () => HashSet.empty<string>(),
          }),
          [clear],
        ],
        CompletedSideEffect: () => [model, []],
        ReceivedInspectedModel: ({
          model: inspectedModel,
          changedPaths,
          affectedPaths,
        }) => [
          evo(model, {
            maybeInspectedModel: () => Option.some(inspectedModel),
            changedPaths: () => changedPaths,
            affectedPaths: () => affectedPaths,
          }),
          [],
        ],
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
          const maybeScrollToBottom = OptionExt.when(!isPaused, scrollToBottom)

          return [
            evo(model, {
              entries: () => [...entries],
              startIndex: () => startIndex,
              isPaused: () => isPaused,
              pausedAtIndex: () => pausedAtIndex,
            }),
            Option.toArray(maybeScrollToBottom),
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

const indexClass = 'text-2xs text-dt-muted font-mono'

const headerButtonClass =
  'dt-header-button bg-transparent border-none text-dt-muted cursor-pointer text-xs font-sans px-2 py-1 rounded transition-colors'

const ROW_BASE =
  'dt-row flex items-center py-1 px-1 cursor-pointer gap-1.5 transition-colors border-l-3'

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

    return div(
      [
        Class(
          clsx(
            'tree-row tree-row-expandable flex items-center gap-px font-mono text-2xs cursor-pointer',
            node.isChanged && 'diff-changed',
          ),
        ),
        indent,
        OnClick(ToggledTreeNode({ path: node.treePath })),
      ],
      [
        arrowView(node.isExpanded),
        ...(hasDiffDot ? [diffDotView] : []),
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

  const inspectorView = (model: Model): Html =>
    Option.match(model.maybeInspectedModel, {
      onNone: () =>
        div(
          [
            Class(
              'flex-1 flex items-center justify-center text-dt-muted text-2xs font-sans italic min-w-0',
            ),
          ],
          ['Click a message to inspect the model'],
        ),
      onSome: inspectedModel => {
        const nodes: Array<FlatNode> = []
        flattenTree(
          inspectedModel,
          'root',
          model.expandedPaths,
          model.changedPaths,
          model.affectedPaths,
          0,
          Option.none(),
          nodes,
        )

        return div(
          [
            Class(
              'inspector-tree flex-1 overflow-y-auto min-h-0 min-w-0 py-1 px-1',
            ),
          ],
          nodes.map(flatNodeView),
        )
      },
    })

  const inspectorPaneView = (model: Model): Html =>
    div(
      [Class('flex flex-col border-l min-w-0 flex-1')],
      [
        div(
          [
            Class(
              'flex items-center justify-between px-3 py-2 border-b shrink-0',
            ),
          ],
          [
            span(
              [
                Class(
                  'text-xs font-semibold text-dt-muted font-sans tracking-wide',
                ),
              ],
              [
                pipe(
                  model.maybeInspectedModel,
                  Option.flatMap(inspectedModel =>
                    Option.liftPredicate(inspectedModel, isTagged),
                  ),
                  Option.match({
                    onNone: () => 'Model',
                    onSome: tagged => `Model — ${tagged._tag}`,
                  }),
                ),
              ],
            ),
          ],
        ),
        inspectorView(model),
      ],
    )

  // MESSAGE LIST

  const badgeView = (model: Model): Html =>
    button(
      [
        Class(
          clsx(
            'fixed bottom-4 right-4 w-11 h-11 rounded-full bg-dt-bg text-dt cursor-pointer flex items-center justify-center font-mono text-base font-semibold outline-none dt-badge',
            model.isPaused ? 'dt-badge-paused' : 'dt-badge-accent',
          ),
        ),
        OnClick(ClickedToggle()),
      ],
      [model.isOpen ? '✕' : String(model.entries.length)],
    )

  const headerView = (model: Model): Html => {
    const totalEntries = Array_.length(model.entries)

    const statusView: Html = model.isPaused
      ? div(
          [Class('flex items-center gap-2')],
          [
            span(
              [Class('text-xs text-dt-paused font-medium font-sans')],
              [
                model.pausedAtIndex === INIT_INDEX
                  ? 'Paused at init'
                  : `Paused at ${model.pausedAtIndex}`,
              ],
            ),
            button(
              [
                Class(
                  'bg-transparent border border-dt-live text-dt-live cursor-pointer text-2xs font-sans px-1 py-px rounded font-medium',
                ),
                OnClick(ClickedResume()),
              ],
              ['Resume'],
            ),
          ],
        )
      : div(
          [Class('flex items-center gap-1.5')],
          [
            span(
              [Class('w-1.5 h-1.5 rounded-full bg-dt-live inline-block')],
              [],
            ),
            span(
              [Class('text-xs text-dt-live font-medium font-sans')],
              ['Live'],
            ),
            span(
              [Class('text-2xs text-dt-muted font-sans')],
              [`· ${totalEntries}`],
            ),
          ],
        )

    return div(
      [
        Class(
          'flex items-center justify-between px-2 py-1.5 border-b shrink-0',
        ),
      ],
      [
        statusView,
        button(
          [Class(headerButtonClass), OnClick(ClickedClear())],
          ['Clear history'],
        ),
      ],
    )
  }

  const initRowView = (isSelected: boolean): Html =>
    div(
      [
        Class(clsx(ROW_BASE, isSelected && 'selected')),
        OnClick(ClickedRow({ index: INIT_INDEX })),
      ],
      [
        span([Class(indexClass)], ['●']),
        span([Class('text-sm text-dt-muted font-mono italic')], ['Init']),
      ],
    )

  const messageRowView = (
    tag: string,
    absoluteIndex: number,
    isSelected: boolean,
    timeDelta: number,
  ): Html =>
    div(
      [
        Class(clsx(ROW_BASE, isSelected && 'selected')),
        OnClick(ClickedRow({ index: absoluteIndex })),
      ],
      [
        span([Class(indexClass)], [String(absoluteIndex)]),
        span([Class('text-sm text-dt font-mono flex-1 truncate')], [tag]),
        span(
          [Class('text-2xs text-dt-muted font-mono shrink-0')],
          [formatTimeDelta(timeDelta)],
        ),
      ],
    )

  const messageListView = (model: Model): Html => {
    const baseTimestamp = Option.match(Array_.head(model.entries), {
      onNone: () => 0,
      onSome: first => first.timestamp,
    })

    const isInitSelected = model.isPaused && model.pausedAtIndex === INIT_INDEX

    const messageRows = Array_.map(model.entries, (entry, arrayIndex) => {
      const absoluteIndex = model.startIndex + arrayIndex
      const isSelected = model.isPaused && model.pausedAtIndex === absoluteIndex

      return messageRowView(
        entry.tag,
        absoluteIndex,
        isSelected,
        entry.timestamp - baseTimestamp,
      )
    })

    return div(
      [Class('message-list flex-1 overflow-y-auto min-h-0')],
      [initRowView(isInitSelected), ...messageRows],
    )
  }

  // PANEL

  const isInspecting = (model: Model): boolean =>
    model.isPaused && Option.isSome(model.maybeInspectedModel)

  const panelView = (model: Model): Html =>
    div(
      [
        Class(
          clsx(
            'fixed right-4 dt-panel bg-dt-bg border rounded-lg flex flex-col overflow-hidden font-sans text-dt',
            isInspecting(model) && 'dt-panel-wide',
          ),
        ),
      ],
      [
        headerView(model),
        div(
          [Class('flex flex-1 min-h-0')],
          [
            div(
              [
                Class(
                  clsx(
                    'flex flex-col min-h-0',
                    isInspecting(model) ? 'dt-message-pane' : 'flex-1',
                  ),
                ),
              ],
              [messageListView(model)],
            ),
            ...(isInspecting(model) ? [inspectorPaneView(model)] : []),
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
        expandedPaths: HashSet.empty(),
        changedPaths: HashSet.empty(),
        affectedPaths: HashSet.empty(),
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
