import { clsx } from 'clsx'
import {
  Array as Array_,
  Effect,
  HashSet,
  Match as M,
  Number as Number_,
  Option,
  Predicate,
  Record,
  Schema as S,
  Stream,
  String as String_,
  SubscriptionRef,
  pipe,
} from 'effect'

import * as Command from '../command'
import { OptionExt } from '../effectExtensions'
import { type Html, createKeyedLazy, html } from '../html'
import { m } from '../message'
import { makeElement } from '../runtime/runtime'
import type { DevtoolsMode, DevtoolsPosition } from '../runtime/runtime'
import { makeSubscriptions } from '../runtime/subscription'
import { evo } from '../struct'
import { lockScroll, unlockScroll } from '../task/scrollLock'
import * as Tabs from '../ui/tabs'
import { overlayStyles } from './overlay-styles'
import { type DevtoolsStore, INIT_INDEX, type StoreState } from './store'

// MODEL

const DisplayEntry = S.Struct({
  tag: S.String,
  commandNames: S.Array(S.String),
  timestamp: S.Number,
  isModelChanged: S.Boolean,
})

const INSPECTOR_TABS_ID = 'dt-inspector'

const InspectorTabsModel = S.Struct({
  id: S.String,
  activeIndex: S.Number,
  focusedIndex: S.Number,
  activationMode: S.Literal('Automatic', 'Manual'),
})

const Model = S.Struct({
  isOpen: S.Boolean,
  isMobile: S.Boolean,
  entries: S.Array(DisplayEntry),
  startIndex: S.Number,
  isPaused: S.Boolean,
  pausedAtIndex: S.Number,
  selectedIndex: S.Number,
  isFollowingLatest: S.Boolean,
  maybeInspectedModel: S.OptionFromSelf(S.Unknown),
  maybeInspectedMessage: S.OptionFromSelf(S.Unknown),
  expandedPaths: S.HashSetFromSelf(S.String),
  changedPaths: S.HashSetFromSelf(S.String),
  affectedPaths: S.HashSetFromSelf(S.String),
  inspectorTabs: InspectorTabsModel,
})
type Model = typeof Model.Type

const Flags = S.Struct({
  isMobile: S.Boolean,
  entries: S.Array(DisplayEntry),
  startIndex: S.Number,
  isPaused: S.Boolean,
  pausedAtIndex: S.Number,
})

// MESSAGE

const ClickedToggle = m('ClickedToggle')
const ClickedRow = m('ClickedRow', { index: S.Number })
const ClickedResume = m('ClickedResume')
const ClickedClear = m('ClickedClear')
const CompletedJump = m('CompletedJump')
const CompletedResume = m('CompletedResume')
const ClickedFollowLatest = m('ClickedFollowLatest')
const CompletedClear = m('CompletedClear')
const LockedScroll = m('LockedScroll')
const UnlockedScroll = m('UnlockedScroll')
const ScrolledToTop = m('ScrolledToTop')
const CrossedMobileBreakpoint = m('CrossedMobileBreakpoint', {
  isMobile: S.Boolean,
})
const ReceivedInspectedState = m('ReceivedInspectedState', {
  model: S.Unknown,
  maybeMessage: S.OptionFromSelf(S.Unknown),
  changedPaths: S.HashSetFromSelf(S.String),
  affectedPaths: S.HashSetFromSelf(S.String),
})
const ToggledTreeNode = m('ToggledTreeNode', { path: S.String })
const GotInspectorTabsMessage = m('GotInspectorTabsMessage', {
  message: S.Unknown,
})
const ReceivedStoreUpdate = m('ReceivedStoreUpdate', {
  entries: S.Array(DisplayEntry),
  startIndex: S.Number,
  isPaused: S.Boolean,
  pausedAtIndex: S.Number,
})

const Message = S.Union(
  ClickedToggle,
  ClickedRow,
  ClickedResume,
  ClickedClear,
  ClickedFollowLatest,
  CompletedJump,
  CompletedResume,
  CompletedClear,
  LockedScroll,
  UnlockedScroll,
  ScrolledToTop,
  CrossedMobileBreakpoint,
  ReceivedInspectedState,
  ToggledTreeNode,
  GotInspectorTabsMessage,
  ReceivedStoreUpdate,
)
type Message = typeof Message.Type

// HELPERS

const MILLIS_PER_SECOND = 1000
const MOBILE_BREAKPOINT = 767
const MOBILE_BREAKPOINT_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`
const TREE_INDENT_PX = 12
const MAX_PREVIEW_KEYS = 3

const formatTimeDelta = (deltaMs: number): string =>
  M.value(deltaMs).pipe(
    M.when(0, () => '0ms'),
    M.when(Number_.lessThan(MILLIS_PER_SECOND), ms => `+${Math.round(ms)}ms`),
    M.orElse(ms => `+${(ms / MILLIS_PER_SECOND).toFixed(1)}s`),
  )

const MESSAGE_LIST_SELECTOR = '.message-list'

const toDisplayEntries = ({ entries }: StoreState) =>
  Array_.map(entries, ({ tag, commandNames, timestamp, isModelChanged }) => ({
    tag,
    commandNames,
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
  Predicate.isNotNull(value) && typeof value === 'object'

const Tagged = S.Struct({ _tag: S.String })
const isTagged = S.is(Tagged)

const objectPreview = (value: Record<string, unknown>): string =>
  pipe(
    value,
    Record.keys,
    Array_.filter(key => key !== '_tag'),
    Array_.match({
      onEmpty: () => '{}',
      onNonEmpty: keys => {
        const preview = pipe(
          keys,
          Array_.take(MAX_PREVIEW_KEYS),
          Array_.join(', '),
        )
        return Array_.length(keys) > MAX_PREVIEW_KEYS
          ? `{ ${preview}, … }`
          : `{ ${preview} }`
      },
    }),
  )

const collapsedPreview = (value: unknown): string =>
  M.value(value).pipe(
    M.when(Array.isArray, array => `(${array.length})`),
    M.when(Predicate.isReadonlyRecord, objectPreview),
    M.orElse(() => ''),
  )

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

    if (Array.isArray(curr) && Array.isArray(prev)) {
      walkArray(prev, curr, path)
    } else if (
      Predicate.isReadonlyRecord(curr) &&
      Predicate.isReadonlyRecord(prev)
    ) {
      walkObject(prev, curr, path)
    } else {
      changed.add(path)
    }
  }

  const walkObject = (
    prev: Readonly<Record<string, unknown>>,
    curr: Readonly<Record<string, unknown>>,
    path: string,
  ): void => {
    pipe(
      curr,
      Record.keys,
      Array_.forEach(key => {
        const childPath = `${path}.${key}`
        if (Record.has(prev, key)) {
          walk(prev[key], curr[key], childPath)
        } else {
          changed.add(childPath)
        }
      }),
    )
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

      if (Predicate.isUndefined(prevIndex) || prevIndex !== index) {
        changed.add(childPath)
      }
    })
  }

  walk(previous, current, 'root')

  const affected = new Set(changed)
  const addAncestors = (path: string): void => {
    pipe(
      path,
      String_.lastIndexOf('.'),
      Option.map(lastDot => path.substring(0, lastDot)),
      Option.filter(parent => !affected.has(parent)),
      Option.map(parent => {
        affected.add(parent)
        addAncestors(parent)
      }),
    )
  }
  changed.forEach(addAncestors)

  return {
    changedPaths: HashSet.fromIterable(changed),
    affectedPaths: HashSet.fromIterable(affected),
  }
}

// UPDATE

const makeUpdate = (
  store: DevtoolsStore,
  shadow: ShadowRoot,
  mode: DevtoolsMode,
) => {
  const jumpTo = (index: number) =>
    Effect.gen(function* () {
      yield* store.jumpTo(index)
      return CompletedJump()
    }).pipe(Command.make('JumpTo'))

  const inspectState = (index: number) =>
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
    }).pipe(Command.make('InspectState'))

  const inspectLatest = Effect.gen(function* () {
    const state = yield* SubscriptionRef.get(store.stateRef)
    const latestIndex = Array_.isEmptyReadonlyArray(state.entries)
      ? INIT_INDEX
      : state.startIndex + state.entries.length - 1

    return yield* inspectState(latestIndex).effect
  }).pipe(Command.make('InspectLatest'))

  const resume = Effect.gen(function* () {
    yield* store.resume
    return CompletedResume()
  }).pipe(Command.make('Resume'))

  const clear = Effect.gen(function* () {
    yield* store.clear
    return CompletedClear()
  }).pipe(Command.make('Clear'))

  const toggleScrollLock = (shouldLock: boolean) =>
    shouldLock
      ? lockScroll.pipe(Effect.as(LockedScroll()), Command.make('LockScroll'))
      : unlockScroll.pipe(
          Effect.as(UnlockedScroll()),
          Command.make('UnlockScroll'),
        )

  const scrollToTop = Effect.sync(() => {
    const messageList = shadow.querySelector(MESSAGE_LIST_SELECTOR)
    if (messageList instanceof HTMLElement) {
      messageList.scrollTop = 0
    }
    return ScrolledToTop()
  }).pipe(Command.make('ScrollToTop'))

  return (
    model: Model,
    message: Message,
  ): [Model, ReadonlyArray<Command.Command<Message>>] =>
    M.value(message).pipe(
      M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
      M.tags({
        ClickedToggle: () => {
          const nextIsOpen = !model.isOpen
          return [
            evo(model, { isOpen: () => nextIsOpen }),
            OptionExt.when(model.isMobile, toggleScrollLock(nextIsOpen)).pipe(
              Option.toArray,
            ),
          ]
        },
        CrossedMobileBreakpoint: ({ isMobile }) => [
          evo(model, { isMobile: () => isMobile }),
          OptionExt.when(model.isOpen, toggleScrollLock(isMobile)).pipe(
            Option.toArray,
          ),
        ],
        ClickedRow: ({ index }) =>
          M.value(mode).pipe(
            M.withReturnType<
              [Model, ReadonlyArray<Command.Command<Message>>]
            >(),
            M.when('TimeTravel', () => [
              model,
              [jumpTo(index), inspectState(index)],
            ]),
            M.when('Inspect', () => [
              evo(model, {
                selectedIndex: () => index,
                isFollowingLatest: () => false,
              }),
              [inspectState(index)],
            ]),
            M.exhaustive,
          ),
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
            selectedIndex: () => INIT_INDEX,
            isFollowingLatest: () => true,
            expandedPaths: () => HashSet.empty<string>(),
            changedPaths: () => HashSet.empty<string>(),
            affectedPaths: () => HashSet.empty<string>(),
          }),
          [clear, inspectLatest],
        ],
        ClickedFollowLatest: () => {
          const latestIndex = Array_.match(model.entries, {
            onEmpty: () => INIT_INDEX,
            onNonEmpty: () => model.startIndex + model.entries.length - 1,
          })

          return [
            evo(model, {
              selectedIndex: () => latestIndex,
              isFollowingLatest: () => true,
              expandedPaths: () => HashSet.empty<string>(),
              changedPaths: () => HashSet.empty<string>(),
              affectedPaths: () => HashSet.empty<string>(),
            }),
            [inspectLatest, scrollToTop],
          ]
        },
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
              Command.mapEffect(
                Effect.map(innerMessage =>
                  GotInspectorTabsMessage({ message: innerMessage }),
                ),
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
          const shouldFollowLatest = M.value(mode).pipe(
            M.when('TimeTravel', () => !isPaused),
            M.when('Inspect', () => model.isFollowingLatest),
            M.exhaustive,
          )

          const latestIndex = Array_.match(entries, {
            onEmpty: () => INIT_INDEX,
            onNonEmpty: () => startIndex + entries.length - 1,
          })

          return [
            evo(model, {
              entries: () => entries,
              startIndex: () => startIndex,
              isPaused: () => isPaused,
              pausedAtIndex: () => pausedAtIndex,
              selectedIndex: current =>
                shouldFollowLatest ? latestIndex : current,
            }),
            shouldFollowLatest ? [scrollToTop, inspectLatest] : [],
          ]
        },
      }),
      M.tag(
        'CompletedJump',
        'CompletedResume',
        'CompletedClear',
        'LockedScroll',
        'UnlockedScroll',
        'ScrolledToTop',
        () => [model, []],
      ),
      M.exhaustive,
    )
}

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  storeUpdates: S.Null,
  mobileBreakpoint: S.Null,
})

const makeOverlaySubscriptions = (store: DevtoolsStore) =>
  makeSubscriptions(SubscriptionDeps)<Model, Message>({
    storeUpdates: {
      modelToDependencies: () => null,
      depsToStream: () =>
        Stream.concat(
          Stream.fromEffect(
            pipe(
              SubscriptionRef.get(store.stateRef),
              Effect.map(state => ReceivedStoreUpdate(toDisplayState(state))),
            ),
          ),
          pipe(
            store.stateRef.changes,
            Stream.map(state => ReceivedStoreUpdate(toDisplayState(state))),
          ),
        ),
    },
    mobileBreakpoint: {
      modelToDependencies: () => null,
      depsToStream: () =>
        Stream.async<Message>(emit => {
          const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY)

          const handler = (event: MediaQueryListEvent) => {
            emit.single(CrossedMobileBreakpoint({ isMobile: event.matches }))
          }

          mediaQuery.addEventListener('change', handler)

          return Effect.sync(() =>
            mediaQuery.removeEventListener('change', handler),
          )
        }),
    },
  })

// VIEW

const indexClass = 'text-2xs text-dt-muted font-mono min-w-5'

const headerButtonClass =
  'dt-header-button bg-transparent border-none text-dt-muted cursor-pointer text-base font-mono transition-colors'

const ROW_BASE =
  'dt-row flex items-center py-1 px-1 cursor-pointer gap-1.5 transition-colors border-b'

const BADGE_POSITION_CLASS: Record<DevtoolsPosition, string> = {
  BottomRight: 'dt-pos-br',
  BottomLeft: 'dt-pos-bl',
  TopRight: 'dt-pos-tr',
  TopLeft: 'dt-pos-tl',
}

const PANEL_POSITION_CLASS: Record<DevtoolsPosition, string> = {
  BottomRight: 'dt-panel-br',
  BottomLeft: 'dt-panel-bl',
  TopRight: 'dt-panel-tr',
  TopLeft: 'dt-panel-tl',
}

const makeView = (
  position: DevtoolsPosition,
  mode: DevtoolsMode,
  maybeBanner: Option.Option<string>,
): ((model: Model) => Html) => {
  const {
    div,
    header,
    span,
    ul,
    button,
    svg,
    path,
    keyed,
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

  const lazyTreeNode = createKeyedLazy()
  const lazyMessageRow = createKeyedLazy()

  // JSON TREE

  const leafValueView = (value: unknown): Html =>
    M.value(value).pipe(
      M.when(Predicate.isNull, () =>
        span([Class('json-null italic')], ['null']),
      ),
      M.when(Predicate.isUndefined, () =>
        span([Class('json-null italic')], ['undefined']),
      ),
      M.when(Predicate.isString, stringValue =>
        span([Class('json-string')], [`"${stringValue}"`]),
      ),
      M.when(Predicate.isNumber, numberValue =>
        span([Class('json-number')], [String(numberValue)]),
      ),
      M.when(Predicate.isBoolean, booleanValue =>
        span([Class('json-boolean')], [String(booleanValue)]),
      ),
      M.orElse(unknownValue =>
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
    key: string
    isExpandable: boolean
    isExpanded: boolean
    isChanged: boolean
    isAffected: boolean
    tag: string
  }>

  type FlattenConfig = Readonly<{
    value: unknown
    treePath: string
    expandedPaths: HashSet.HashSet<string>
    changedPaths: HashSet.HashSet<string>
    affectedPaths: HashSet.HashSet<string>
    depth: number
    key: string
    accumulator: Array<FlatNode>
    indentRootChildren: boolean
  }>

  const flattenTree = ({
    value,
    treePath,
    depth,
    key,
    ...shared
  }: FlattenConfig): void => {
    const {
      expandedPaths,
      changedPaths,
      affectedPaths,
      accumulator,
      indentRootChildren,
    } = shared
    const isRoot = treePath === 'root'
    const nodeIsExpandable = isExpandable(value)
    const isExpanded =
      nodeIsExpandable && (isRoot || HashSet.has(expandedPaths, treePath))
    const tag = isTagged(value) ? value._tag : ''

    accumulator.push({
      value,
      treePath,
      depth,
      key,
      isExpandable: nodeIsExpandable,
      isExpanded,
      isChanged: HashSet.has(changedPaths, treePath),
      isAffected: HashSet.has(affectedPaths, treePath),
      tag,
    })

    if (!isExpanded) {
      return
    }

    const childDepth = isRoot && !indentRootChildren ? depth : depth + 1

    if (Array.isArray(value)) {
      value.forEach((item, arrayIndex) =>
        flattenTree({
          ...shared,
          value: item,
          treePath: `${treePath}.${arrayIndex}`,
          depth: childDepth,
          key: String(arrayIndex),
        }),
      )
    } else if (Predicate.isReadonlyRecord(value)) {
      pipe(
        value,
        Record.toEntries,
        Array_.filter(([entryKey]) => entryKey !== '_tag'),
        Array_.forEach(([entryKey, childValue]) =>
          flattenTree({
            ...shared,
            value: childValue,
            treePath: `${treePath}.${entryKey}`,
            depth: childDepth,
            key: entryKey,
          }),
        ),
      )
    }
  }

  const flatNodeView = (
    value: unknown,
    treePath: string,
    depth: number,
    key: string,
    nodeIsExpandable: boolean,
    isExpanded: boolean,
    isChanged: boolean,
    isAffected: boolean,
    tag: string,
  ): Html => {
    const indent = Style({ paddingLeft: `${depth * TREE_INDENT_PX}px` })
    const hasDiffDot = isChanged || isAffected

    if (!nodeIsExpandable) {
      return div(
        [
          Class(
            clsx('tree-row flex items-center gap-px font-mono text-2xs', {
              'diff-changed': isChanged,
            }),
          ),
          indent,
        ],
        [
          ...(hasDiffDot ? [diffDotView] : []),
          ...(String_.isNonEmpty(key) ? [keyView(key)] : []),
          leafValueView(value),
        ],
      )
    }

    const isRoot = treePath === 'root'

    const preview = isExpanded
      ? Array.isArray(value)
        ? `(${value.length})`
        : ''
      : collapsedPreview(value)

    return div(
      [
        Class(
          clsx('tree-row flex items-center gap-px font-mono text-2xs', {
            'tree-row-expandable cursor-pointer': !isRoot,
            'diff-changed': isChanged,
          }),
        ),
        indent,
        ...(isRoot ? [] : [OnClick(ToggledTreeNode({ path: treePath }))]),
      ],
      [
        ...(isRoot ? [] : [arrowView(isExpanded)]),
        ...(!isRoot && hasDiffDot ? [diffDotView] : []),
        ...(String_.isNonEmpty(key) ? [keyView(key)] : []),
        ...(String_.isNonEmpty(tag) ? [tagLabelView(tag)] : []),
        span([Class('json-preview')], [preview]),
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
    indentRootChildren: boolean,
  ): Html => {
    const nodes: Array<FlatNode> = []
    flattenTree({
      value,
      treePath: rootPath,
      expandedPaths,
      changedPaths,
      affectedPaths,
      depth: 0,
      key: Option.getOrElse(maybeRootLabel, () => ''),
      accumulator: nodes,
      indentRootChildren,
    })

    return div(
      [
        Class(
          'inspector-tree flex-1 overflow-auto min-h-0 min-w-0 overscroll-none',
        ),
      ],
      nodes.map(node =>
        lazyTreeNode(node.treePath, flatNodeView, [
          node.value,
          node.treePath,
          node.depth,
          node.key,
          node.isExpandable,
          node.isExpanded,
          node.isChanged,
          node.isAffected,
          node.tag,
        ]),
      ),
    )
  }

  const inspectedTimestamp = (model: Model): string => {
    const lastIndex = Array_.isEmptyReadonlyArray(model.entries)
      ? INIT_INDEX
      : model.startIndex + model.entries.length - 1

    const selectedIndex = M.value(mode).pipe(
      M.when('TimeTravel', () =>
        model.isPaused ? model.pausedAtIndex : lastIndex,
      ),
      M.when('Inspect', () => model.selectedIndex),
      M.exhaustive,
    )

    if (selectedIndex === INIT_INDEX) {
      return '0ms'
    }

    const baseTimestamp = pipe(
      model.entries,
      Array_.head,
      Option.match({
        onNone: () => 0,
        onSome: ({ timestamp }) => timestamp,
      }),
    )

    return pipe(
      Array_.get(model.entries, selectedIndex - model.startIndex),
      Option.map(entry => {
        const delta = entry.timestamp - baseTimestamp
        const seconds = Math.floor(delta / MILLIS_PER_SECOND)
        const remainingMs = delta % MILLIS_PER_SECOND

        return seconds > 0
          ? `+${seconds}s ${remainingMs.toFixed(1)}ms`
          : `+${remainingMs.toFixed(1)}ms`
      }),
      Option.getOrElse(() => ''),
    )
  }

  const emptyInspectorView: Html = div(
    [
      Class(
        'flex-1 flex items-center justify-center text-dt-muted text-2xs font-mono min-w-0',
      ),
    ],
    ['Click a message to inspect'],
  )

  type InspectorTab = 'Model' | 'Message'
  const INSPECTOR_TABS: ReadonlyArray<InspectorTab> = ['Model', 'Message']

  const noMessageView: Html = div(
    [
      Class(
        'flex-1 flex items-center justify-center text-dt-muted text-2xs font-mono min-w-0',
      ),
    ],
    ['init — no Message'],
  )

  const modelTabContent = (model: Model, inspectedModel: unknown): Html =>
    treeView(
      inspectedModel,
      'root',
      model.expandedPaths,
      model.changedPaths,
      model.affectedPaths,
      Option.none(),
      true,
    )

  const messageTabContent = (model: Model): Html =>
    Option.match(model.maybeInspectedMessage, {
      onNone: () => noMessageView,
      onSome: message =>
        div(
          [Class('flex flex-col flex-1 min-h-0 min-w-0')],
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
              [Class('flex flex-col flex-1 min-h-0 min-w-0 pt-1 pl-1')],
              [
                treeView(
                  message,
                  'root',
                  model.expandedPaths,
                  HashSet.empty(),
                  HashSet.empty(),
                  Option.none(),
                  false,
                ),
              ],
            ),
          ],
        ),
    })

  const inspectorTabContent = (
    model: Model,
    tab: InspectorTab,
    inspectedModel: unknown,
  ): Html =>
    M.value(tab).pipe(
      M.when('Model', () => modelTabContent(model, inspectedModel)),
      M.when('Message', () => messageTabContent(model)),
      M.exhaustive,
    )

  const inspectorPaneView = (model: Model): Html =>
    div(
      [
        Class(
          'flex flex-col border-l min-w-0 min-h-0 flex-1 dt-inspector-pane',
        ),
      ],
      [
        Tabs.view<Message, InspectorTab>({
          model: model.inspectorTabs,
          toMessage: tabsMessage =>
            GotInspectorTabsMessage({ message: tabsMessage }),
          tabs: INSPECTOR_TABS,
          tabListAriaLabel: 'Inspector tabs',
          attributes: [Class('flex flex-col flex-1 min-h-0')],
          tabListAttributes: [Class('flex border-b shrink-0')],
          tabToConfig: (tab, { isActive }) => ({
            buttonAttributes: [
              Class(
                clsx(
                  'dt-tab-button cursor-pointer text-base font-mono px-3 py-1',
                  isActive ? 'text-dt dt-tab-active' : 'text-dt-muted',
                ),
              ),
            ],
            buttonContent: span([], [tab]),
            panelAttributes: [Class('flex flex-col flex-1 min-h-0 min-w-0')],
            panelContent: Option.match(model.maybeInspectedModel, {
              onNone: () => emptyInspectorView,
              onSome: inspectedModel =>
                inspectorTabContent(model, tab, inspectedModel),
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
            'fixed bg-dt-bg text-dt cursor-pointer flex flex-col items-center justify-center font-mono outline-none dt-badge',
            BADGE_POSITION_CLASS[position],
            model.isPaused ? 'dt-badge-paused' : 'dt-badge-accent',
          ),
        ),
        Style({ width: '22px', height: '56px', fontSize: '10px' }),
        OnClick(ClickedToggle()),
      ],
      [
        model.isOpen
          ? svg(
              [
                AriaHidden(true),
                Xmlns('http://www.w3.org/2000/svg'),
                Fill('none'),
                ViewBox('0 0 24 24'),
                StrokeWidth('1.5'),
                Stroke('currentColor'),
                Style({ width: '12px', height: '12px' }),
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
          : div(
              [
                Class(
                  clsx(
                    'flex flex-col items-center gap-0.5 font-semibold tracking-wider leading-none',
                    model.isPaused ? 'text-dt-bg' : 'text-dt-muted',
                  ),
                ),
              ],
              [span([], ['D']), span([], ['E']), span([], ['V'])],
            ),
      ],
    )

  const headerClass =
    'flex items-center justify-between px-3 py-1.5 border-b shrink-0'

  const actionButtonClass =
    'dt-resume-button bg-transparent border-none text-dt-live cursor-pointer text-base font-mono font-medium'

  const statusClass = 'text-base font-mono'

  const clearHistoryButton: Html = button(
    [Class(headerButtonClass), OnClick(ClickedClear())],
    ['Clear history'],
  )

  const headerView = (model: Model): Html => {
    const { status, action } = M.value(mode).pipe(
      M.withReturnType<Readonly<{ status: Html; action: Html }>>(),
      M.when('TimeTravel', () =>
        model.isPaused
          ? {
              status: span(
                [Class(`${statusClass} text-dt-paused`)],
                [
                  model.pausedAtIndex === INIT_INDEX
                    ? 'Paused (init)'
                    : `Paused (${model.pausedAtIndex + 1})`,
                ],
              ),
              action: button(
                [Class(actionButtonClass), OnClick(ClickedResume())],
                ['Resume →'],
              ),
            }
          : {
              status: span(
                [Class(`${statusClass} text-dt-live font-medium`)],
                ['Live'],
              ),
              action: div([], []),
            },
      ),
      M.when('Inspect', () => ({
        status: span(
          [Class(`${statusClass} text-dt-accent`)],
          [
            model.selectedIndex === INIT_INDEX
              ? 'Inspecting (init)'
              : `Inspecting (${model.selectedIndex + 1})`,
          ],
        ),
        action: model.isFollowingLatest
          ? div([], [])
          : button(
              [Class(actionButtonClass), OnClick(ClickedFollowLatest())],
              ['Follow Latest →'],
            ),
      })),
      M.exhaustive,
    )

    return header([Class(headerClass)], [status, action, clearHistoryButton])
  }

  const initRowView = (isSelected: boolean, isPausedHere: boolean): Html =>
    keyed('li')(
      'init',
      [
        Class(clsx(ROW_BASE, { selected: isSelected })),
        OnClick(ClickedRow({ index: INIT_INDEX })),
      ],
      [
        ...OptionExt.when(
          mode === 'TimeTravel',
          span([Class('pause-column')], isPausedHere ? [pauseIconView] : []),
        ).pipe(Option.toArray),
        span([Class('dot-column')], []),
        span([Class(indexClass)], []),
        span([Class('text-base text-dt-muted font-mono')], ['init']),
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
    keyed('li')(
      String(absoluteIndex),
      [
        Class(clsx(ROW_BASE, { selected: isSelected })),
        OnClick(ClickedRow({ index: absoluteIndex })),
      ],
      [
        ...OptionExt.when(
          mode === 'TimeTravel',
          span([Class('pause-column')], isPausedHere ? [pauseIconView] : []),
        ).pipe(Option.toArray),
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
    const baseTimestamp = pipe(
      model.entries,
      Array_.head,
      Option.match({
        onNone: () => 0,
        onSome: ({ timestamp }) => timestamp,
      }),
    )

    const lastIndex = Array_.isEmptyReadonlyArray(model.entries)
      ? INIT_INDEX
      : model.startIndex + model.entries.length - 1

    const selectedIndex = M.value(mode).pipe(
      M.when('TimeTravel', () =>
        model.isPaused ? model.pausedAtIndex : lastIndex,
      ),
      M.when('Inspect', () => model.selectedIndex),
      M.exhaustive,
    )
    const isInitSelected = selectedIndex === INIT_INDEX

    const messageRows = pipe(
      model.entries,
      Array_.map((entry, arrayIndex) => {
        const absoluteIndex = model.startIndex + arrayIndex
        const isSelected = selectedIndex === absoluteIndex
        const isPausedHere =
          model.isPaused && model.pausedAtIndex === absoluteIndex

        return lazyMessageRow(String(absoluteIndex), messageRowView, [
          entry.tag,
          absoluteIndex,
          isSelected,
          isPausedHere,
          entry.timestamp - baseTimestamp,
          entry.isModelChanged,
        ])
      }),
      Array_.reverse,
    )

    return ul(
      [Class('message-list flex-1 overflow-y-auto min-h-0 overscroll-none')],
      [
        ...messageRows,
        initRowView(
          isInitSelected,
          model.isPaused && model.pausedAtIndex === INIT_INDEX,
        ),
      ],
    )
  }

  // PANEL

  const panelView = (model: Model): Html =>
    keyed('div')(
      'dt-panel',
      [
        Class(
          clsx(
            'fixed dt-panel dt-panel-wide bg-dt-bg border rounded-lg flex flex-col overflow-hidden font-mono text-dt',
            PANEL_POSITION_CLASS[position],
          ),
        ),
      ],
      [
        ...Option.map(maybeBanner, banner =>
          div(
            [
              Class(
                'px-3 py-2 border-b text-sm text-dt-muted font-mono shrink-0 leading-snug',
              ),
            ],
            [banner],
          ),
        ).pipe(Option.toArray),
        headerView(model),
        div(
          [Class('flex flex-1 min-h-0 dt-content')],
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

  const interactionBlocker = div([Class('dt-interaction-blocker')], [])

  return (model: Model): Html =>
    div(
      [],
      [
        ...OptionExt.when(
          model.isPaused && mode === 'TimeTravel',
          interactionBlocker,
        ).pipe(Option.toArray),
        ...OptionExt.when(model.isOpen, panelView(model)).pipe(Option.toArray),
        badgeView(model),
      ],
    )
}

// CREATE

const DEVTOOLS_HOST_ID = 'foldkit-devtools'

const createShadowContainer = (): Readonly<{
  container: HTMLElement
  shadow: ShadowRoot
}> => {
  const existingHost = document.getElementById(DEVTOOLS_HOST_ID)
  if (existingHost) {
    existingHost.remove()
  }

  const host = document.createElement('div')
  host.id = DEVTOOLS_HOST_ID
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })

  const styleElement = document.createElement('style')
  styleElement.textContent = overlayStyles
  shadow.appendChild(styleElement)

  const container = document.createElement('div')
  shadow.appendChild(container)

  return { container, shadow }
}

export const createOverlay = (
  store: DevtoolsStore,
  position: DevtoolsPosition,
  mode: DevtoolsMode,
  maybeBanner: Option.Option<string>,
) =>
  Effect.gen(function* () {
    const { container, shadow } = createShadowContainer()

    const flags: Effect.Effect<typeof Flags.Type> = Effect.gen(function* () {
      const storeState = yield* SubscriptionRef.get(store.stateRef)
      return {
        isMobile: window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches,
        ...toDisplayState(storeState),
      }
    })

    const init = (
      flags: typeof Flags.Type,
    ): [Model, ReadonlyArray<Command.Command<Message>>] => [
      {
        isOpen: false,
        ...flags,
        selectedIndex: INIT_INDEX,
        isFollowingLatest: true,
        maybeInspectedModel: Option.none(),
        maybeInspectedMessage: Option.none(),
        expandedPaths: HashSet.empty(),
        changedPaths: HashSet.empty(),
        affectedPaths: HashSet.empty(),
        inspectorTabs: Tabs.init({ id: INSPECTOR_TABS_ID }),
      },
      [],
    ]

    const overlayRuntime = makeElement({
      Model,
      Flags,
      flags,
      init,
      update: makeUpdate(store, shadow, mode),
      view: makeView(position, mode, maybeBanner),
      container,
      subscriptions: makeOverlaySubscriptions(store),
      devtools: false,
    })

    yield* Effect.forkDaemon(overlayRuntime())
  })
