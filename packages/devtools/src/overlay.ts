import { clsx } from 'clsx'
import {
  Array,
  Context,
  Effect,
  Function,
  HashSet,
  Match,
  Number,
  Option,
  Order,
  Predicate,
  Queue,
  Record,
  Schema,
  Stream,
  String,
  SubscriptionRef,
  pipe,
} from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import {
  type CommandRecord,
  DEVTOOLS_HOST_ID,
  DEVTOOLS_OVERLAY_RUNTIME_ID,
  type DevToolsStore,
  GOT_MESSAGE_PATTERN,
  INIT_INDEX,
  type MountRecord,
  type StoreState,
  extractSubmodelInfo,
  isTagged,
  latestEntryIndex,
  toInspectableValue,
} from 'foldkit/devtools-host'
import { lockScroll, unlockScroll } from 'foldkit/dom'
import {
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { makeElement } from 'foldkit/runtime'
import type { DevToolsMode, DevToolsPosition } from 'foldkit/runtime'
import { defineTaggedUnion } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import * as Subscription from 'foldkit/subscription'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import * as Listbox from '@foldkit/ui/listbox'
import * as Slider from '@foldkit/ui/slider'
import * as Switch from '@foldkit/ui/switch'
import * as Tabs from '@foldkit/ui/tabs'

import * as OptionExt from './internal/optionExtensions.js'
import { type OutlineService, makeOutlineService } from './outline/index.js'
import { overlayStyles } from './overlay-styles.js'

const SubmodelFilterListbox = Listbox.create<string>()

// MODEL

const DisplayCommand = Schema.Struct({
  name: Schema.String,
  args: Schema.Option(Schema.Record(Schema.String, Schema.Unknown)),
})

const DisplayMount = Schema.Struct({
  name: Schema.String,
  args: Schema.Option(Schema.Record(Schema.String, Schema.Unknown)),
})

const DisplayEntry = Schema.Struct({
  tag: Schema.String,
  submodelPath: Schema.Array(Schema.String),
  maybeLeafTag: Schema.Option(Schema.String),
  commands: Schema.Array(DisplayCommand),
  mountStarts: Schema.Array(DisplayMount),
  mountEnds: Schema.Array(DisplayMount),
  timestamp: Schema.Number,
  isModelChanged: Schema.Boolean,
})

const INSPECTOR_TABS_ID = 'dt-inspector'
const SUBMODEL_FILTER_ID = 'dt-submodel-filter'
const FLATTEN_SWITCH_ID = 'dt-flatten-switch'
const OUTLINE_SWITCH_ID = 'dt-outline-switch'
const SCRUBBER_SLIDER_ID = 'dt-scrubber'

const InspectorTab = Schema.Literals(['Model', 'Message', 'Commands', 'Mounts'])
type InspectorTab = typeof InspectorTab.Type
const INSPECTOR_TABS: ReadonlyArray<InspectorTab> = InspectorTab.literals
const InspectorTabs = Tabs.create<InspectorTab>()

/**
 * `Schema.Unknown` whose equivalence is reference equality. Effect 4's default
 * equivalence for `Schema.Unknown` is `Equal.equals`, which walks the value
 * structurally (hash + compareRecords) instead of falling back to `===` like
 * Effect 3. The DevTools overlay holds whole user Model and Message snapshots
 * in fields typed as `Schema.Unknown`, so the runtime's per-dispatch
 * `modelEquivalence` check would otherwise walk the entire payload three
 * times every time the user dispatches a Message. The snapshots are
 * through-traffic (different reference per frame iff different content),
 * which makes reference equality the correct comparison.
 */
const UnknownByReference = Schema.Unknown.pipe(
  Schema.overrideToEquivalence(() => (a, b) => a === b),
)

const Screen = Schema.Literals(['Messages', 'Settings'])
type Screen = typeof Screen.Type

const Model = Schema.Struct({
  isOpen: Schema.Boolean,
  isMobile: Schema.Boolean,
  screen: Screen,
  entries: Schema.Array(DisplayEntry),
  initCommands: Schema.Array(DisplayCommand),
  initMountStarts: Schema.Array(DisplayMount),
  startIndex: Schema.Number,
  isPaused: Schema.Boolean,
  pausedAtIndex: Schema.Number,
  selectedIndex: Schema.Number,
  isFollowingLatest: Schema.Boolean,
  isFollowingTop: Schema.Boolean,
  fps: Schema.Number,
  isOutlinesEnabled: Schema.Boolean,
  maybeInspectedModel: Schema.Option(UnknownByReference),
  maybeInspectedMessage: Schema.Option(UnknownByReference),
  submodelTags: Schema.Array(Schema.String),
  maybeSubmodelFilter: Schema.Option(Schema.String),
  isFlattened: Schema.Boolean,
  submodelFilterListbox: Listbox.Model,
  expandedPaths: Schema.HashSet(Schema.String),
  changedPaths: Schema.HashSet(Schema.String),
  affectedPaths: Schema.HashSet(Schema.String),
  maybePendingScrubIndex: Schema.Option(Schema.Number),
  inspectorTabs: Tabs.Model,
  activeInspectorTab: InspectorTab,
  // NOTE: empirically, inlining `Slider.Model` here throws
  // "Cannot read properties of undefined (reading 'ast')" when running slider
  // tests, because slider imports html → runtime → overlay, and overlay
  // references Slider.Model mid-cycle. Schema.suspend defers the read until after
  // the cycle resolves. Inlining Listbox.Model works in practice but goes
  // through the same import chain; the exact cause of the asymmetry isn't
  // pinned down. Suspend is the conservative fix until the runtime ↔ overlay
  // cycle is broken at the source.
  scrubberSlider: Schema.suspend((): typeof Slider.Model => Slider.Model),
  scrubberValue: Schema.Number,
})
type Model = typeof Model.Type

const Flags = Schema.Struct({
  isOpen: Schema.Boolean,
  isMobile: Schema.Boolean,
  isFlattened: Schema.Boolean,
  isOutlinesEnabled: Schema.Boolean,
  entries: Schema.Array(DisplayEntry),
  initCommands: Schema.Array(DisplayCommand),
  initMountStarts: Schema.Array(DisplayMount),
  startIndex: Schema.Number,
  isPaused: Schema.Boolean,
  pausedAtIndex: Schema.Number,
})

// MESSAGE

// NOTE: suspend for the same init-order reason as scrubberSlider above.

const Message = defineMessageUnion({
  TickedFps: { fps: Schema.Number },
  ClickedToggle: {},
  ClickedSettingsToggle: {},
  ToggledFlatten: { isFlattened: Schema.Boolean },
  ToggledOutlines: { isOutlinesEnabled: Schema.Boolean },
  CompletedPersistDevToolsState: {},
  CompletedSetOutlineEnabled: {},
  ClickedRow: { index: Schema.Number },
  ClickedResume: {},
  ClickedClear: {},
  ClickedFollowLatest: {},
  ClickedScrollToTopPill: {},
  ScrolledMessageList: { scrollTop: Schema.Number },
  CompletedResume: {},
  CompletedClear: {},
  CompletedLockScroll: {},
  CompletedUnlockScroll: {},
  CompletedScrollToTop: {},
  CrossedMobileBreakpoint: { isMobile: Schema.Boolean },
  ReceivedInspectedState: {
    model: Schema.Unknown,
    maybeMessage: Schema.Option(Schema.Unknown),
    changedPaths: Schema.HashSet(Schema.String),
    affectedPaths: Schema.HashSet(Schema.String),
  },
  ToggledTreeNode: { path: Schema.String },
  TickedScrubFrame: {},
  GotInspectorTabsMessage: { message: Tabs.Message },
  ReceivedStoreUpdate: {
    entries: Schema.Array(DisplayEntry),
    initCommands: Schema.Array(DisplayCommand),
    initMountStarts: Schema.Array(DisplayMount),
    startIndex: Schema.Number,
    isPaused: Schema.Boolean,
    pausedAtIndex: Schema.Number,
  },
  GotSubmodelFilterMessage: { message: Listbox.Message },
  GotScrubberSliderMessage: {
    message: Schema.suspend((): typeof Slider.Message => Slider.Message),
  },
})
type Message = typeof Message.Type

// HELPERS

const MILLIS_PER_SECOND = 1000
const MOBILE_BREAKPOINT = 767
const MOBILE_BREAKPOINT_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`
const TREE_INDENT_PX = 12
const MAX_PREVIEW_KEYS = 3
const ALL_MESSAGES_VALUE = ''
const DEVTOOLS_STORAGE_KEY = 'foldkit-devtools'
const NO_COMMANDS: ReadonlyArray<typeof DisplayCommand.Type> = []
const NO_MOUNTS: ReadonlyArray<typeof DisplayMount.Type> = []

const formatTimeDelta = (deltaMs: number): string =>
  Match.value(deltaMs).pipe(
    Match.when(0, () => '0ms'),
    Match.when(
      Number.isLessThan(MILLIS_PER_SECOND),
      ms => `+${Math.round(ms)}ms`,
    ),
    Match.orElse(ms => `+${(ms / MILLIS_PER_SECOND).toFixed(1)}s`),
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
    Array.flatMap(({ submodelPath }) => submodelPath),
    Array.dedupe,
    Array.sort(Order.String),
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
  Array.map(entries, entry => {
    const { submodelPath, maybeLeafTag } = extractSubmodelInfo(
      entry.tag,
      entry.message,
    )
    return {
      tag: entry.tag,
      submodelPath,
      maybeLeafTag,
      commands: Array.map(entry.commands, toDisplayCommand),
      mountStarts: Array.map(entry.mountStarts, toDisplayMount),
      mountEnds: Array.map(entry.mountEnds, toDisplayMount),
      timestamp: entry.timestamp,
      isModelChanged: entry.isModelChanged,
    }
  })

const toDisplayState = (state: StoreState) => ({
  entries: toDisplayEntries(state),
  initCommands: Array.map(state.initCommands, toDisplayCommand),
  initMountStarts: Array.map(state.initMountStarts, toDisplayMount),
  startIndex: state.startIndex,
  isPaused: state.isPaused,
  pausedAtIndex: state.pausedAtIndex,
})

const isExpandable = Predicate.isObjectOrArray

const objectPreview = (value: Record<string, unknown>): string =>
  pipe(
    value,
    Record.keys,
    Array.filter(key => key !== '_tag'),
    Array.match({
      onEmpty: () => '{}',
      onNonEmpty: keys => {
        const preview = pipe(
          keys,
          Array.take(MAX_PREVIEW_KEYS),
          Array.join(', '),
        )
        return Array.length(keys) > MAX_PREVIEW_KEYS
          ? `{ ${preview}, … }`
          : `{ ${preview} }`
      },
    }),
  )

const collapsedPreview = (value: unknown): string =>
  Match.value(value).pipe(
    Match.when(globalThis.Array.isArray, array => `(${array.length})`),
    Match.when(Predicate.isObject, objectPreview),
    Match.orElse(() => ''),
  )

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const foldInspectorTabsOutMessage = Match.type<
  Tabs.OutMessage<InspectorTab>
>().pipe(
  Match.withReturnType<Update.Step<Model, Message>>(),
  Match.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, { activeInspectorTab: () => value }),
      }),
  }),
)

const foldInspectorTabs = Update.foldChild({
  update: InspectorTabs.update,
  read: (model: Model) => Option.some(model.inspectorTabs),
  write: (model, nextInspectorTabs) =>
    evo(model, { inspectorTabs: () => nextInspectorTabs }),
  toParentMessage: message => Message.GotInspectorTabsMessage({ message }),
  foldOutMessage: foldInspectorTabsOutMessage,
})

const foldSubmodelFilterOutMessage = Match.type<
  Listbox.OutMessage<string>
>().pipe(
  Match.withReturnType<Update.Step<Model, Message>>(),
  Match.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeSubmodelFilter: () =>
            Option.liftPredicate(value, String.isNonEmpty),
        }),
      }),
  }),
)

const foldSubmodelFilter = Update.foldChild({
  update: SubmodelFilterListbox.update,
  read: (model: Model) => Option.some(model.submodelFilterListbox),
  write: (model, nextSubmodelFilterListbox) =>
    evo(model, {
      submodelFilterListbox: () => nextSubmodelFilterListbox,
    }),
  toParentMessage: message => Message.GotSubmodelFilterMessage({ message }),
  foldOutMessage: foldSubmodelFilterOutMessage,
})

// NOTE: Pointer Messages update the thumb immediately, but jumping to and
// inspecting the corresponding state is expensive. Keep only the latest host
// index until TickedScrubFrame flushes one navigation on the next frame.
const foldScrubberSliderOutMessage = Match.type<Slider.OutMessage>().pipe(
  Match.withReturnType<Update.Step<Model, Message>>(),
  Match.tagsExhaustive({
    ChangedValue:
      ({ value }) =>
      model => ({
        model: evo(model, {
          scrubberValue: () => value,
          maybePendingScrubIndex: () =>
            Option.some(sliderValueToHostIndex(value, model.startIndex)),
        }),
      }),
  }),
)

const foldScrubberSlider = Update.foldChild({
  update: Slider.update,
  read: (model: Model) => Option.some(model.scrubberSlider),
  write: (model, nextScrubberSlider) =>
    evo(model, { scrubberSlider: () => nextScrubberSlider }),
  toParentMessage: message => Message.GotScrubberSliderMessage({ message }),
  foldOutMessage: foldScrubberSliderOutMessage,
})

class StoreService extends Context.Service<StoreService, DevToolsStore>()(
  'foldkit/DevToolsStore',
) {}

class ShadowRootService extends Context.Service<
  ShadowRootService,
  ShadowRoot
>()('foldkit/DevToolsShadowRoot') {}

class DevToolsOutlineService extends Context.Service<
  DevToolsOutlineService,
  OutlineService
>()('foldkit/DevToolsOutline') {}

export const LockScroll = Command.define('LockScroll', {
  messages: [Message.CompletedLockScroll],
  execute: lockScroll.pipe(Effect.as(Message.CompletedLockScroll())),
})

export const UnlockScroll = Command.define('UnlockScroll', {
  messages: [Message.CompletedUnlockScroll],
  execute: unlockScroll.pipe(Effect.as(Message.CompletedUnlockScroll())),
})

const maybeToggleScrollLock = (isEnabled: boolean, shouldLock: boolean) =>
  OptionExt.when(isEnabled, shouldLock ? LockScroll() : UnlockScroll())

const maybeLockScroll = (isOpen: boolean, isMobile: boolean) =>
  OptionExt.when(isOpen && isMobile, LockScroll())

const DevToolsPersistedState = Schema.Struct({
  isOpen: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  isFlattened: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  isOutlinesEnabled: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
})
type DevToolsPersistedState = typeof DevToolsPersistedState.Type
const DevToolsPersistedStateJson = Schema.fromJsonString(DevToolsPersistedState)
const DEFAULT_PERSISTED_STATE: DevToolsPersistedState = {
  isOpen: false,
  isFlattened: false,
  isOutlinesEnabled: false,
}

const readPersistedState: Effect.Effect<DevToolsPersistedState> = Effect.gen(
  function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const json = yield* Effect.fromOption(
      Option.fromNullishOr(yield* store.get(DEVTOOLS_STORAGE_KEY)),
    )
    return yield* Schema.decodeEffect(DevToolsPersistedStateJson)(json)
  },
).pipe(
  Effect.catch(() => Effect.succeed(DEFAULT_PERSISTED_STATE)),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

export const PersistDevToolsState = Command.define('PersistDevToolsState', {
  args: {
    isOpen: Schema.Boolean,
    isFlattened: Schema.Boolean,
    isOutlinesEnabled: Schema.Boolean,
  },
  messages: [Message.CompletedPersistDevToolsState],
  execute: ({ isOpen, isFlattened, isOutlinesEnabled }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const json = yield* Schema.encodeEffect(DevToolsPersistedStateJson)({
        isOpen,
        isFlattened,
        isOutlinesEnabled,
      })
      yield* store.set(DEVTOOLS_STORAGE_KEY, json)
      return Message.CompletedPersistDevToolsState()
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(Message.CompletedPersistDevToolsState()),
      ),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

const buildInspectionFromModel = (index: number, model: unknown) =>
  Effect.gen(function* () {
    const store = yield* StoreService
    const maybeMessage = yield* store.getMessageAtIndex(index)
    const diff = yield* store.getDiffAtIndex(index)
    return Message.ReceivedInspectedState({ model, maybeMessage, ...diff })
  })

const buildInspectionEffect = (index: number) =>
  Effect.gen(function* () {
    const store = yield* StoreService
    const model = yield* store.getModelAtIndex(index)
    return yield* buildInspectionFromModel(index, model)
  })

// NOTE: jump and inspect both need the model at `index`. Resolving it twice
// (once to render the host, once to feed the inspector) replays the segment
// from the nearest keyframe twice for a mid-segment jump. `store.jumpTo`
// returns the model it resolved so the inspector reuses that single
// resolution. Inspect-only navigation (no host pause) still uses
// `InspectState`, which resolves once on its own.
export const JumpToAndInspect = Command.define('JumpToAndInspect', {
  args: { index: Schema.Number },
  messages: [Message.ReceivedInspectedState],
  execute: ({ index }) =>
    Effect.gen(function* () {
      const store = yield* StoreService
      const model = yield* store.jumpTo(index)
      return yield* buildInspectionFromModel(index, model)
    }),
})

export const InspectState = Command.define('InspectState', {
  args: { index: Schema.Number },
  messages: [Message.ReceivedInspectedState],
  execute: ({ index }) => buildInspectionEffect(index),
})

export const InspectLatest = Command.define('InspectLatest', {
  messages: [Message.ReceivedInspectedState],
  execute: Effect.gen(function* () {
    const store = yield* StoreService
    const state = yield* SubscriptionRef.get(store.stateRef)
    return yield* buildInspectionEffect(latestEntryIndex(state))
  }),
})

export const Resume = Command.define('Resume', {
  messages: [Message.CompletedResume],
  execute: Effect.gen(function* () {
    const store = yield* StoreService
    yield* store.resume
    return Message.CompletedResume()
  }),
})

export const Clear = Command.define('Clear', {
  messages: [Message.CompletedClear],
  execute: Effect.gen(function* () {
    const store = yield* StoreService
    yield* store.clear
    return Message.CompletedClear()
  }),
})

export const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  execute: Effect.gen(function* () {
    const shadow = yield* ShadowRootService
    const messageList = shadow.querySelector(MESSAGE_LIST_SELECTOR)
    if (messageList instanceof HTMLElement) {
      messageList.scrollTop = 0
    }
    return Message.CompletedScrollToTop()
  }),
})

export const SetOutlineEnabled = Command.define('SetOutlineEnabled', {
  args: { enabled: Schema.Boolean },
  messages: [Message.CompletedSetOutlineEnabled],
  execute: ({ enabled }) =>
    Effect.gen(function* () {
      const outline = yield* DevToolsOutlineService
      outline.setEnabled(enabled)
      return Message.CompletedSetOutlineEnabled()
    }),
})

const makeUpdate = (
  store: DevToolsStore,
  shadow: ShadowRoot,
  mode: DevToolsMode,
  outline: OutlineService,
) => {
  const provideContext = <A, E>(
    effect: Effect.Effect<
      A,
      E,
      StoreService | ShadowRootService | DevToolsOutlineService
    >,
  ): Effect.Effect<A, E, never> =>
    effect.pipe(
      Effect.provideService(StoreService, store),
      Effect.provideService(ShadowRootService, shadow),
      Effect.provideService(DevToolsOutlineService, outline),
    )

  const inspectLatest = Command.mapEffect(InspectLatest(), provideContext)
  const resume = Command.mapEffect(Resume(), provideContext)
  const clear = Command.mapEffect(Clear(), provideContext)
  const scrollToTop = Command.mapEffect(ScrollToTop(), provideContext)
  const setOutlineEnabled = (enabled: boolean) =>
    Command.mapEffect(SetOutlineEnabled({ enabled }), provideContext)

  const jumpToAndInspect = (index: number) =>
    Command.mapEffect(JumpToAndInspect({ index }), provideContext)
  const inspectState = (index: number) =>
    Command.mapEffect(InspectState({ index }), provideContext)

  return (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
      ClickedToggle: () => {
        const nextIsOpen = !model.isOpen
        return {
          model: evo(model, { isOpen: () => nextIsOpen }),
          commands: [
            ...Option.toArray(
              maybeToggleScrollLock(model.isMobile, nextIsOpen),
            ),
            PersistDevToolsState({
              isOpen: nextIsOpen,
              isFlattened: model.isFlattened,
              isOutlinesEnabled: model.isOutlinesEnabled,
            }),
          ],
        }
      },
      ClickedSettingsToggle: () => ({
        model: evo(model, {
          screen: currentScreen =>
            Match.value(currentScreen).pipe(
              Match.withReturnType<Screen>(),
              Match.when('Messages', () => 'Settings'),
              Match.when('Settings', () => 'Messages'),
              Match.exhaustive,
            ),
        }),
      }),
      ToggledFlatten: ({ isFlattened }) => ({
        model: evo(model, { isFlattened: () => isFlattened }),
        commands: [
          PersistDevToolsState({
            isOpen: model.isOpen,
            isFlattened,
            isOutlinesEnabled: model.isOutlinesEnabled,
          }),
        ],
      }),
      ToggledOutlines: ({ isOutlinesEnabled }) => ({
        model: evo(model, { isOutlinesEnabled: () => isOutlinesEnabled }),
        commands: [
          setOutlineEnabled(isOutlinesEnabled),
          PersistDevToolsState({
            isOpen: model.isOpen,
            isFlattened: model.isFlattened,
            isOutlinesEnabled,
          }),
        ],
      }),
      CrossedMobileBreakpoint: ({ isMobile }) => ({
        model: evo(model, { isMobile: () => isMobile }),
        commands: Option.toArray(maybeToggleScrollLock(model.isOpen, isMobile)),
      }),
      ClickedRow: ({ index }) =>
        Match.value(mode).pipe(
          Match.withReturnType<UpdateReturn>(),
          Match.when('TimeTravel', () => ({
            model,
            commands: [jumpToAndInspect(index)],
          })),
          Match.when('Inspect', () => ({
            model: evo(model, {
              selectedIndex: () => index,
              isFollowingLatest: () => false,
            }),
            commands: [inspectState(index)],
          })),
          Match.exhaustive,
        ),
      ClickedResume: () => ({
        model: evo(model, {
          isFollowingTop: () => true,
          expandedPaths: () => HashSet.empty<string>(),
          changedPaths: () => HashSet.empty<string>(),
          affectedPaths: () => HashSet.empty<string>(),
        }),
        commands: [resume, inspectLatest, scrollToTop],
      }),
      ClickedClear: () => ({
        model: evo(model, {
          selectedIndex: () => INIT_INDEX,
          isFollowingLatest: () => true,
          isFollowingTop: () => true,
          maybeSubmodelFilter: () => Option.none(),
          expandedPaths: () => HashSet.empty<string>(),
          changedPaths: () => HashSet.empty<string>(),
          affectedPaths: () => HashSet.empty<string>(),
        }),
        commands: [clear, inspectLatest, scrollToTop],
      }),
      ClickedFollowLatest: () => {
        const latestIndex = Array.match(model.entries, {
          onEmpty: () => INIT_INDEX,
          onNonEmpty: () => model.startIndex + model.entries.length - 1,
        })

        return {
          model: evo(model, {
            selectedIndex: () => latestIndex,
            isFollowingLatest: () => true,
            isFollowingTop: () => true,
            expandedPaths: () => HashSet.empty<string>(),
            changedPaths: () => HashSet.empty<string>(),
            affectedPaths: () => HashSet.empty<string>(),
          }),
          commands: [inspectLatest, scrollToTop],
        }
      },
      ClickedScrollToTopPill: () => ({
        model: evo(model, {
          isFollowingTop: () => true,
        }),
        commands: [scrollToTop],
      }),
      ScrolledMessageList: ({ scrollTop }) => {
        const isAtTop = scrollTop <= SCROLL_FOLLOW_THRESHOLD_PX
        return isAtTop === model.isFollowingTop
          ? { model }
          : { model: evo(model, { isFollowingTop: () => isAtTop }) }
      },
      ReceivedInspectedState: ({
        model: inspectedModel,
        maybeMessage,
        changedPaths,
        affectedPaths,
      }) => ({
        model: evo(model, {
          maybeInspectedModel: () => Option.some(inspectedModel),
          maybeInspectedMessage: () => maybeMessage,
          changedPaths: () => changedPaths,
          affectedPaths: () => affectedPaths,
        }),
      }),
      GotInspectorTabsMessage: ({ message: tabsMessage }) =>
        foldInspectorTabs(model, tabsMessage),
      ToggledTreeNode: ({ path }) => ({
        model: evo(model, {
          expandedPaths: paths =>
            HashSet.has(paths, path)
              ? HashSet.remove(paths, path)
              : HashSet.add(paths, path),
        }),
      }),
      ReceivedStoreUpdate: ({
        entries,
        initCommands,
        initMountStarts,
        startIndex,
        isPaused,
        pausedAtIndex,
      }) => {
        const shouldFollowSelection = Match.value(mode).pipe(
          Match.when('TimeTravel', () => !isPaused),
          Match.when('Inspect', () => model.isFollowingLatest),
          Match.exhaustive,
        )

        const shouldFollowScroll = Match.value(mode).pipe(
          Match.when('TimeTravel', () => !isPaused && model.isFollowingTop),
          Match.when('Inspect', () => model.isFollowingTop),
          Match.exhaustive,
        )

        const latestIndex = Array.match(entries, {
          onEmpty: () => INIT_INDEX,
          onNonEmpty: () => startIndex + entries.length - 1,
        })

        const nextSubmodelTags = computeSubmodelTags(entries)
        const isFilterStale = Option.exists(
          model.maybeSubmodelFilter,
          filterTag => !Array.contains(nextSubmodelTags, filterTag),
        )

        const sliderMax = entries.length
        const targetSliderValue = isPaused
          ? hostIndexToSliderValue(pausedAtIndex, startIndex)
          : sliderMax

        return {
          model: evo(model, {
            entries: () => entries,
            initCommands: () => initCommands,
            initMountStarts: () => initMountStarts,
            startIndex: () => startIndex,
            isPaused: () => isPaused,
            pausedAtIndex: () => pausedAtIndex,
            submodelTags: () => nextSubmodelTags,
            maybeSubmodelFilter: current =>
              isFilterStale ? Option.none() : current,
            selectedIndex: current =>
              shouldFollowSelection ? latestIndex : current,
            scrubberSlider: current =>
              Slider.reflectRange(current, { min: 0, max: sliderMax }),
            scrubberValue: current =>
              Match.value(model.scrubberSlider.dragState).pipe(
                Match.tag('Dragging', () =>
                  Slider.snapAndClamp(current, 0, sliderMax, 1),
                ),
                Match.orElse(() =>
                  Slider.snapAndClamp(targetSliderValue, 0, sliderMax, 1),
                ),
              ),
          }),
          commands: [
            ...(shouldFollowSelection ? [inspectLatest] : []),
            ...(shouldFollowScroll ? [scrollToTop] : []),
          ],
        }
      },
      GotSubmodelFilterMessage: ({ message: listboxMessage }) =>
        foldSubmodelFilter(model, listboxMessage),

      GotScrubberSliderMessage: ({ message: sliderMessage }) =>
        foldScrubberSlider(model, sliderMessage),
      TickedFps: ({ fps }) => ({ model: evo(model, { fps: () => fps }) }),
      TickedScrubFrame: () =>
        Option.match(model.maybePendingScrubIndex, {
          onNone: (): UpdateReturn => ({ model }),
          onSome: (hostIndex): UpdateReturn => ({
            model: evo(model, {
              maybePendingScrubIndex: () => Option.none(),
            }),
            commands: [jumpToAndInspect(hostIndex)],
          }),
        }),
      CompletedResume: () => ({ model }),
      CompletedClear: () => ({ model }),
      CompletedPersistDevToolsState: () => ({ model }),
      CompletedSetOutlineEnabled: () => ({ model }),
      CompletedLockScroll: () => ({ model }),
      CompletedUnlockScroll: () => ({ model }),
      CompletedScrollToTop: () => ({ model }),
    })
}

// SUBSCRIPTION

const makeOverlaySubscriptions = (store: DevToolsStore, shadow: ShadowRoot) => {
  const fpsSubscription = Subscription.make<Model, Message>()(() => ({
    fps: Subscription.persistent(
      Stream.callback<Message>(queue =>
        Effect.gen(function* () {
          let frameCount = 0
          let lastTime = performance.now()
          let rafId = 0

          const tick = (): void => {
            frameCount += 1
            const now = performance.now()
            if (now - lastTime >= 1000) {
              const fps = Math.round((frameCount * 1000) / (now - lastTime))
              frameCount = 0
              lastTime = now
              Queue.offerUnsafe(queue, Message.TickedFps({ fps }))
            }
            rafId = requestAnimationFrame(tick)
          }

          rafId = requestAnimationFrame(tick)

          yield* Effect.addFinalizer(() =>
            Effect.sync(() => cancelAnimationFrame(rafId)),
          )
          yield* Effect.never
        }),
      ),
    ),
  }))

  const sliderSubscriptions = Slider.subscriptionsForRoot(() => shadow)

  const scrubberSubscriptions = Subscription.lift({
    scrubberPointer: sliderSubscriptions.dragPointer,
    scrubberEscape: sliderSubscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.scrubberSlider,
    toParentMessage: message => Message.GotScrubberSliderMessage({ message }),
  })

  const ownSubscriptions = Subscription.make<Model, Message>()(_entry => ({
    scrubFrame: Subscription.animationFrame<Model, Message>({
      isActive: model => Option.isSome(model.maybePendingScrubIndex),
      toMessage: () => Message.TickedScrubFrame(),
    }),
    storeUpdates: Subscription.persistent(
      Stream.concat(
        Stream.fromEffect(
          SubscriptionRef.get(store.stateRef).pipe(
            Effect.map(state =>
              Message.ReceivedStoreUpdate(toDisplayState(state)),
            ),
          ),
        ),
        Stream.map(SubscriptionRef.changes(store.stateRef), state =>
          Message.ReceivedStoreUpdate(toDisplayState(state)),
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
                Message.CrossedMobileBreakpoint({ isMobile: event.matches }),
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
    fpsSubscription,
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

// NOTE: the builder arrives with the first render, so the helper closures
// (and their createLazy slots) are built once on that render and reused.
//
// Required, not just an optimization. `resolveOrCache` compares
// `previousEntry.fn === fn`, so rebuilding the helpers each render would miss
// every memo on every render. Hoisting only the lazy slots out does not help;
// the closures themselves have to be reference-stable.
//
// Safe despite the "thread `h`, never store it" rule because the overlay owns
// its own root frame and the builder is the runtime's process-wide singleton,
// so the captured object is the one every later render would hand back.
const makeView = (
  position: DevToolsPosition,
  mode: DevToolsMode,
  shadow: ShadowRoot,
  maybeBanner: Option.Option<string>,
): ((model: Model, h: HtmlBuilder<Message>) => Html) => {
  let viewWithBuilder: ((model: Model) => Html) | undefined

  return (model, h) => {
    viewWithBuilder ??= buildOverlayView(position, mode, shadow, maybeBanner, h)
    return viewWithBuilder(model)
  }
}

const buildOverlayView = (
  position: DevToolsPosition,
  mode: DevToolsMode,
  shadow: ShadowRoot,
  maybeBanner: Option.Option<string>,
  h: HtmlBuilder<Message>,
): ((model: Model) => Html) => {
  const lazyTreeNode = createKeyedLazy()
  const lazyMessageRow = createKeyedLazy()
  const lazyTabContent = createKeyedLazy()
  const lazyMessageList = createLazy()

  // JSON TREE

  const leafSpan = (className: string, text: string): Html =>
    h.span([h.Class(className)], [text])

  const leafValueView = (value: unknown): Html =>
    Match.value(value).pipe(
      Match.when(Predicate.isNull, () => leafSpan('json-null italic', 'null')),
      Match.when(Predicate.isUndefined, () =>
        leafSpan('json-null italic', 'undefined'),
      ),
      Match.when(Predicate.isString, stringValue =>
        leafSpan('json-string', `"${stringValue}"`),
      ),
      Match.when(Predicate.isNumber, numberValue =>
        leafSpan('json-number', globalThis.String(numberValue)),
      ),
      Match.when(Predicate.isBoolean, booleanValue =>
        leafSpan('json-boolean', globalThis.String(booleanValue)),
      ),
      Match.orElse(unknownValue =>
        leafSpan('json-null', globalThis.String(unknownValue)),
      ),
    )

  const keyView = (key: string): Html =>
    h.span([h.Class('json-key')], [`${key}:\u00a0`])

  const CHEVRON_RIGHT = 'M8.25 4.5l7.5 7.5-7.5 7.5'
  const CHEVRON_DOWN = 'M19.5 8.25l-7.5 7.5-7.5-7.5'

  const arrowView = (isExpanded: boolean): Html =>
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
        h.path([
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
          h.D(isExpanded ? CHEVRON_DOWN : CHEVRON_RIGHT),
        ]),
      ],
    )

  const tagLabelView = (tag: string): Html =>
    h.span([h.Class('json-tag')], [tag])

  const previewView = (preview: string): Html =>
    h.span([h.Class('json-preview')], [preview])

  const diffDotView: Html = h.span([h.Class('diff-dot')])
  const inlineDiffDotView: Html = h.span([h.Class('diff-dot-inline')])

  const RowSegment = defineTaggedUnion({
    ArrowSegment: { isExpanded: Schema.Boolean },
    DiffDotSegment: {},
    KeyLabelSegment: { key: Schema.String },
    TagLabelSegment: { tag: Schema.String },
    PreviewSegment: { preview: Schema.String },
    LeafValueSegment: { value: Schema.Unknown },
  })
  type RowSegment = typeof RowSegment.Type

  const rowSegmentView = RowSegment.match({
    ArrowSegment: ({ isExpanded }) => arrowView(isExpanded),
    DiffDotSegment: () => diffDotView,
    KeyLabelSegment: ({ key }) => keyView(key),
    TagLabelSegment: ({ tag }) => tagLabelView(tag),
    PreviewSegment: ({ preview }) => previewView(preview),
    LeafValueSegment: ({ value }) => leafValueView(value),
  })

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
    accumulator: globalThis.Array<FlatNode>
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

    if (globalThis.Array.isArray(value)) {
      value.forEach((item, arrayIndex) =>
        flattenTree({
          ...shared,
          value: item,
          treePath: `${treePath}.${arrayIndex}`,
          depth: childDepth,
          key: globalThis.String(arrayIndex),
        }),
      )
    } else if (Predicate.isObject(value)) {
      pipe(
        value,
        Record.toEntries,
        Array.filter(([entryKey]) => entryKey !== '_tag'),
        Array.forEach(([entryKey, childValue]) =>
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
      const rowSegments: globalThis.Array<RowSegment> = [
        ...(hasDiffDot ? [RowSegment.DiffDotSegment()] : []),
        ...(String.isNonEmpty(key)
          ? [RowSegment.KeyLabelSegment({ key })]
          : []),
        RowSegment.LeafValueSegment({ value }),
      ]

      return h.ul(
        [
          h.Key(treePath),
          h.Class(
            clsx('tree-row flex items-center gap-px font-mono text-2xs', {
              'diff-changed': isChanged,
            }),
          ),
          indent,
        ],
        rowSegments.map(segment =>
          h.keyed('li')(
            segment._tag,
            [h.Class('contents')],
            [rowSegmentView(segment)],
          ),
        ),
      )
    }

    const preview = isExpanded
      ? globalThis.Array.isArray(value)
        ? `(${value.length})`
        : ''
      : collapsedPreview(value)

    const rowSegments: globalThis.Array<RowSegment> = [
      ...(isRoot ? [] : [RowSegment.ArrowSegment({ isExpanded })]),
      ...(!isRoot && hasDiffDot ? [RowSegment.DiffDotSegment()] : []),
      ...(String.isNonEmpty(key) ? [RowSegment.KeyLabelSegment({ key })] : []),
      ...(String.isNonEmpty(tag) ? [RowSegment.TagLabelSegment({ tag })] : []),
      RowSegment.PreviewSegment({ preview }),
    ]

    return h.ul(
      [
        h.Key(treePath),
        h.Class(
          clsx('tree-row flex items-center gap-px font-mono text-2xs', {
            'tree-row-expandable cursor-pointer': !isRoot,
            'diff-changed': isChanged,
          }),
        ),
        indent,
        ...(isRoot
          ? []
          : [h.OnClick(Message.ToggledTreeNode({ path: treePath }))]),
      ],
      rowSegments.map(segment =>
        h.keyed('li')(
          segment._tag,
          [h.Class('contents')],
          [rowSegmentView(segment)],
        ),
      ),
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
    const nodes: globalThis.Array<FlatNode> = []
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
      Array.head,
      Option.match({
        onNone: () => 0,
        onSome: ({ timestamp }) => timestamp,
      }),
    )

    return pipe(
      Array.get(model.entries, selectedIndex - model.startIndex),
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

  const noMessageView = (): Html =>
    h.div(
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

  const unwrapToLeaf = (message: unknown): unknown => {
    if (
      isTagged(message) &&
      GOT_MESSAGE_PATTERN.test(message._tag) &&
      Predicate.hasProperty(message, 'message') &&
      Predicate.isNotUndefined(message.message)
    ) {
      return unwrapToLeaf(message.message)
    } else {
      return message
    }
  }

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
    isFlattened: boolean,
    expandedPaths: HashSet.HashSet<string>,
    timestamp: string,
  ): Html =>
    Option.match(maybeInspectedMessage, {
      onNone: noMessageView,
      onSome: rawMessage => {
        const message = isFlattened
          ? unwrapToLeaf(rawMessage)
          : unwrapIfFiltered(rawMessage, maybeSubmodelFilter)

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
    const lastIndex = Array.match(model.entries, {
      onEmpty: () => INIT_INDEX,
      onNonEmpty: () => model.startIndex + model.entries.length - 1,
    })

    return Match.value(mode).pipe(
      Match.when('TimeTravel', () =>
        model.isPaused ? model.pausedAtIndex : lastIndex,
      ),
      Match.when('Inspect', () => model.selectedIndex),
      Match.exhaustive,
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
        Array.get(selectedIndex - model.startIndex),
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
    const nodes: globalThis.Array<FlatNode> = []
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
    Array.match(commands, {
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
          Array.map(commandList, (command, index) =>
            h.div(
              [h.Class('flex items-start px-2 py-1 border-b gap-1.5')],
              [
                h.span([h.Class(indexClass)], [globalThis.String(index + 1)]),
                h.div(
                  [h.Class('flex flex-col flex-1 min-w-0')],
                  Array.map(
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
        Array.get(selectedIndex - model.startIndex),
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
    const nodes: globalThis.Array<FlatNode> = []
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
        ...Array.map(mounts, (mount, index) =>
          h.div(
            [h.Class('flex items-start px-2 py-1 border-b gap-1.5')],
            [
              h.span([h.Class(indexClass)], [globalThis.String(index + 1)]),
              h.div(
                [h.Class('flex flex-col flex-1 min-w-0')],
                Array.map(
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
      Array.isReadonlyArrayNonEmpty(starts) ||
      Array.isReadonlyArrayNonEmpty(ends)

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
        ...(Array.isReadonlyArrayNonEmpty(starts)
          ? [mountListSection('Started', starts, expandedPaths)]
          : []),
        ...(Array.isReadonlyArrayNonEmpty(ends)
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
    Match.value(tab).pipe(
      Match.when('Model', () =>
        lazyTabContent('Model', modelTabContent, [
          inspectedModel,
          model.expandedPaths,
          model.changedPaths,
          model.affectedPaths,
        ]),
      ),
      Match.when('Message', () =>
        lazyTabContent('Message', messageTabContent, [
          model.maybeInspectedMessage,
          model.maybeSubmodelFilter,
          model.isFlattened,
          model.expandedPaths,
          inspectedTimestamp(model),
        ]),
      ),
      Match.when('Commands', () =>
        lazyTabContent('Commands', commandsTabContent, [
          selectedCommands(model),
          model.expandedPaths,
        ]),
      ),
      Match.when('Mounts', () => {
        const { starts, ends } = selectedMountActivity(model)
        return lazyTabContent('Mounts', mountsTabContent, [
          starts,
          ends,
          model.expandedPaths,
        ])
      }),
      Match.exhaustive,
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
            selectedValue: model.activeInspectorTab,
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
          toParentMessage: message =>
            Message.GotInspectorTabsMessage({ message }),
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
        h.Style({
          width: '22px',
          height: model.isOpen ? '56px' : '80px',
          fontSize: '10px',
        }),
        h.OnClick(Message.ClickedToggle()),
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
                h.path([
                  h.StrokeLinecap('round'),
                  h.StrokeLinejoin('round'),
                  h.D('M6 18L18 6M6 6l12 12'),
                ]),
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
              [
                h.span([], ['D']),
                h.span([], ['E']),
                h.span([], ['V']),
                h.span(
                  [
                    h.Class('opacity-60'),
                    h.Style({ fontSize: '8px', lineHeight: '1' }),
                  ],
                  ['·'],
                ),
                h.span(
                  [
                    h.Class('tabular-nums font-normal tracking-normal'),
                    h.Style({
                      fontSize: '9px',
                      lineHeight: '1',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0',
                    }),
                  ],
                  [`${model.fps}`],
                ),
              ],
            ),
      ],
    )

  const headerClass =
    'flex items-center justify-between px-3 py-1.5 border-b shrink-0'

  const actionButtonClass =
    'dt-resume-button bg-transparent border-none text-dt-live cursor-pointer text-base font-mono font-medium'

  const statusClass = 'text-base font-mono'

  const clearHistoryButton = (): Html =>
    h.button(
      [h.Class(headerButtonClass), h.OnClick(Message.ClickedClear())],
      ['Clear history'],
    )

  const submodelLabel = (tag: string): string =>
    pipe(tag, String.replace(/^Got/, ''), String.replace(/Message$/, ''))

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
      h.path([
        h.D(CHECK_ICON),
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
      ]),
    ],
  )

  const filterItemLabel = (item: string): string =>
    String.isNonEmpty(item) ? submodelLabel(item) : 'All Messages'

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
      h.path([
        h.D(ARROW_UP),
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
      ]),
    ],
  )

  const scrollToTopPillView = (): Html =>
    h.button(
      [h.Class('dt-scroll-pill'), h.OnClick(Message.ClickedScrollToTopPill())],
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
        maybeSelectedValue: Option.orElseSome(
          model.maybeSubmodelFilter,
          () => ALL_MESSAGES_VALUE,
        ),
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
                h.path([
                  h.D(CHEVRON_DOWN),
                  h.StrokeLinecap('round'),
                  h.StrokeLinejoin('round'),
                ]),
              ],
            ),
          ],
        ),
        buttonClassName: 'dt-filter-button',
        itemsClassName: 'dt-filter-items',
        className: 'dt-filter-wrapper',
        backdropClassName: 'dt-filter-backdrop',
      },
      toParentMessage: message => Message.GotSubmodelFilterMessage({ message }),
    })
  }

  // SETTINGS

  const outlineSwitchView = (model: Model): Html =>
    Switch.view(
      {
        id: OUTLINE_SWITCH_ID,
        isChecked: model.isOutlinesEnabled,
        onToggle: isOutlinesEnabled =>
          Message.ToggledOutlines({ isOutlinesEnabled }),
        toView: attributes =>
          h.div(
            [h.Class('dt-settings-row')],
            [
              h.div(
                [...attributes.button, h.Class('dt-switch')],
                [h.span([h.Class('dt-switch-thumb')])],
              ),
              h.div(
                [h.Class('dt-settings-row-text')],
                [
                  h.label(
                    [...attributes.label, h.Class('dt-settings-row-label')],
                    ['Highlight re-renders'],
                  ),
                  h.span(
                    [
                      ...attributes.description,
                      h.Class('dt-settings-row-description'),
                    ],
                    ['Show fading outlines for re-rendered boundaries'],
                  ),
                ],
              ),
            ],
          ),
      },
      h,
    )

  const flattenSwitchView = (model: Model): Html =>
    Switch.view(
      {
        id: FLATTEN_SWITCH_ID,
        isChecked: model.isFlattened,
        onToggle: isFlattened => Message.ToggledFlatten({ isFlattened }),
        toView: attributes =>
          h.div(
            [h.Class('dt-settings-row')],
            [
              h.div(
                [...attributes.button, h.Class('dt-switch')],
                [h.span([h.Class('dt-switch-thumb')])],
              ),
              h.div(
                [h.Class('dt-settings-row-text')],
                [
                  h.label(
                    [...attributes.label, h.Class('dt-settings-row-label')],
                    ['Flatten to leaf Message'],
                  ),
                  h.span(
                    [
                      ...attributes.description,
                      h.Class('dt-settings-row-description'),
                    ],
                    ['Label each row with its innermost Message'],
                  ),
                ],
              ),
            ],
          ),
      },
      h,
    )

  const settingsScreenView = (model: Model): Html =>
    h.div(
      [h.Class('flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-none')],
      [
        h.div(
          [h.Class('flex flex-col')],
          [
            h.span([h.Class('dt-settings-section-title')], ['Message List']),
            flattenSwitchView(model),
          ],
        ),
        h.div(
          [h.Class('flex flex-col')],
          [
            h.span([h.Class('dt-settings-section-title')], ['Rendering']),
            outlineSwitchView(model),
          ],
        ),
      ],
    )

  const headerView = (model: Model): Html => {
    const { status, maybeAction } = Match.value(mode).pipe(
      Match.withReturnType<
        Readonly<{ status: Html; maybeAction: Option.Option<Html> }>
      >(),
      Match.when('TimeTravel', () =>
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
                  [
                    h.Class(actionButtonClass),
                    h.OnClick(Message.ClickedResume()),
                  ],
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
      Match.when('Inspect', () => ({
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
            [
              h.Class(actionButtonClass),
              h.OnClick(Message.ClickedFollowLatest()),
            ],
            ['Follow Latest →'],
          ),
        ),
      })),
      Match.exhaustive,
    )

    const maybeClearHistoryButton = OptionExt.when(
      !model.isPaused,
      clearHistoryButton(),
    )

    const fpsHeaderView: Html = h.span(
      [
        h.Class('text-2xs text-dt-muted font-mono tabular-nums shrink-0'),
        h.Style({ fontVariantNumeric: 'tabular-nums' }),
      ],
      [`${model.fps}fps`],
    )

    const leftGroup: Html = h.div(
      [h.Class('flex items-center gap-2 min-w-0')],
      [
        status,
        h.span([h.Class('text-dt-muted text-2xs')], ['|']),
        fpsHeaderView,
      ],
    )

    return h.header(
      [h.Class(headerClass)],
      [
        leftGroup,
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
        h.OnClick(Message.ClickedRow({ index: INIT_INDEX })),
      ],
      [
        ...OptionExt.when(
          mode === 'TimeTravel',
          h.span(
            [h.Class('pause-column')],
            isPausedHere ? [pauseIconView] : [],
          ),
        ).pipe(Option.toArray),
        h.span([h.Class('dot-column')]),
        h.span([h.Class(indexClass)]),
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
      h.path([
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
        h.D('M5.75 3v18M18.25 3v18'),
      ]),
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
      globalThis.String(absoluteIndex),
      [
        h.Class(clsx(ROW_BASE, { selected: isSelected })),
        h.OnClick(Message.ClickedRow({ index: absoluteIndex })),
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
        h.span([h.Class(indexClass)], [globalThis.String(absoluteIndex + 1)]),
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
    isFlattened: boolean,
  ): Html => {
    const baseTimestamp = pipe(
      entries,
      Array.head,
      Option.match({
        onNone: () => 0,
        onSome: ({ timestamp }) => timestamp,
      }),
    )

    const isInitSelected = selectedIndex === INIT_INDEX
    const isFiltered = Option.isSome(maybeFilterTag)

    const leafOrTag = (entry: typeof DisplayEntry.Type): string =>
      Option.getOrElse(entry.maybeLeafTag, () => entry.tag)

    const displayTagFor = (entry: typeof DisplayEntry.Type): string => {
      if (isFlattened) {
        return leafOrTag(entry)
      } else {
        return Option.match(maybeFilterTag, {
          onNone: () => entry.tag,
          onSome: filterTag =>
            pipe(
              entry.submodelPath,
              Array.findFirstIndex(pathTag => pathTag === filterTag),
              Option.flatMap(filterIndex =>
                Array.get(entry.submodelPath, Number.increment(filterIndex)),
              ),
              Option.orElse(() => entry.maybeLeafTag),
              Option.getOrElse(() => entry.tag),
            ),
        })
      }
    }

    const indexedEntries: ReadonlyArray<
      Readonly<{
        entry: typeof DisplayEntry.Type
        absoluteIndex: number
      }>
    > = pipe(
      entries,
      Array.map((entry, arrayIndex) => ({
        entry,
        absoluteIndex: startIndex + arrayIndex,
      })),
      isFiltered
        ? Array.filter(({ entry }) =>
            Array.contains(entry.submodelPath, maybeFilterTag.value),
          )
        : Function.identity,
    )

    const messageRows = pipe(
      indexedEntries,
      Array.map(({ entry, absoluteIndex }) => {
        const isSelected = selectedIndex === absoluteIndex
        const isPausedHere = isPaused && pausedAtIndex === absoluteIndex
        const displayTag = displayTagFor(entry)

        return lazyMessageRow(
          globalThis.String(absoluteIndex),
          messageRowView,
          [
            displayTag,
            absoluteIndex,
            isSelected,
            isPausedHere,
            entry.timestamp - baseTimestamp,
            entry.isModelChanged,
          ],
        )
      }),
      Array.reverse,
    )

    return h.ul(
      [
        h.Class('message-list flex-1 overflow-y-auto min-h-0 overscroll-none'),
        h.OnScroll(scrollTop => Message.ScrolledMessageList({ scrollTop })),
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
      model.isFlattened,
    ])
  }

  // SCRUBBER

  const scrubberPositionLabel = (model: Model): string => {
    const total = globalThis.String(model.entries.length).padStart(3, '0')
    const current = globalThis.String(model.scrubberValue).padStart(3, '0')
    return `${current} / ${total}`
  }

  const scrubberView = (model: Model): Html =>
    h.submodel({
      slotId: model.scrubberSlider.id,
      model: model.scrubberSlider,
      view: Slider.view,
      viewInputs: {
        value: model.scrubberValue,
        ariaLabel: 'Session scrubber',
        getTrackRoot: () => shadow,
        formatValue: value =>
          value === 0 ? 'init' : `Message ${globalThis.String(value)}`,
        toView: attributes =>
          h.div(
            [h.Class('flex items-center gap-3 flex-1 min-w-0')],
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
                      h.div([
                        ...attributes.filledTrack,
                        h.Class('dt-scrubber-fill'),
                      ]),
                      h.div([
                        ...attributes.thumb,
                        h.Class('dt-scrubber-thumb'),
                      ]),
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
      toParentMessage: message => Message.GotScrubberSliderMessage({ message }),
    })

  // FOOTER

  const isScrubberVisible = mode === 'TimeTravel'

  const GEAR_OUTER =
    'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z'
  const GEAR_INNER = 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'

  const X_MARK = 'M6 18L18 6M6 6l12 12'

  const gearIconView: Html = h.svg(
    [
      h.AriaHidden(true),
      h.Class('dt-settings-icon shrink-0'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('1.5'),
      h.Stroke('currentColor'),
    ],
    [
      h.path([
        h.D(GEAR_OUTER),
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
      ]),
      h.path([
        h.D(GEAR_INNER),
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
      ]),
    ],
  )

  const closeSettingsIconView: Html = h.svg(
    [
      h.AriaHidden(true),
      h.Class('dt-settings-icon shrink-0'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('2'),
      h.Stroke('currentColor'),
    ],
    [
      h.path([
        h.D(X_MARK),
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
      ]),
    ],
  )

  const settingsToggleView = (screen: Screen): Html => {
    const isSettingsOpen = screen === 'Settings'

    return h.button(
      [
        h.Class(
          clsx('dt-settings-button', {
            'dt-settings-button-active': isSettingsOpen,
          }),
        ),
        h.AriaLabel(isSettingsOpen ? 'Close settings' : 'Settings'),
        h.AriaPressed(globalThis.String(isSettingsOpen)),
        h.OnClick(Message.ClickedSettingsToggle()),
      ],
      [isSettingsOpen ? closeSettingsIconView : gearIconView],
    )
  }

  const footerView = (model: Model): Html =>
    h.div(
      [
        h.Class(
          'dt-footer flex items-center gap-3 px-3 py-2 border-t shrink-0',
        ),
      ],
      [
        settingsToggleView(model.screen),
        ...OptionExt.when(isScrubberVisible, scrubberView(model)).pipe(
          Option.toArray,
        ),
      ],
    )

  // PANEL

  const messagesScreenView = (model: Model): Html => {
    const maybeSubmodelFilterView = OptionExt.when(
      Array.isReadonlyArrayNonEmpty(model.submodelTags),
      submodelFilterView(model),
    )
    const maybeScrollToTopPillView = OptionExt.when(
      !model.isFollowingTop,
      scrollToTopPillView(),
    )

    return h.div(
      [h.Class('flex flex-1 min-h-0 dt-content')],
      [
        h.div(
          [h.Class('flex flex-col min-h-0 dt-message-pane')],
          [
            ...Option.toArray(maybeSubmodelFilterView),
            ...Option.toArray(maybeScrollToTopPillView),
            messageListView(model),
          ],
        ),
        inspectorPaneView(model),
      ],
    )
  }

  const contentView = (model: Model): Html =>
    Match.value(model.screen).pipe(
      Match.withReturnType<Html>(),
      Match.when('Messages', () => messagesScreenView(model)),
      Match.when('Settings', () => settingsScreenView(model)),
      Match.exhaustive,
    )

  const panelView = (model: Model): Html =>
    h.div(
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
        contentView(model),
        footerView(model),
      ],
    )

  const interactionBlocker = (): Html =>
    h.div([h.Class('dt-interaction-blocker')])

  return (model: Model): Html =>
    h.div(
      [],
      [
        ...OptionExt.when(
          model.isPaused && mode === 'TimeTravel',
          interactionBlocker(),
        ).pipe(Option.toArray),
        ...OptionExt.when(model.isOpen, panelView(model)).pipe(Option.toArray),
        badgeView(model),
      ],
    )
}

// CREATE

const VIEW_TRANSITION_NAME = 'foldkit-devtools'
const VIEW_TRANSITION_STYLE_ID = 'foldkit-devtools-view-transition'

/**
 * Holds the overlay still through an application's View Transitions.
 *
 * The host's `view-transition-name` lifts the overlay out of the page's root
 * snapshot, which is what stops it cross-fading with the page. The browser then
 * gives it its own pair of snapshots and cross-fades those against each other
 * instead. The overlay is identical on both sides of any application render, so
 * rather than rely on that cross-fade being lossless, the outgoing snapshot is
 * hidden and the incoming one held opaque.
 *
 * Only the two snapshots are pinned. The host spans the viewport, so its old
 * and new geometry are identical and the group's animation is already a no-op;
 * there is nothing to gain by overriding it.
 *
 * These pseudo-elements live on the top-level document, which the overlay's own
 * shadow styles cannot reach, so the rule goes in `document.head`.
 */
const installViewTransitionStyle = (): void => {
  if (document.getElementById(VIEW_TRANSITION_STYLE_ID) !== null) {
    return
  }

  const style = document.createElement('style')
  style.id = VIEW_TRANSITION_STYLE_ID
  // NOTE: the UA composites these snapshots with `plus-lighter`, which is
  // right for a cross-fade and wrong for a snapshot held opaque: it adds to
  // the backdrop and washes the overlay out.
  style.textContent = `
::view-transition-old(${VIEW_TRANSITION_NAME}) {
  animation: none;
  opacity: 0;
  mix-blend-mode: normal;
}

::view-transition-new(${VIEW_TRANSITION_NAME}) {
  animation: none;
  opacity: 1;
  mix-blend-mode: normal;
}
`
  document.head.appendChild(style)
}

const createShadowContainer = (): Readonly<{
  container: HTMLElement
  shadow: ShadowRoot
}> => {
  const existingHost = document.getElementById(DEVTOOLS_HOST_ID)
  if (existingHost) {
    existingHost.remove()
  }

  installViewTransitionStyle()

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
  // NOTE: the name is set here, not on `:host` alongside every other host
  // property. A `view-transition-name` reaching the host through a shadow
  // `:host` rule computes (`getComputedStyle` reports it) but Chromium does
  // not then capture the element as its own snapshot, so the overlay stays in
  // the page's root snapshot and cross-fades with it. Authored from the light
  // DOM it captures. Observed in Chromium 149 and not checked elsewhere;
  // moving this into the stylesheet reintroduces the fade with no other
  // symptom.
  host.style.viewTransitionName = VIEW_TRANSITION_NAME
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
    const { container, shadow } = yield* Effect.acquireRelease(
      Effect.sync(() => createShadowContainer()),
      createdShadowContainer =>
        Effect.sync(() => {
          createdShadowContainer.shadow.host.remove()
          document.getElementById(VIEW_TRANSITION_STYLE_ID)?.remove()
        }),
    )
    container.id = DEVTOOLS_OVERLAY_RUNTIME_ID

    const { isOutlinesEnabled: persistedIsOutlinesEnabled } =
      yield* readPersistedState

    const outline = yield* makeOutlineService(persistedIsOutlinesEnabled)

    const flags: Effect.Effect<typeof Flags.Type> = Effect.gen(function* () {
      const storeState = yield* SubscriptionRef.get(store.stateRef)
      const { isOpen, isFlattened, isOutlinesEnabled } =
        yield* readPersistedState
      return {
        isOpen,
        isMobile: window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches,
        isFlattened,
        isOutlinesEnabled,
        ...toDisplayState(storeState),
      }
    })

    const init = (flags: typeof Flags.Type): UpdateReturn => {
      const { isFlattened, isOutlinesEnabled, ...displayFlags } = flags
      const sliderMax = flags.entries.length
      const initialSliderValue = flags.isPaused
        ? hostIndexToSliderValue(flags.pausedAtIndex, flags.startIndex)
        : sliderMax

      return {
        model: {
          screen: 'Messages',
          ...displayFlags,
          isFlattened,
          isOutlinesEnabled,
          fps: 60,
          selectedIndex: INIT_INDEX,
          isFollowingLatest: true,
          isFollowingTop: true,
          submodelTags: computeSubmodelTags(flags.entries),
          maybeSubmodelFilter: Option.none(),
          submodelFilterListbox: Listbox.init({
            id: SUBMODEL_FILTER_ID,
          }),
          maybeInspectedModel: Option.none(),
          maybeInspectedMessage: Option.none(),
          expandedPaths: HashSet.empty(),
          changedPaths: HashSet.empty(),
          affectedPaths: HashSet.empty(),
          maybePendingScrubIndex: Option.none(),
          inspectorTabs: Tabs.init({ id: INSPECTOR_TABS_ID }),
          activeInspectorTab: 'Model',
          scrubberSlider: Slider.init({
            id: SCRUBBER_SLIDER_ID,
            min: 0,
            max: sliderMax,
            step: 1,
          }),
          scrubberValue: Slider.snapAndClamp(
            initialSliderValue,
            0,
            sliderMax,
            1,
          ),
        },
        commands: Option.toArray(maybeLockScroll(flags.isOpen, flags.isMobile)),
      }
    }

    const overlayRuntime = makeElement({
      Model,
      Flags,
      flags,
      init,
      update: makeUpdate(store, shadow, mode, outline),
      view: makeView(position, mode, shadow, maybeBanner),
      container,
      subscriptions: makeOverlaySubscriptions(store, shadow),
      devTools: false,
      freezeModel: false,
    })

    yield* Effect.forkScoped(overlayRuntime.start())
  })
