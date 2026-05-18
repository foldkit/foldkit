import {
  Array,
  Effect,
  HashMap,
  HashSet,
  Match,
  Option,
  Predicate,
  Record,
  String as String_,
  SubscriptionRef,
  pipe,
} from 'effect'

import { evo } from '../struct/index.js'

export const INIT_INDEX = -1
const DEFAULT_KEYFRAME_INTERVAL = 31
const DEFAULT_MAX_ENTRIES = 100

// DIFF

export type DiffResult = Readonly<{
  changedPaths: HashSet.HashSet<string>
  affectedPaths: HashSet.HashSet<string>
}>

export const emptyDiff: DiffResult = {
  changedPaths: HashSet.empty(),
  affectedPaths: HashSet.empty(),
}

const isExpandable = Predicate.isObjectOrArray

export const computeDiff = (
  previous: unknown,
  current: unknown,
): DiffResult => {
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
    } else if (Predicate.isObject(curr) && Predicate.isObject(prev)) {
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
      Array.forEach(key => {
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
    curr.forEach((item, index) => {
      const childPath = `${path}.${index}`
      if (index < prev.length) {
        walk(prev[index], item, childPath)
      } else {
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

// STORE

export type CommandRecord = Readonly<{
  name: string
  args?: Record<string, unknown>
}>

export type MountRecord = Readonly<{
  name: string
  args?: Record<string, unknown>
}>

export type HistoryEntry = Readonly<{
  tag: string
  message: unknown
  commands: ReadonlyArray<CommandRecord>
  mountStarts: ReadonlyArray<MountRecord>
  mountEnds: ReadonlyArray<MountRecord>
  timestamp: number
  isModelChanged: boolean
  diff: DiffResult
}>

export type StoreState = Readonly<{
  entries: ReadonlyArray<HistoryEntry>
  keyframes: HashMap.HashMap<number, unknown>
  maybeInitModel: Option.Option<unknown>
  initCommands: ReadonlyArray<CommandRecord>
  initMountStarts: ReadonlyArray<MountRecord>
  startIndex: number
  isPaused: boolean
  pausedAtIndex: number
  maybeLatestModel: Option.Option<unknown>
}>

export type Bridge = Readonly<{
  replay: (model: unknown, message: unknown) => unknown
  render: (model: unknown) => Effect.Effect<void>
  markRenderPending: Effect.Effect<void>
}>

const emptyState: StoreState = {
  entries: [],
  keyframes: HashMap.empty(),
  maybeInitModel: Option.none(),
  initCommands: [],
  initMountStarts: [],
  startIndex: 0,
  isPaused: false,
  pausedAtIndex: 0,
  maybeLatestModel: Option.none(),
}

/**
 * Options for `createDevToolsStore`.
 *
 * - `maxEntries`: Maximum number of history entries to retain before evicting the oldest segment. Defaults to 100.
 * - `keyframeInterval`: Number of recorded entries between full model snapshots. Smaller values use more memory but make time-travel a constant-time lookup instead of a replay. Set to `1` to snapshot every entry, which keeps time-travel correct under exclusion-from-history (since excluded Messages are never replayed). Defaults to 31.
 */
export type CreateDevToolsStoreOptions = Readonly<{
  maxEntries?: number
  keyframeInterval?: number
}>

export const createDevToolsStore = (
  bridge: Bridge,
  options: CreateDevToolsStoreOptions = {},
): Effect.Effect<DevToolsStore> =>
  Effect.gen(function* () {
    const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
    const keyframeInterval =
      options.keyframeInterval ?? DEFAULT_KEYFRAME_INTERVAL
    const stateRef = yield* SubscriptionRef.make(emptyState)

    const replayToIndex = (state: StoreState, index: number): unknown => {
      // NOTE: the keyframe stored at `index + 1` represents the model
      // state immediately after entry `index` was processed, per the
      // convention `recordMessage` uses. Looking it up first short-circuits
      // replay entirely; this hits on every index when keyframeInterval is
      // 1 and at segment boundaries otherwise. Don't "simplify" to
      // `keyframes[index]` — that's the model BEFORE entry `index`, which
      // would require replaying the entry to land at the right state.
      const directSnapshot = HashMap.get(state.keyframes, index + 1)
      if (Option.isSome(directSnapshot)) {
        return directSnapshot.value
      }

      const segmentStart =
        Math.floor(index / keyframeInterval) * keyframeInterval

      const keyframeIndex = HashMap.has(state.keyframes, segmentStart)
        ? segmentStart
        : state.startIndex

      return pipe(
        state.keyframes,
        HashMap.get(keyframeIndex),
        Option.map(keyframeModel =>
          pipe(
            state.entries,
            Array.drop(keyframeIndex - state.startIndex),
            Array.take(index - keyframeIndex + 1),
            Array.reduce(keyframeModel, (model, entry) =>
              bridge.replay(model, entry.message),
            ),
          ),
        ),
        Option.getOrThrow,
      )
    }

    const addKeyframeIfNeeded =
      (nextAbsoluteIndex: number, modelAfterUpdate: unknown) =>
      (
        keyframes: HashMap.HashMap<number, unknown>,
      ): HashMap.HashMap<number, unknown> =>
        nextAbsoluteIndex % keyframeInterval === 0
          ? HashMap.set(keyframes, nextAbsoluteIndex, modelAfterUpdate)
          : keyframes

    const evictOldestSegment = (state: StoreState): StoreState => {
      const nextStartIndex = state.startIndex + keyframeInterval
      const isPausedAtRetainedIndex =
        state.pausedAtIndex >= nextStartIndex ||
        state.pausedAtIndex === INIT_INDEX

      return evo(state, {
        entries: Array.drop(keyframeInterval),
        keyframes: HashMap.remove(state.startIndex),
        startIndex: () => nextStartIndex,
        isPaused: isPaused => isPaused && isPausedAtRetainedIndex,
      })
    }

    const recordInit = (
      model: unknown,
      commands: ReadonlyArray<CommandRecord>,
      mountStarts: ReadonlyArray<MountRecord> = [],
    ) =>
      SubscriptionRef.update(stateRef, state =>
        evo(state, {
          maybeInitModel: () => Option.some(model),
          initCommands: () => commands,
          initMountStarts: () => mountStarts,
          keyframes: HashMap.set(0, model),
          maybeLatestModel: () => Option.some(model),
        }),
      )

    const recordMessage = (
      message: Readonly<{ _tag: string }>,
      modelBeforeUpdate: unknown,
      modelAfterUpdate: unknown,
      commands: ReadonlyArray<CommandRecord>,
      isModelChanged: boolean,
    ) =>
      SubscriptionRef.update(stateRef, state => {
        const absoluteIndex = state.startIndex + state.entries.length

        const diff = isModelChanged
          ? computeDiff(modelBeforeUpdate, modelAfterUpdate)
          : emptyDiff

        const hasChangedFields = HashSet.size(diff.changedPaths) > 0

        const nextState = evo(state, {
          entries: Array.append({
            tag: message._tag,
            message,
            commands,
            mountStarts: [],
            mountEnds: [],
            timestamp: performance.now(),
            isModelChanged: hasChangedFields,
            diff,
          }),
          keyframes: addKeyframeIfNeeded(absoluteIndex + 1, modelAfterUpdate),
          maybeLatestModel: () => Option.some(modelAfterUpdate),
        })

        return nextState.entries.length > maxEntries
          ? evictOldestSegment(nextState)
          : nextState
      })

    /** Attaches Mount lifecycle events from the most recent render to the
     *  history entry that triggered the render. Mount events fire during
     *  snabbdom's `patch` (inside `render`), but the runtime's render loop
     *  is gated by `requestAnimationFrame`, so a render may fire after the
     *  Message that dirtied it has already been recorded. The runtime drains
     *  its mount buffer after each render and calls this to associate the
     *  events with the correct entry. When called before any Message has been
     *  recorded (only possible from the init render path), the starts attach
     *  to `initMountStarts`; init has no `ends` because nothing existed
     *  to unmount. */
    const attachRenderedMounts = (
      mountStarts: ReadonlyArray<MountRecord>,
      mountEnds: ReadonlyArray<MountRecord>,
    ) =>
      SubscriptionRef.update(stateRef, state => {
        if (
          Array.isReadonlyArrayEmpty(mountStarts) &&
          Array.isReadonlyArrayEmpty(mountEnds)
        ) {
          return state
        }

        return Array.match(state.entries, {
          onEmpty: () =>
            evo(state, {
              initMountStarts: Array.appendAll(mountStarts),
            }),
          onNonEmpty: entries =>
            evo(state, {
              entries: () =>
                Array.modifyLastNonEmpty(entries, last =>
                  evo(last, {
                    mountStarts: Array.appendAll(mountStarts),
                    mountEnds: Array.appendAll(mountEnds),
                  }),
                ),
            }),
        })
      })

    const latestEntryIndex = (state: StoreState): number =>
      Array.match(state.entries, {
        onEmpty: () => INIT_INDEX,
        onNonEmpty: entries => state.startIndex + entries.length - 1,
      })

    // NOTE: maybeLatestModel must be stamped atomically with the entries
    // append in recordMessage. The follow-latest fast-path below depends on
    // that invariant.
    const resolveModel = (state: StoreState, index: number): unknown =>
      Match.value(index).pipe(
        Match.when(INIT_INDEX, () => Option.getOrThrow(state.maybeInitModel)),
        Match.when(latestEntryIndex(state), () =>
          Option.getOrThrow(state.maybeLatestModel),
        ),
        Match.orElse(() => replayToIndex(state, index)),
      )

    const getModelAtIndex = (index: number) =>
      pipe(
        stateRef,
        SubscriptionRef.get,
        Effect.map(state => resolveModel(state, index)),
      )

    const getMessageAtIndex = (index: number) =>
      Effect.gen(function* () {
        if (index === INIT_INDEX) {
          return Option.none()
        }

        const state = yield* SubscriptionRef.get(stateRef)

        return pipe(
          state.entries,
          Array.get(index - state.startIndex),
          Option.map(({ message }) => message),
        )
      })

    const jumpTo = (index: number) =>
      Effect.gen(function* () {
        const state = yield* SubscriptionRef.get(stateRef)
        yield* bridge.render(resolveModel(state, index))
        yield* SubscriptionRef.set(
          stateRef,
          evo(state, {
            isPaused: () => true,
            pausedAtIndex: () => index,
          }),
        )
      })

    const resume = Effect.gen(function* () {
      yield* SubscriptionRef.update(stateRef, state =>
        evo(state, {
          isPaused: () => false,
        }),
      )
      yield* bridge.markRenderPending
    })

    // NOTE: the paused snapshot is replayed off the entries array, so wiping
    // entries while paused strands the runtime on a historical state with no
    // path back to live. Refuse the write until resume.
    const clear = SubscriptionRef.update(stateRef, state => {
      if (state.isPaused) {
        return state
      } else {
        return evo(state, {
          entries: () => [],
          startIndex: () => 0,
          pausedAtIndex: () => 0,
          keyframes: () =>
            Option.match(state.maybeInitModel, {
              onNone: () => HashMap.empty(),
              onSome: model => HashMap.make([0, model]),
            }),
          maybeLatestModel: () => state.maybeInitModel,
        })
      }
    })

    const getDiffAtIndex = (index: number) =>
      Effect.gen(function* () {
        if (index === INIT_INDEX) {
          return emptyDiff
        }

        const state = yield* SubscriptionRef.get(stateRef)

        return pipe(
          state.entries,
          Array.get(index - state.startIndex),
          Option.match({
            onNone: () => emptyDiff,
            onSome: ({ diff }) => diff,
          }),
        )
      })

    const updateLatestModel = (model: unknown) =>
      SubscriptionRef.update(
        stateRef,
        evo({ maybeLatestModel: () => Option.some(model) }),
      )

    return {
      recordInit,
      recordMessage,
      updateLatestModel,
      attachRenderedMounts,
      getModelAtIndex,
      getMessageAtIndex,
      getDiffAtIndex,
      jumpTo,
      resume,
      clear,
      stateRef,
    }
  })

export type DevToolsStore = Readonly<{
  recordInit: (
    model: unknown,
    commands: ReadonlyArray<CommandRecord>,
    mountStarts?: ReadonlyArray<MountRecord>,
  ) => Effect.Effect<void>
  recordMessage: (
    message: Readonly<{ _tag: string }>,
    modelBeforeUpdate: unknown,
    modelAfterUpdate: unknown,
    commands: ReadonlyArray<CommandRecord>,
    isModelChanged: boolean,
  ) => Effect.Effect<void>
  updateLatestModel: (model: unknown) => Effect.Effect<void>
  attachRenderedMounts: (
    mountStarts: ReadonlyArray<MountRecord>,
    mountEnds: ReadonlyArray<MountRecord>,
  ) => Effect.Effect<void>
  getModelAtIndex: (index: number) => Effect.Effect<unknown>
  getMessageAtIndex: (index: number) => Effect.Effect<Option.Option<unknown>>
  getDiffAtIndex: (index: number) => Effect.Effect<DiffResult>
  jumpTo: (index: number) => Effect.Effect<void>
  resume: Effect.Effect<void>
  clear: Effect.Effect<void>
  stateRef: SubscriptionRef.SubscriptionRef<StoreState>
}>
