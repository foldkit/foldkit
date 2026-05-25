import { clsx } from 'clsx'
import {
  Array as Array_,
  Context,
  Effect,
  Equal,
  Function,
  HashSet,
  Match as M,
  Number as Number_,
  Option,
  Order,
  Predicate,
  Queue,
  Record,
  Schema as S,
  Stream,
  String as String_,
  SubscriptionRef,
  pipe,
} from 'effect'

import * as Command from '../command/index.js'
import { lockScroll, unlockScroll } from '../dom/scrollLock.js'
import { OptionExt } from '../effectExtensions/index.js'
import {
  DEVTOOLS_HOST_ID,
  type Document,
  type Html,
  childAttributes,
  createKeyedLazy,
  createLazy,
  html,
} from '../html/index.js'
import { m } from '../message/index.js'
import { makeProgram } from '../runtime/runtime.js'
import type { DevToolsMode, DevToolsPosition } from '../runtime/runtime.js'
import * as Subscription from '../runtime/subscription.js'
import { evo } from '../struct/index.js'
import * as Listbox from '../ui/listbox/public.js'
import * as Slider from '../ui/slider/public.js'
import * as Tabs from '../ui/tabs/public.js'
import { overlayStyles } from './overlay-styles.js'
import { toInspectableValue } from './serialize.js'
import {
  type CommandRecord,
  type DevToolsStore,
  INIT_INDEX,
  type MountRecord,
  type StoreState,
} from './store.js'
import {
  GOT_MESSAGE_PATTERN,
  extractSubmodelInfo,
  isTagged,
} from './submodelPath.js'

const SubmodelFilterListbox = Listbox.create<string>()

// MODEL

const DisplayCommand = S.Struct({
  name: S.String,
  args: S.Option(S.Record(S.String, S.Unknown)),
})

const DisplayMount = S.Struct({
  name: S.String,
  args: S.Option(S.Record(S.String, S.Unknown)),
})

const DisplayEntry = S.Struct({
  tag: S.String,
  submodelPath: S.Array(S.String),
  maybeLeafTag: S.Option(S.String),
  commands: S.Array(DisplayCommand),
  mountStarts: S.Array(DisplayMount),
  mountEnds: S.Array(DisplayMount),
  timestamp: S.Number,
  isModelChanged: S.Boolean,
})

const INSPECTOR_TABS_ID = 'dt-inspector'
const SUBMODEL_FILTER_ID = 'dt-submodel-filter'
const SCRUBBER_SLIDER_ID = 'dt-scrubber'

const InspectorTabsModel = S.Struct({
  id: S.String,
  activeIndex: S.Number,
  focusedIndex: S.Number,
  activationMode: S.Literals(['Automatic', 'Manual']),
})

type InspectorTab = 'Model' | 'Message' | 'Commands' | 'Mounts'
const INSPECTOR_TABS: ReadonlyArray<InspectorTab> = [
  'Model',
  'Message',
  'Commands',
  'Mounts',
]
const InspectorTabs = Tabs.create<InspectorTab>()

/**
 * `S.Unknown` whose equivalence is reference equality. Effect 4's default
 * equivalence for `S.Unknown` is `Equal.equals`, which walks the value
 * structurally (hash + compareRecords) instead of falling back to `===` like
 * Effect 3. The DevTools overlay holds whole user Model and Message snapshots
 * in fields typed as `S.Unknown`, so the runtime's per-dispatch
 * `modelEquivalence` check would otherwise walk the entire payload three
 * times every time the user dispatches a Message. The snapshots are
 * through-traffic (different reference per frame iff different content),
 * which makes reference equality the correct comparison.
 */
const UnknownByReference = S.Unknown.pipe(
  S.overrideToEquivalence(() => (a, b) => a === b),
)

const Model = S.Struct({
  isOpen: S.Boolean,
  isMobile: S.Boolean,
  entries: S.Array(DisplayEntry),
  initCommands: S.Array(DisplayCommand),
  initMountStarts: S.Array(DisplayMount),
  startIndex: S.Number,
  isPaused: S.Boolean,
  pausedAtIndex: S.Number,
  selectedIndex: S.Number,
  isFollowingLatest: S.Boolean,
  isFollowingTop: S.Boolean,
  maybeInspectedModel: S.Option(UnknownByReference),
  maybeInspectedMessage: S.Option(UnknownByReference),
  submodelTags: S.Array(S.String),
  maybeSubmodelFilter: S.Option(S.String),
  submodelFilterListbox: Listbox.Model,
  expandedPaths: S.HashSet(S.String),
  changedPaths: S.HashSet(S.String),
  affectedPaths: S.HashSet(S.String),
  inspectorTabs: InspectorTabsModel,
  // NOTE: empirically, inlining `Slider.Model` here throws
  // "Cannot read properties of undefined (reading 'ast')" when running slider
  // tests, because slider imports html → runtime → overlay, and overlay
  // references Slider.Model mid-cycle. S.suspend defers the read until after
  // the cycle resolves. Inlining Listbox.Model works in practice but goes
  // through the same import chain; the exact cause of the asymmetry isn't
  // pinned down. Suspend is the conservative fix until the runtime ↔ overlay
  // cycle is broken at the source.
  scrubberSlider: S.suspend((): typeof Slider.Model => Slider.Model),
})
type Model = typeof Model.Type

const Flags = S.Struct({
  isMobile: S.Boolean,
  entries: S.Array(DisplayEntry),
  initCommands: S.Array(DisplayCommand),
  initMountStarts: S.Array(DisplayMount),
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
const ClickedScrollToTopPill = m('ClickedScrollToTopPill')
const ScrolledMessageList = m('ScrolledMessageList', { scrollTop: S.Number })
const CompletedClear = m('CompletedClear')
const LockedScroll = m('LockedScroll')
const UnlockedScroll = m('UnlockedScroll')
const ScrolledToTop = m('ScrolledToTop')
const CrossedMobileBreakpoint = m('CrossedMobileBreakpoint', {
  isMobile: S.Boolean,
})
const ReceivedInspectedState = m('ReceivedInspectedState', {
  model: S.Unknown,
  maybeMessage: S.Option(S.Unknown),
  changedPaths: S.HashSet(S.String),
  affectedPaths: S.HashSet(S.String),
})
const ToggledTreeNode = m('ToggledTreeNode', { path: S.String })
const GotInspectorTabsMessage = m('GotInspectorTabsMessage', {
  message: S.Unknown,
})
const ReceivedStoreUpdate = m('ReceivedStoreUpdate', {
  entries: S.Array(DisplayEntry),
  initCommands: S.Array(DisplayCommand),
  initMountStarts: S.Array(DisplayMount),
  startIndex: S.Number,
  isPaused: S.Boolean,
  pausedAtIndex: S.Number,
})
const GotSubmodelFilterMessage = m('GotSubmodelFilterMessage', {
  message: Listbox.Message,
})
// NOTE: suspend for the same init-order reason as scrubberSlider above.
const GotScrubberSliderMessage = m('GotScrubberSliderMessage', {
  message: S.suspend((): typeof Slider.Message => Slider.Message),
})

const Message = S.Union([
  ClickedToggle,
  ClickedRow,
  ClickedResume,
  ClickedClear,
  ClickedFollowLatest,
  ClickedScrollToTopPill,
  ScrolledMessageList,
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
  GotSubmodelFilterMessage,
  GotScrubberSliderMessage,
])
type Message = typeof Message.Type

// HELPERS

const MILLIS_PER_SECOND = 1000
const MOBILE_BREAKPOINT = 767
const MOBILE_BREAKPOINT_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`
const TREE_INDENT_PX = 12
const MAX_PREVIEW_KEYS = 3
const ALL_MESSAGES_VALUE = ''
const NO_COMMANDS: ReadonlyArray<typeof DisplayCommand.Type> = []
const NO_MOUNTS: ReadonlyArray<typeof DisplayMount.Type> = []

const formatTimeDelta = (deltaMs: number): string =>
  M.value(deltaMs).pipe(
    M.when(0, () => '0ms'),
    M.when(Number_.isLessThan(MILLIS_PER_SECOND), ms => `+${Math.round(ms)}ms`),
    M.orElse(ms => `+${(ms / MILLIS_PER_SECOND).toFixed(1)}s`),
  )

const MESSAGE_LIST_SELECTOR = '.message-list'

// NOTE: scrubber slider value space is independent of the store's host
// indices. Slider value 0 represents init; 1..entries.length represents
// positions after each buffered message. Passing pausedAtIndex (a host
// index) straight into setValue, or treating ChangedValue.value as a host
// index in jumpTo, will silently produce wrong navigation. Translate at
// the boundaries via the helpers below.
const hostIndexToSliderValue = (
  hostIndex: number,
  startIndex: number,
): number => (hostIndex === INIT_INDEX ? 0 : hostIndex - startIndex + 1)

const sliderValueToHostIndex = (
  sliderValue: number,
  startIndex: number,
): number => (sliderValue === 0 ? INIT_INDEX : startIndex + sliderValue - 1)

const SCROLL_FOLLOW_THRESHOLD_PX = 8

const computeSubmodelTags = (
  entries: ReadonlyArray<typeof DisplayEntry.Type>,
): ReadonlyArray<string> =>
  pipe(
    entries,
    Array_.flatMap(({ submodelPath }) => submodelPath),
    Array_.dedupe,
    Array_.sort(Order.String),
  )

const toDisplayCommand = (
  command: CommandRecord,
): typeof DisplayCommand.Type => ({
  name: command.name,
  args: Option.fromNullishOr(command.args),
})

const toDisplayMount = (mount: MountRecord): typeof DisplayMount.Type => ({
  name: mount.name,
  args: Option.fromNullishOr(mount.args),
})

const toDisplayEntries = ({ entries }: StoreState) =>
  Array_.map(entries, entry => {
    const { submodelPath, maybeLeafTag } = extractSubmodelInfo(
      entry.tag,
      entry.message,
    )
    return {
      tag: entry.tag,
      submodelPath,
      maybeLeafTag,
      commands: Array_.map(entry.commands, toDisplayCommand),
      mountStarts: Array_.map(entry.mountStarts, toDisplayMount),
      mountEnds: Array_.map(entry.mountEnds, toDisplayMount),
      timestamp: entry.timestamp,
      isModelChanged: entry.isModelChanged,
    }
  })

const toDisplayState = (state: StoreState) => ({
  entries: toDisplayEntries(state),
  initCommands: Array_.map(state.initCommands, toDisplayCommand),
  initMountStarts: Array_.map(state.initMountStarts, toDisplayMount),
  startIndex: state.startIndex,
  isPaused: state.isPaused,
  pausedAtIndex: state.pausedAtIndex,
})

const isExpandable = Predicate.isObjectOrArray

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
    M.when(Predicate.isObject, objectPreview),
    M.orElse(() => ''),
  )

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

class StoreService extends Context.Service<StoreService, DevToolsStore>()(
  'foldkit/DevToolsStore',
) {}

class ShadowRootService extends Context.Service<
  ShadowRootService,
  ShadowRoot
>()('foldkit/DevToolsShadowRoot') {}

export const LockScroll = Command.define(
  'LockScroll',
  LockedScroll,
)(lockScroll.pipe(Effect.as(LockedScroll())))

export const UnlockScroll = Command.define(
  'UnlockScroll',
  UnlockedScroll,
)(unlockScroll.pipe(Effect.as(UnlockedScroll())))

const buildInspectionEffect = (index: number) =>
  Effect.gen(function* () {
    const store = yield* StoreService
    const model = yield* store.getModelAtIndex(index)
    const maybeMessage = yield* store.getMessageAtIndex(index)
    const diff = yield* store.getDiffAtIndex(index)
    return ReceivedInspectedState({ model, maybeMessage, ...diff })
  })

export const JumpTo = Command.define(
  'JumpTo',
  { index: S.Number },
  CompletedJump,
)(({ index }) =>
  Effect.gen(function* () {
    const store = yield* StoreService
    yield* store.jumpTo(index)
    return CompletedJump()
  }),
)

export const InspectState = Command.define(
  'InspectState',
  { index: S.Number },
  ReceivedInspectedState,
)(({ index }) => buildInspectionEffect(index))

export const InspectLatest = Command.define(
  'InspectLatest',
  ReceivedInspectedState,
)(
  Effect.gen(function* () {
    const store = yield* StoreService
    const state = yield* SubscriptionRef.get(store.stateRef)
    const latestIndex = Array_.isReadonlyArrayEmpty(state.entries)
      ? INIT_INDEX
      : state.startIndex + state.entries.length - 1
    return yield* buildInspectionEffect(latestIndex)
  }),
)

export const Resume = Command.define(
  'Resume',
  CompletedResume,
)(
  Effect.gen(function* () {
    const store = yield* StoreService
    yield* store.resume
    return CompletedResume()
  }),
)

export const Clear = Command.define(
  'Clear',
  CompletedClear,
)(
  Effect.gen(function* () {
    const store = yield* StoreService
    yield* store.clear
    return CompletedClear()
  }),
)

export const ScrollToTop = Command.define(
  'ScrollToTop',
  ScrolledToTop,
)(
  Effect.gen(function* () {
    const shadow = yield* ShadowRootService
    const messageList = shadow.querySelector(MESSAGE_LIST_SELECTOR)
    if (messageList instanceof HTMLElement) {
      messageList.scrollTop = 0
    }
    return ScrolledToTop()
  }),
)

const makeUpdate = (
  store: DevToolsStore,
  shadow: ShadowRoot,
  mode: DevToolsMode,
) => {
  const provideContext = <A, E>(
    effect: Effect.Effect<A, E, StoreService | ShadowRootService>,
  ): Effect.Effect<A, E, never> =>
    effect.pipe(
      Effect.provideService(StoreService, store),
      Effect.provideService(ShadowRootService, shadow),
    )

  const inspectLatest = Command.mapEffect(InspectLatest(), provideContext)
  const resume = Command.mapEffect(Resume(), provideContext)
  const clear = Command.mapEffect(Clear(), provideContext)
  const scrollToTop = Command.mapEffect(ScrollToTop(), provideContext)

  const jumpTo = (index: number) =>
    Command.mapEffect(JumpTo({ index }), provideContext)
  const inspectState = (index: number) =>
    Command.mapEffect(InspectState({ index }), provideContext)

  const toggleScrollLock = (shouldLock: boolean) =>
    shouldLock ? LockScroll() : UnlockScroll()

  return (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
      M.withReturnType<UpdateReturn>(),
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
            isFollowingTop: () => true,
            expandedPaths: () => HashSet.empty<string>(),
            changedPaths: () => HashSet.empty<string>(),
            affectedPaths: () => HashSet.empty<string>(),
          }),
          [resume, inspectLatest, scrollToTop],
        ],
        ClickedClear: () => [
          evo(model, {
            selectedIndex: () => INIT_INDEX,
            isFollowingLatest: () => true,
            isFollowingTop: () => true,
            maybeSubmodelFilter: () => Option.none(),
            expandedPaths: () => HashSet.empty<string>(),
            changedPaths: () => HashSet.empty<string>(),
            affectedPaths: () => HashSet.empty<string>(),
          }),
          [clear, inspectLatest, scrollToTop],
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
              isFollowingTop: () => true,
              expandedPaths: () => HashSet.empty<string>(),
              changedPaths: () => HashSet.empty<string>(),
              affectedPaths: () => HashSet.empty<string>(),
            }),
            [inspectLatest, scrollToTop],
          ]
        },
        ClickedScrollToTopPill: () => [
          evo(model, {
            isFollowingTop: () => true,
          }),
          [scrollToTop],
        ],
        ScrolledMessageList: ({ scrollTop }) => {
          const isAtTop = scrollTop <= SCROLL_FOLLOW_THRESHOLD_PX
          return isAtTop === model.isFollowingTop
            ? [model, []]
            : [evo(model, { isFollowingTop: () => isAtTop }), []]
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
          const [nextTabsModel, tabsCommands] = InspectorTabs.update(
            model.inspectorTabs,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            tabsMessage as Tabs.Message,
          )

          return [
            evo(model, {
              inspectorTabs: () => nextTabsModel,
            }),
            Command.mapMessages(tabsCommands, innerMessage =>
              GotInspectorTabsMessage({ message: innerMessage }),
            ),
          ]
        },
        ToggledTreeNode: ({ path }) => [
          evo(model, {
            expandedPaths: paths =>
              HashSet.has(paths, path)
                ? HashSet.remove(paths, path)
                : HashSet.add(paths, path),
          }),
          [],
        ],
        ReceivedStoreUpdate: ({
          entries,
          initCommands,
          initMountStarts,
          startIndex,
          isPaused,
          pausedAtIndex,
        }) => {
          const shouldFollowSelection = M.value(mode).pipe(
            M.when('TimeTravel', () => !isPaused),
            M.when('Inspect', () => model.isFollowingLatest),
            M.exhaustive,
          )

          const shouldFollowScroll = M.value(mode).pipe(
            M.when('TimeTravel', () => !isPaused && model.isFollowingTop),
            M.when('Inspect', () => model.isFollowingTop),
            M.exhaustive,
          )

          const latestIndex = Array_.match(entries, {
            onEmpty: () => INIT_INDEX,
            onNonEmpty: () => startIndex + entries.length - 1,
          })

          const nextSubmodelTags = computeSubmodelTags(entries)
          const isFilterStale = Option.exists(
            model.maybeSubmodelFilter,
            filterTag => !Array_.contains(nextSubmodelTags, filterTag),
          )

          return [
            evo(model, {
              entries: () => entries,
              initCommands: () => initCommands,
              initMountStarts: () => initMountStarts,
              startIndex: () => startIndex,
              isPaused: () => isPaused,
              pausedAtIndex: () => pausedAtIndex,
              submodelTags: () => nextSubmodelTags,
              maybeSubmodelFilter: current =>
                isFilterStale ? Option.none() : current,
              submodelFilterListbox: current =>
                isFilterStale
                  ? evo(current, {
                      maybeSelectedItem: () => Option.some(ALL_MESSAGES_VALUE),
                    })
                  : current,
              selectedIndex: current =>
                shouldFollowSelection ? latestIndex : current,
              scrubberSlider: current => {
                const sliderMax = entries.length
                const targetSliderValue = isPaused
                  ? hostIndexToSliderValue(pausedAtIndex, startIndex)
                  : sliderMax
                return Slider.reflectValue(
                  Slider.reflectRange(current, { min: 0, max: sliderMax }),
                  targetSliderValue,
                )
              },
            }),
            [
              ...(shouldFollowSelection ? [inspectLatest] : []),
              ...(shouldFollowScroll ? [scrollToTop] : []),
            ],
          ]
        },
        GotSubmodelFilterMessage: ({ message: listboxMessage }) => {
          const [nextListboxModel, listboxCommands, maybeOutMessage] =
            SubmodelFilterListbox.update(
              model.submodelFilterListbox,
              listboxMessage,
            )
          const mappedCommands = Command.mapMessages(
            listboxCommands,
            innerMessage => GotSubmodelFilterMessage({ message: innerMessage }),
          )

          return Option.match(maybeOutMessage, {
            onNone: (): UpdateReturn => [
              evo(model, { submodelFilterListbox: () => nextListboxModel }),
              mappedCommands,
            ],
            onSome: M.type<Listbox.OutMessage>().pipe(
              M.withReturnType<UpdateReturn>(),
              M.tagsExhaustive({
                Selected: ({ value }) => [
                  evo(model, {
                    maybeSubmodelFilter: () =>
                      Option.liftPredicate(value, String_.isNonEmpty),
                    submodelFilterListbox: () => nextListboxModel,
                  }),
                  mappedCommands,
                ],
              }),
            ),
          })
        },
        GotScrubberSliderMessage: ({ message: sliderMessage }) => {
          const [nextSlider, sliderCommands, maybeOutMessage] = Slider.update(
            model.scrubberSlider,
            sliderMessage,
          )

          const mappedSliderCommands = Command.mapMessages(
            sliderCommands,
            innerMessage => GotScrubberSliderMessage({ message: innerMessage }),
          )

          const additionalCommands = Option.match(maybeOutMessage, {
            onNone: () => [],
            onSome: outMessage =>
              M.value(outMessage).pipe(
                M.tagsExhaustive({
                  ChangedValue: ({ value }) => {
                    const hostIndex = sliderValueToHostIndex(
                      value,
                      model.startIndex,
                    )
                    return [jumpTo(hostIndex), inspectState(hostIndex)]
                  },
                }),
              ),
          })

          return [
            evo(model, { scrubberSlider: () => nextSlider }),
            [...mappedSliderCommands, ...additionalCommands],
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

const makeOverlaySubscriptions = (store: DevToolsStore, shadow: ShadowRoot) => {
  const sliderSubscriptions = Slider.subscriptionsForRoot(() => shadow)

  const scrubberSubscriptions = Subscription.lift({
    scrubberPointer: sliderSubscriptions.dragPointer,
    scrubberEscape: sliderSubscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.scrubberSlider,
    toParentMessage: message => GotScrubberSliderMessage({ message }),
  })

  const ownSubscriptions = Subscription.make<Model, Message>()(_entry => ({
    storeUpdates: Subscription.persistent(
      Stream.concat(
        Stream.fromEffect(
          SubscriptionRef.get(store.stateRef).pipe(
            Effect.map(state => ReceivedStoreUpdate(toDisplayState(state))),
          ),
        ),
        Stream.map(SubscriptionRef.changes(store.stateRef), state =>
          ReceivedStoreUpdate(toDisplayState(state)),
        ),
      ),
    ),
    mobileBreakpoint: Subscription.persistent(
      Stream.callback<Message>(queue =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
            const handler = (event: MediaQueryListEvent) => {
              Queue.offerUnsafe(
                queue,
                CrossedMobileBreakpoint({ isMobile: event.matches }),
              )
            }
            mediaQuery.addEventListener('change', handler)
            return { mediaQuery, handler }
          }),
          ({ mediaQuery, handler }) =>
            Effect.sync(() =>
              mediaQuery.removeEventListener('change', handler),
            ),
        ).pipe(Effect.flatMap(() => Effect.never)),
      ),
    ),
  }))

  return Subscription.aggregate<Model, Message>()(
    ownSubscriptions,
    scrubberSubscriptions,
  )
}

// VIEW

const indexClass = 'text-2xs text-dt-muted font-mono min-w-5'

const headerButtonClass =
  'dt-header-button bg-transparent border-none text-dt-muted cursor-pointer text-base font-mono transition-colors'

const ROW_BASE =
  'dt-row flex items-center py-1 px-1 cursor-pointer gap-1.5 transition-colors border-b'

const BADGE_POSITION_CLASS: Record<DevToolsPosition, string> = {
  BottomRight: 'dt-pos-br',
  BottomLeft: 'dt-pos-bl',
  TopRight: 'dt-pos-tr',
  TopLeft: 'dt-pos-tl',
}

const PANEL_POSITION_CLASS: Record<DevToolsPosition, string> = {
  BottomRight: 'dt-panel-br',
  BottomLeft: 'dt-panel-bl',
  TopRight: 'dt-panel-tr',
  TopLeft: 'dt-panel-tl',
}

const makeView = (
  position: DevToolsPosition,
  mode: DevToolsMode,
  shadow: ShadowRoot,
  maybeBanner: Option.Option<string>,
): ((model: Model) => Document) => {
  const h = html<Message>()

  const lazyTreeNode = createKeyedLazy()
  const lazyMessageRow = createKeyedLazy()
  const lazyTabContent = createKeyedLazy()
  const lazyMessageList = createLazy()

  // JSON TREE

  const leafValueView = (value: unknown): Html =>
    M.value(value).pipe(
      M.when(Predicate.isNull, () =>
        h.span([h.Key('value'), h.Class('json-null italic')], ['null']),
      ),
      M.when(Predicate.isUndefined, () =>
        h.span([h.Key('value'), h.Class('json-null italic')], ['undefined']),
      ),
      M.when(Predicate.isString, stringValue =>
        h.span([h.Key('value'), h.Class('json-string')], [`"${stringValue}"`]),
      ),
      M.when(Predicate.isNumber, numberValue =>
        h.span([h.Key('value'), h.Class('json-number')], [String(numberValue)]),
      ),
      M.when(Predicate.isBoolean, booleanValue =>
        h.span(
          [h.Key('value'), h.Class('json-boolean')],
          [String(booleanValue)],
        ),
      ),
      M.orElse(unknownValue =>
        h.span([h.Key('value'), h.Class('json-null')], [String(unknownValue)]),
      ),
    )

  // NOTE: each row-child view declares an explicit key. snabbdom's
  // `sameVnode` only checks `key + sel`, and foldkit element vnodes carry
  // `sel = tagName` with classes stored in `data.class`. Without per-role
  // keys, two unkeyed spans with different classes (e.g. `.json-key` and
  // `.diff-dot`) are sameVnode to snabbdom, so a single DOM span gets
  // recycled across roles as rows transition shape \u2014 and the text-node
  // children from the old role can leak into the new role's element.
  // Keying by role pins each slot to its own DOM element.
  const keyView = (key: string): Html =>
    h.span([h.Key('key'), h.Class('json-key')], [`${key}:\u00a0`])

  const CHEVRON_RIGHT = 'M8.25 4.5l7.5 7.5-7.5 7.5'
  const CHEVRON_DOWN = 'M19.5 8.25l-7.5 7.5-7.5-7.5'

  const arrowView = (isExpanded: boolean): Html =>
    h.svg(
      [
        h.Key('arrow'),
        h.AriaHidden(true),
        h.Class('json-arrow shrink-0'),
        h.Xmlns('http://www.w3.org/2000/svg'),
        h.Fill('none'),
        h.ViewBox('0 0 24 24'),
        h.StrokeWidth('2'),
        h.Stroke('currentColor'),
      ],
      [
        h.path(
          [
            h.StrokeLinecap('round'),
            h.StrokeLinejoin('round'),
            h.D(isExpanded ? CHEVRON_DOWN : CHEVRON_RIGHT),
          ],
          [],
        ),
      ],
    )

  const tagLabelView = (tag: string): Html =>
    h.span([h.Key('tag'), h.Class('json-tag')], [tag])

  const diffDotView: Html = h.span([h.Key('diffdot'), h.Class('diff-dot')], [])
  const inlineDiffDotView: Html = h.span([h.Class('diff-dot-inline')], [])

  type FlatNode = Readonly<{
    value: unknown
    treePath: string
    depth: number
    key: string
    isExpandable: boolean
    isExpanded: boolean
    isChanged: boolean
    isAffected: boolean
    isRoot: boolean
    tag: string
  }>

  type FlattenConfig = Readonly<{
    value: unknown
    treePath: string
    rootPath: string
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
      rootPath,
      expandedPaths,
      changedPaths,
      affectedPaths,
      accumulator,
      indentRootChildren,
    } = shared
    const isRoot = treePath === rootPath
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
      isRoot,
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
    } else if (Predicate.isObject(value)) {
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
    isRoot: boolean,
    tag: string,
  ): Html => {
    const indent = h.Style({ paddingLeft: `${depth * TREE_INDENT_PX}px` })
    const hasDiffDot = isChanged || isAffected

    if (!nodeIsExpandable) {
      return h.div(
        [
          h.Key(treePath),
          h.Class(
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

    const preview = isExpanded
      ? Array.isArray(value)
        ? `(${value.length})`
        : ''
      : collapsedPreview(value)

    return h.div(
      [
        h.Key(treePath),
        h.Class(
          clsx('tree-row flex items-center gap-px font-mono text-2xs', {
            'tree-row-expandable cursor-pointer': !isRoot,
            'diff-changed': isChanged,
          }),
        ),
        indent,
        ...(isRoot ? [] : [h.OnClick(ToggledTreeNode({ path: treePath }))]),
      ],
      [
        ...(isRoot ? [] : [arrowView(isExpanded)]),
        ...(!isRoot && hasDiffDot ? [diffDotView] : []),
        ...(String_.isNonEmpty(key) ? [keyView(key)] : []),
        ...(String_.isNonEmpty(tag) ? [tagLabelView(tag)] : []),
        h.span([h.Key('value'), h.Class('json-preview')], [preview]),
      ],
    )
  }

  const renderFlatNode = (node: FlatNode): Html =>
    lazyTreeNode(node.treePath, flatNodeView, [
      node.value,
      node.treePath,
      node.depth,
      node.key,
      node.isExpandable,
      node.isExpanded,
      node.isChanged,
      node.isAffected,
      node.isRoot,
      node.tag,
    ])

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
      value: toInspectableValue(value),
      treePath: rootPath,
      rootPath,
      expandedPaths,
      changedPaths,
      affectedPaths,
      depth: 0,
      key: Option.getOrElse(maybeRootLabel, () => ''),
      accumulator: nodes,
      indentRootChildren,
    })

    return h.div(
      [
        h.Class(
          'inspector-tree flex-1 overflow-auto min-h-0 min-w-0 overscroll-none',
        ),
      ],
      nodes.map(renderFlatNode),
    )
  }

  const inspectedTimestamp = (model: Model): string => {
    const selectedIndex = selectedHistoryIndex(model)

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

  const emptyInspectorView: Html = h.div(
    [
      h.Class(
        'flex-1 flex items-center justify-center text-dt-muted text-2xs font-mono min-w-0',
      ),
    ],
    ['Click a message to inspect'],
  )

  const noMessageView: Html = h.div(
    [
      h.Class(
        'flex-1 flex items-center justify-center text-dt-muted text-2xs font-mono min-w-0',
      ),
    ],
    ['init: no Message'],
  )

  const modelTabContent = (
    inspectedModel: unknown,
    expandedPaths: HashSet.HashSet<string>,
    changedPaths: HashSet.HashSet<string>,
    affectedPaths: HashSet.HashSet<string>,
  ): Html =>
    treeView(
      inspectedModel,
      'root',
      expandedPaths,
      changedPaths,
      affectedPaths,
      Option.none(),
      true,
    )

  const unwrapIfFiltered = (
    message: unknown,
    maybeSubmodelFilter: Option.Option<string>,
  ): unknown => {
    if (Option.isNone(maybeSubmodelFilter)) {
      return message
    }
    const { value: filterTag } = maybeSubmodelFilter

    let current = message
    let matched = false
    while (isTagged(current) && GOT_MESSAGE_PATTERN.test(current._tag)) {
      if (current._tag === filterTag) {
        matched = true
      }
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const inner = (current as Record<string, unknown>)?.['message']
      if (inner === undefined) {
        break
      }
      current = inner
      if (matched) {
        break
      }
    }

    return current
  }

  const messageTabContent = (
    maybeInspectedMessage: Option.Option<unknown>,
    maybeSubmodelFilter: Option.Option<string>,
    expandedPaths: HashSet.HashSet<string>,
    timestamp: string,
  ): Html =>
    Option.match(maybeInspectedMessage, {
      onNone: () => noMessageView,
      onSome: rawMessage => {
        const message = unwrapIfFiltered(rawMessage, maybeSubmodelFilter)

        return h.div(
          [h.Class('flex flex-col flex-1 min-h-0 min-w-0')],
          [
            h.div(
              [
                h.Class(
                  'px-2 py-1 border-b text-2xs text-dt-muted font-mono shrink-0',
                ),
              ],
              [timestamp],
            ),
            h.div(
              [h.Class('flex flex-col flex-1 min-h-0 min-w-0 pt-1 pl-1')],
              [
                treeView(
                  message,
                  'root',
                  expandedPaths,
                  HashSet.empty(),
                  HashSet.empty(),
                  Option.none(),
                  false,
                ),
              ],
            ),
          ],
        )
      },
    })

  const selectedHistoryIndex = (model: Model): number => {
    const lastIndex = Array_.match(model.entries, {
      onEmpty: () => INIT_INDEX,
      onNonEmpty: () => model.startIndex + model.entries.length - 1,
    })

    return M.value(mode).pipe(
      M.when('TimeTravel', () =>
        model.isPaused ? model.pausedAtIndex : lastIndex,
      ),
      M.when('Inspect', () => model.selectedIndex),
      M.exhaustive,
    )
  }

  const selectedCommands = (
    model: Model,
  ): ReadonlyArray<typeof DisplayCommand.Type> => {
    const selectedIndex = selectedHistoryIndex(model)

    if (selectedIndex === INIT_INDEX) {
      return model.initCommands
    } else {
      return pipe(
        model.entries,
        Array_.get(selectedIndex - model.startIndex),
        Option.map(entry => entry.commands),
        Option.getOrElse(() => NO_COMMANDS),
      )
    }
  }

  const flattenCommand = (
    command: typeof DisplayCommand.Type,
    index: number,
    expandedPaths: HashSet.HashSet<string>,
  ): ReadonlyArray<FlatNode> => {
    const taggedValue = Option.match(command.args, {
      onNone: () => ({ _tag: command.name }),
      onSome: argsValue => ({ ...argsValue, _tag: command.name }),
    })
    const rootPath = `command-${index}`
    const nodes: Array<FlatNode> = []
    flattenTree({
      value: toInspectableValue(taggedValue),
      treePath: rootPath,
      rootPath,
      expandedPaths,
      changedPaths: HashSet.empty(),
      affectedPaths: HashSet.empty(),
      depth: 0,
      key: '',
      accumulator: nodes,
      indentRootChildren: false,
    })
    return nodes
  }

  const commandsTabContent = (
    commands: ReadonlyArray<typeof DisplayCommand.Type>,
    expandedPaths: HashSet.HashSet<string>,
  ): Html =>
    Array_.match(commands, {
      onEmpty: () =>
        h.div(
          [
            h.Class(
              'flex-1 flex items-center justify-center text-dt-muted text-2xs font-mono min-w-0',
            ),
          ],
          ['No Commands returned'],
        ),
      onNonEmpty: commandList =>
        h.div(
          [
            h.Class(
              'flex flex-col flex-1 min-h-0 min-w-0 overflow-auto overscroll-none',
            ),
          ],
          Array_.map(commandList, (command, index) =>
            h.div(
              [h.Class('flex items-start px-2 py-1 border-b gap-1.5')],
              [
                h.span([h.Class(indexClass)], [String(index + 1)]),
                h.div(
                  [h.Class('flex flex-col flex-1 min-w-0')],
                  Array_.map(
                    flattenCommand(command, index, expandedPaths),
                    renderFlatNode,
                  ),
                ),
              ],
            ),
          ),
        ),
    })

  type SelectedMountActivity = Readonly<{
    starts: ReadonlyArray<typeof DisplayMount.Type>
    ends: ReadonlyArray<typeof DisplayMount.Type>
  }>

  const selectedMountActivity = (model: Model): SelectedMountActivity => {
    const selectedIndex = selectedHistoryIndex(model)

    if (selectedIndex === INIT_INDEX) {
      return { starts: model.initMountStarts, ends: NO_MOUNTS }
    } else {
      return pipe(
        model.entries,
        Array_.get(selectedIndex - model.startIndex),
        Option.match({
          onNone: () => ({ starts: NO_MOUNTS, ends: NO_MOUNTS }),
          onSome: entry => ({
            starts: entry.mountStarts,
            ends: entry.mountEnds,
          }),
        }),
      )
    }
  }

  const flattenMount = (
    mount: typeof DisplayMount.Type,
    sectionLabel: string,
    index: number,
    expandedPaths: HashSet.HashSet<string>,
  ): ReadonlyArray<FlatNode> => {
    const taggedValue = Option.match(mount.args, {
      onNone: () => ({ _tag: mount.name }),
      onSome: argsValue => ({ ...argsValue, _tag: mount.name }),
    })
    const rootPath = `mount-${sectionLabel}-${index}`
    const nodes: Array<FlatNode> = []
    flattenTree({
      value: toInspectableValue(taggedValue),
      treePath: rootPath,
      rootPath,
      expandedPaths,
      changedPaths: HashSet.empty(),
      affectedPaths: HashSet.empty(),
      depth: 0,
      key: '',
      accumulator: nodes,
      indentRootChildren: false,
    })
    return nodes
  }

  const mountListSection = (
    label: string,
    mounts: ReadonlyArray<typeof DisplayMount.Type>,
    expandedPaths: HashSet.HashSet<string>,
  ): Html =>
    h.div(
      [h.Class('flex flex-col shrink-0')],
      [
        h.div(
          [
            h.Class(
              'px-2 py-1 border-b text-2xs text-dt-muted font-mono shrink-0',
            ),
          ],
          [label],
        ),
        ...Array_.map(mounts, (mount, index) =>
          h.div(
            [h.Class('flex items-start px-2 py-1 border-b gap-1.5')],
            [
              h.span([h.Class(indexClass)], [String(index + 1)]),
              h.div(
                [h.Class('flex flex-col flex-1 min-w-0')],
                Array_.map(
                  flattenMount(mount, label, index, expandedPaths),
                  renderFlatNode,
                ),
              ),
            ],
          ),
        ),
      ],
    )

  const mountsTabContent = (
    starts: ReadonlyArray<typeof DisplayMount.Type>,
    ends: ReadonlyArray<typeof DisplayMount.Type>,
    expandedPaths: HashSet.HashSet<string>,
  ): Html => {
    const hasAny =
      Array_.isReadonlyArrayNonEmpty(starts) ||
      Array_.isReadonlyArrayNonEmpty(ends)

    if (!hasAny) {
      return h.div(
        [
          h.Class(
            'flex-1 flex items-center justify-center text-dt-muted text-2xs font-mono min-w-0',
          ),
        ],
        ['No Mounts during this render'],
      )
    }

    return h.div(
      [
        h.Class(
          'flex flex-col flex-1 min-h-0 min-w-0 overflow-auto overscroll-none',
        ),
      ],
      [
        ...(Array_.isReadonlyArrayNonEmpty(starts)
          ? [mountListSection('Started', starts, expandedPaths)]
          : []),
        ...(Array_.isReadonlyArrayNonEmpty(ends)
          ? [mountListSection('Ended', ends, expandedPaths)]
          : []),
      ],
    )
  }

  const inspectorTabContent = (
    model: Model,
    tab: InspectorTab,
    inspectedModel: unknown,
  ): Html =>
    M.value(tab).pipe(
      M.when('Model', () =>
        lazyTabContent('Model', modelTabContent, [
          inspectedModel,
          model.expandedPaths,
          model.changedPaths,
          model.affectedPaths,
        ]),
      ),
      M.when('Message', () =>
        lazyTabContent('Message', messageTabContent, [
          model.maybeInspectedMessage,
          model.maybeSubmodelFilter,
          model.expandedPaths,
          inspectedTimestamp(model),
        ]),
      ),
      M.when('Commands', () =>
        lazyTabContent('Commands', commandsTabContent, [
          selectedCommands(model),
          model.expandedPaths,
        ]),
      ),
      M.when('Mounts', () => {
        const { starts, ends } = selectedMountActivity(model)
        return lazyTabContent('Mounts', mountsTabContent, [
          starts,
          ends,
          model.expandedPaths,
        ])
      }),
      M.exhaustive,
    )

  const inspectorPaneView = (model: Model): Html =>
    h.div(
      [
        h.Class(
          'flex flex-col border-l min-w-0 min-h-0 flex-1 dt-inspector-pane',
        ),
      ],
      [
        h.submodel({
          slotId: model.inspectorTabs.id,
          model: model.inspectorTabs,
          view: InspectorTabs.view,
          viewInputs: {
            tabs: INSPECTOR_TABS,
            ariaLabel: 'Inspector tabs',
            toView: ({ tablist, tabs, activeIndex }) =>
              h.div(
                [h.Class('flex flex-col flex-1 min-h-0')],
                [
                  h.div(
                    [...tablist, h.Class('flex border-b shrink-0')],
                    tabs.map(tab =>
                      h.button(
                        [
                          ...tab.tab,
                          h.Class(
                            clsx(
                              'dt-tab-button cursor-pointer text-base font-mono px-3 py-1',
                              tab.isActive
                                ? 'text-dt dt-tab-active'
                                : 'text-dt-muted',
                            ),
                          ),
                        ],
                        [h.span([], [tab.value])],
                      ),
                    ),
                  ),
                  ...tabs.map(tab =>
                    h.div(
                      [
                        ...tab.panel,
                        h.Class('flex flex-col flex-1 min-h-0 min-w-0'),
                        h.Hidden(tab.index !== activeIndex),
                        ...(tab.index === activeIndex
                          ? []
                          : [h.Style({ display: 'none' })]),
                      ],
                      [
                        Option.match(model.maybeInspectedModel, {
                          onNone: () => emptyInspectorView,
                          onSome: inspectedModel =>
                            inspectorTabContent(
                              model,
                              tab.value,
                              inspectedModel,
                            ),
                        }),
                      ],
                    ),
                  ),
                ],
              ),
          },
          toParentMessage: message => GotInspectorTabsMessage({ message }),
        }),
      ],
    )

  // MESSAGE LIST

  const badgeView = (model: Model): Html =>
    h.button(
      [
        h.Class(
          clsx(
            'fixed bg-dt-bg text-dt cursor-pointer flex flex-col items-center justify-center font-mono outline-none dt-badge',
            BADGE_POSITION_CLASS[position],
            model.isPaused ? 'dt-badge-paused' : 'dt-badge-accent',
          ),
        ),
        h.Style({ width: '22px', height: '56px', fontSize: '10px' }),
        h.OnClick(ClickedToggle()),
      ],
      [
        model.isOpen
          ? h.svg(
              [
                h.AriaHidden(true),
                h.Xmlns('http://www.w3.org/2000/svg'),
                h.Fill('none'),
                h.ViewBox('0 0 24 24'),
                h.StrokeWidth('1.5'),
                h.Stroke('currentColor'),
                h.Style({ width: '12px', height: '12px' }),
              ],
              [
                h.path(
                  [
                    h.StrokeLinecap('round'),
                    h.StrokeLinejoin('round'),
                    h.D('M6 18L18 6M6 6l12 12'),
                  ],
                  [],
                ),
              ],
            )
          : h.div(
              [
                h.Class(
                  clsx(
                    'flex flex-col items-center gap-0.5 font-semibold tracking-wider leading-none',
                    model.isPaused ? 'text-dt-bg' : 'text-dt-muted',
                  ),
                ),
              ],
              [h.span([], ['D']), h.span([], ['E']), h.span([], ['V'])],
            ),
      ],
    )

  const headerClass =
    'flex items-center justify-between px-3 py-1.5 border-b shrink-0'

  const actionButtonClass =
    'dt-resume-button bg-transparent border-none text-dt-live cursor-pointer text-base font-mono font-medium'

  const statusClass = 'text-base font-mono'

  const clearHistoryButton: Html = h.button(
    [h.Class(headerButtonClass), h.OnClick(ClickedClear())],
    ['Clear history'],
  )

  const submodelLabel = (tag: string): string =>
    pipe(tag, String_.replace(/^Got/, ''), String_.replace(/Message$/, ''))

  const CHECK_ICON = 'M4.5 12.75l6 6 9-13.5'

  const checkIconView: Html = h.svg(
    [
      h.AriaHidden(true),
      h.Class('dt-filter-check shrink-0'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('2'),
      h.Stroke('currentColor'),
    ],
    [
      h.path(
        [h.D(CHECK_ICON), h.StrokeLinecap('round'), h.StrokeLinejoin('round')],
        [],
      ),
    ],
  )

  const filterItemLabel = (item: string): string =>
    String_.isNonEmpty(item) ? submodelLabel(item) : 'All Messages'

  const ARROW_UP = 'M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18'

  const arrowUpIconView: Html = h.svg(
    [
      h.AriaHidden(true),
      h.Class('dt-scroll-pill-icon shrink-0'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('2'),
      h.Stroke('currentColor'),
    ],
    [
      h.path(
        [h.D(ARROW_UP), h.StrokeLinecap('round'), h.StrokeLinejoin('round')],
        [],
      ),
    ],
  )

  const scrollToTopPillView: Html = h.button(
    [
      h.Key('scroll-pill'),
      h.Class('dt-scroll-pill'),
      h.OnClick(ClickedScrollToTopPill()),
    ],
    [
      arrowUpIconView,
      h.span([h.Class('dt-scroll-pill-text')], ['Jump to top']),
    ],
  )

  const submodelFilterView = (model: Model): Html => {
    const buttonLabel = Option.match(model.maybeSubmodelFilter, {
      onNone: () => 'All Messages',
      onSome: submodelLabel,
    })

    return h.submodel({
      slotId: 'submodel-filter',
      model: model.submodelFilterListbox,
      view: SubmodelFilterListbox.view,
      viewInputs: {
        items: [ALL_MESSAGES_VALUE, ...model.submodelTags],
        itemToConfig: item => ({
          className: 'dt-filter-item',
          content: h.div(
            [h.Class('flex items-center gap-2')],
            [checkIconView, h.span([], [filterItemLabel(item)])],
          ),
        }),
        buttonContent: h.span(
          [h.Class('flex flex-1 items-center justify-between')],
          [
            h.span([], [buttonLabel]),
            h.svg(
              [
                h.AriaHidden(true),
                h.Class('json-arrow shrink-0'),
                h.Xmlns('http://www.w3.org/2000/svg'),
                h.Fill('none'),
                h.ViewBox('0 0 24 24'),
                h.StrokeWidth('2'),
                h.Stroke('currentColor'),
              ],
              [
                h.path(
                  [
                    h.D(CHEVRON_DOWN),
                    h.StrokeLinecap('round'),
                    h.StrokeLinejoin('round'),
                  ],
                  [],
                ),
              ],
            ),
          ],
        ),
        buttonClassName: 'dt-filter-button',
        itemsClassName: 'dt-filter-items',
        className: 'dt-filter-wrapper',
        attributes: childAttributes([h.Key('submodel-filter')]),
        backdropClassName: 'dt-filter-backdrop',
      },
      toParentMessage: message => GotSubmodelFilterMessage({ message }),
    })
  }

  const headerView = (model: Model): Html => {
    const { status, maybeAction } = M.value(mode).pipe(
      M.withReturnType<
        Readonly<{ status: Html; maybeAction: Option.Option<Html> }>
      >(),
      M.when('TimeTravel', () =>
        model.isPaused
          ? {
              status: h.span(
                [h.Class(`${statusClass} text-dt-paused`)],
                [
                  model.pausedAtIndex === INIT_INDEX
                    ? 'Paused (init)'
                    : `Paused (${model.pausedAtIndex + 1})`,
                ],
              ),
              maybeAction: Option.some(
                h.button(
                  [h.Class(actionButtonClass), h.OnClick(ClickedResume())],
                  ['Resume →'],
                ),
              ),
            }
          : {
              status: h.span(
                [h.Class(`${statusClass} text-dt-live font-medium`)],
                ['Live'],
              ),
              maybeAction: Option.none(),
            },
      ),
      M.when('Inspect', () => ({
        status: h.span(
          [h.Class(`${statusClass} text-dt-accent`)],
          [
            model.selectedIndex === INIT_INDEX
              ? 'Inspecting (init)'
              : `Inspecting (${model.selectedIndex + 1})`,
          ],
        ),
        maybeAction: OptionExt.when(
          !model.isFollowingLatest,
          h.button(
            [h.Class(actionButtonClass), h.OnClick(ClickedFollowLatest())],
            ['Follow Latest →'],
          ),
        ),
      })),
      M.exhaustive,
    )

    const maybeClearHistoryButton = OptionExt.when(
      !model.isPaused,
      clearHistoryButton,
    )

    return h.header(
      [h.Class(headerClass)],
      [
        status,
        ...Option.toArray(maybeAction),
        ...Option.toArray(maybeClearHistoryButton),
      ],
    )
  }

  const initRowView = (isSelected: boolean, isPausedHere: boolean): Html =>
    h.keyed('li')(
      'init',
      [
        h.Class(clsx(ROW_BASE, { selected: isSelected })),
        h.OnClick(ClickedRow({ index: INIT_INDEX })),
      ],
      [
        ...OptionExt.when(
          mode === 'TimeTravel',
          h.span(
            [h.Class('pause-column')],
            isPausedHere ? [pauseIconView] : [],
          ),
        ).pipe(Option.toArray),
        h.span([h.Class('dot-column')], []),
        h.span([h.Class(indexClass)], []),
        h.span([h.Class('text-base text-dt-muted font-mono')], ['init']),
      ],
    )

  const pauseIconView: Html = h.svg(
    [
      h.AriaHidden(true),
      h.Class('dt-pause-icon'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('2.5'),
      h.Stroke('currentColor'),
    ],
    [
      h.path(
        [
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
          h.D('M5.75 3v18M18.25 3v18'),
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
    h.keyed('li')(
      String(absoluteIndex),
      [
        h.Class(clsx(ROW_BASE, { selected: isSelected })),
        h.OnClick(ClickedRow({ index: absoluteIndex })),
      ],
      [
        ...OptionExt.when(
          mode === 'TimeTravel',
          h.span(
            [h.Class('pause-column')],
            isPausedHere ? [pauseIconView] : [],
          ),
        ).pipe(Option.toArray),
        h.span(
          [h.Class('dot-column')],
          isModelChanged ? [inlineDiffDotView] : [],
        ),
        h.span([h.Class(indexClass)], [String(absoluteIndex + 1)]),
        h.span([h.Class('text-base text-dt font-mono flex-1 truncate')], [tag]),
        h.span(
          [
            h.Class(
              'text-2xs text-dt-muted font-mono shrink-0 text-right min-w-5',
            ),
          ],
          [formatTimeDelta(timeDelta)],
        ),
      ],
    )

  const messageListBody = (
    entries: ReadonlyArray<typeof DisplayEntry.Type>,
    startIndex: number,
    selectedIndex: number,
    isPaused: boolean,
    pausedAtIndex: number,
    maybeFilterTag: Option.Option<string>,
  ): Html => {
    const baseTimestamp = pipe(
      entries,
      Array_.head,
      Option.match({
        onNone: () => 0,
        onSome: ({ timestamp }) => timestamp,
      }),
    )

    const isInitSelected = selectedIndex === INIT_INDEX
    const isFiltered = Option.isSome(maybeFilterTag)

    const indexedEntries: ReadonlyArray<
      Readonly<{
        entry: typeof DisplayEntry.Type
        absoluteIndex: number
      }>
    > = pipe(
      entries,
      Array_.map((entry, arrayIndex) => ({
        entry,
        absoluteIndex: startIndex + arrayIndex,
      })),
      isFiltered
        ? Array_.filter(({ entry }) =>
            Array_.contains(entry.submodelPath, maybeFilterTag.value),
          )
        : Function.identity,
    )

    const messageRows = pipe(
      indexedEntries,
      Array_.map(({ entry, absoluteIndex }) => {
        const isSelected = selectedIndex === absoluteIndex
        const isPausedHere = isPaused && pausedAtIndex === absoluteIndex
        const displayTag = isFiltered
          ? pipe(
              entry.submodelPath,
              Array_.findFirstIndex(Equal.equals(maybeFilterTag.value)),
              Option.flatMap(filterIndex =>
                Array_.get(entry.submodelPath, Number_.increment(filterIndex)),
              ),
              Option.orElse(() => entry.maybeLeafTag),
              Option.getOrElse(() => entry.tag),
            )
          : entry.tag

        return lazyMessageRow(String(absoluteIndex), messageRowView, [
          displayTag,
          absoluteIndex,
          isSelected,
          isPausedHere,
          entry.timestamp - baseTimestamp,
          entry.isModelChanged,
        ])
      }),
      Array_.reverse,
    )

    return h.ul(
      [
        h.Key('message-list'),
        h.Class('message-list flex-1 overflow-y-auto min-h-0 overscroll-none'),
        h.OnScroll(scrollTop => ScrolledMessageList({ scrollTop })),
      ],
      isFiltered
        ? messageRows
        : [
            ...messageRows,
            initRowView(
              isInitSelected,
              isPaused && pausedAtIndex === INIT_INDEX,
            ),
          ],
    )
  }

  const messageListView = (model: Model): Html => {
    const selectedIndex = selectedHistoryIndex(model)

    return lazyMessageList(messageListBody, [
      model.entries,
      model.startIndex,
      selectedIndex,
      model.isPaused,
      model.pausedAtIndex,
      model.maybeSubmodelFilter,
    ])
  }

  // SCRUBBER

  const scrubberPositionLabel = (model: Model): string => {
    const total = String(model.entries.length).padStart(3, '0')
    const current = String(model.scrubberSlider.value).padStart(3, '0')
    return `${current} / ${total}`
  }

  const scrubberView = (model: Model): Html =>
    h.submodel({
      slotId: model.scrubberSlider.id,
      model: model.scrubberSlider,
      view: Slider.view,
      viewInputs: {
        ariaLabel: 'Session scrubber',
        getTrackRoot: () => shadow,
        formatValue: value =>
          value === 0 ? 'init' : `Message ${String(value)}`,
        toView: attributes =>
          h.div(
            [
              h.Class(
                'dt-scrubber-row flex items-center gap-3 px-3 py-2 border-t shrink-0',
              ),
            ],
            [
              h.div(
                [
                  ...attributes.root,
                  h.Class('dt-scrubber-control flex-1 flex items-center'),
                ],
                [
                  h.div(
                    [...attributes.track, h.Class('dt-scrubber-track')],
                    [
                      h.div(
                        [
                          ...attributes.filledTrack,
                          h.Class('dt-scrubber-fill'),
                        ],
                        [],
                      ),
                      h.div(
                        [...attributes.thumb, h.Class('dt-scrubber-thumb')],
                        [],
                      ),
                    ],
                  ),
                ],
              ),
              h.span(
                [
                  h.Class(
                    'dt-scrubber-position text-2xs text-dt-muted font-mono shrink-0 tabular-nums',
                  ),
                ],
                [scrubberPositionLabel(model)],
              ),
            ],
          ),
      },
      toParentMessage: message => GotScrubberSliderMessage({ message }),
    })

  // PANEL

  const isScrubberVisible = mode === 'TimeTravel'

  const panelView = (model: Model): Html =>
    h.keyed('div')(
      'dt-panel',
      [
        h.Class(
          clsx(
            'fixed dt-panel dt-panel-wide bg-dt-bg border rounded-lg flex flex-col overflow-hidden font-mono text-dt',
            PANEL_POSITION_CLASS[position],
          ),
        ),
      ],
      [
        ...Option.map(maybeBanner, banner =>
          h.div(
            [
              h.Class(
                'px-3 py-2 border-b text-sm text-dt-muted font-mono shrink-0 leading-snug',
              ),
            ],
            [banner],
          ),
        ).pipe(Option.toArray),
        headerView(model),
        h.div(
          [h.Class('flex flex-1 min-h-0 dt-content')],
          [
            h.div(
              [h.Class('flex flex-col min-h-0 dt-message-pane')],
              [
                ...Array_.match(model.submodelTags, {
                  onEmpty: () => [],
                  onNonEmpty: () => [submodelFilterView(model)],
                }),
                ...OptionExt.when(
                  !model.isFollowingTop,
                  scrollToTopPillView,
                ).pipe(Option.toArray),
                messageListView(model),
              ],
            ),
            inspectorPaneView(model),
          ],
        ),
        ...OptionExt.when(isScrubberVisible, scrubberView(model)).pipe(
          Option.toArray,
        ),
      ],
    )

  const interactionBlocker = h.div([h.Class('dt-interaction-blocker')], [])

  return (model: Model): Document => ({
    title: 'Foldkit DevTools',
    body: h.div(
      [],
      [
        ...OptionExt.when(
          model.isPaused && mode === 'TimeTravel',
          interactionBlocker,
        ).pipe(Option.toArray),
        ...OptionExt.when(model.isOpen, panelView(model)).pipe(Option.toArray),
        badgeView(model),
      ],
    ),
  })
}

// CREATE

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
  host.addEventListener(
    'pointerdown',
    event => {
      const activeElement = document.activeElement
      if (
        activeElement !== null &&
        activeElement !== host &&
        activeElement !== document.body
      ) {
        event.preventDefault()
      }
    },
    { capture: true },
  )
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
  store: DevToolsStore,
  position: DevToolsPosition,
  mode: DevToolsMode,
  maybeBanner: Option.Option<string>,
) =>
  Effect.gen(function* () {
    const { container, shadow } = createShadowContainer()
    container.id = '__foldkit_devtools_overlay__'

    const flags: Effect.Effect<typeof Flags.Type> = Effect.gen(function* () {
      const storeState = yield* SubscriptionRef.get(store.stateRef)
      return {
        isMobile: window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches,
        ...toDisplayState(storeState),
      }
    })

    const init = (flags: typeof Flags.Type): UpdateReturn => {
      const sliderMax = flags.entries.length
      const initialSliderValue = flags.isPaused
        ? hostIndexToSliderValue(flags.pausedAtIndex, flags.startIndex)
        : sliderMax

      return [
        {
          isOpen: false,
          ...flags,
          selectedIndex: INIT_INDEX,
          isFollowingLatest: true,
          isFollowingTop: true,
          submodelTags: computeSubmodelTags(flags.entries),
          maybeSubmodelFilter: Option.none(),
          submodelFilterListbox: Listbox.init({
            id: SUBMODEL_FILTER_ID,
            selectedItem: ALL_MESSAGES_VALUE,
          }),
          maybeInspectedModel: Option.none(),
          maybeInspectedMessage: Option.none(),
          expandedPaths: HashSet.empty(),
          changedPaths: HashSet.empty(),
          affectedPaths: HashSet.empty(),
          inspectorTabs: Tabs.init({ id: INSPECTOR_TABS_ID }),
          scrubberSlider: Slider.init({
            id: SCRUBBER_SLIDER_ID,
            min: 0,
            max: sliderMax,
            step: 1,
            initialValue: initialSliderValue,
          }),
        },
        [],
      ]
    }

    const overlayRuntime = makeProgram({
      Model,
      Flags,
      flags,
      init,
      update: makeUpdate(store, shadow, mode),
      view: makeView(position, mode, shadow, maybeBanner),
      container,
      subscriptions: makeOverlaySubscriptions(store, shadow),
      devTools: false,
      freezeModel: false,
    })

    yield* Effect.forkDetach(overlayRuntime.start())
  })
