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

export const INIT_INDEX = -1
const KEYFRAME_INTERVAL = 31
const DEFAULT_MAX_ENTRIES = 500

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

export type HistoryEntry = Readonly<{
  tag: string
  message: unknown
  commandNames: ReadonlyArray<string>
  mountStartNames: ReadonlyArray<string>
  mountEndNames: ReadonlyArray<string>
  timestamp: number
  isModelChanged: boolean
  diff: DiffResult
}>

export type StoreState = Readonly<{
  entries: ReadonlyArray<HistoryEntry>
  keyframes: HashMap.HashMap<number, unknown>
  maybeInitModel: Option.Option<unknown>
  initCommandNames: ReadonlyArray<string>
  initMountStartNames: ReadonlyArray<string>
  startIndex: number
  isPaused: boolean
  pausedAtIndex: number
  maybeLatestModel: Option.Option<unknown>
}>

export type Bridge = Readonly<{
  replay: (model: unknown, message: unknown) => unknown
  render: (model: unknown) => Effect.Effect<void>
  getCurrentModel: Effect.Effect<unknown>
}>

const emptyState: StoreState = {
  entries: [],
  keyframes: HashMap.empty(),
  maybeInitModel: Option.none(),
  initCommandNames: [],
  initMountStartNames: [],
  startIndex: 0,
  isPaused: false,
  pausedAtIndex: 0,
  maybeLatestModel: Option.none(),
}

export const createDevToolsStore = (
  bridge: Bridge,
  maxEntries = DEFAULT_MAX_ENTRIES,
): Effect.Effect<DevToolsStore> =>
  Effect.gen(function* () {
    const stateRef = yield* SubscriptionRef.make(emptyState)

    const replayToIndex = (state: StoreState, index: number): unknown => {
      const segmentStart =
        Math.floor(index / KEYFRAME_INTERVAL) * KEYFRAME_INTERVAL

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

    const addKeyframeIfNeeded = (
      keyframes: HashMap.HashMap<number, unknown>,
      nextAbsoluteIndex: number,
      modelAfterUpdate: unknown,
    ): HashMap.HashMap<number, unknown> =>
      nextAbsoluteIndex % KEYFRAME_INTERVAL === 0
        ? HashMap.set(keyframes, nextAbsoluteIndex, modelAfterUpdate)
        : keyframes

    const evictOldestSegment = (state: StoreState): StoreState => {
      const nextStartIndex = state.startIndex + KEYFRAME_INTERVAL
      const isPausedAtRetainedIndex =
        state.pausedAtIndex >= nextStartIndex ||
        state.pausedAtIndex === INIT_INDEX

      return {
        ...state,
        entries: Array.drop(state.entries, KEYFRAME_INTERVAL),
        keyframes: HashMap.remove(state.keyframes, state.startIndex),
        startIndex: nextStartIndex,
        isPaused: state.isPaused && isPausedAtRetainedIndex,
      }
    }

    const recordInit = (
      model: unknown,
      commandNames: ReadonlyArray<string>,
      mountStartNames: ReadonlyArray<string> = [],
    ) =>
      SubscriptionRef.update(stateRef, state => ({
        ...state,
        maybeInitModel: Option.some(model),
        initCommandNames: commandNames,
        initMountStartNames: mountStartNames,
        keyframes: HashMap.set(state.keyframes, 0, model),
        maybeLatestModel: Option.some(model),
      }))

    const recordMessage = (
      message: Readonly<{ _tag: string }>,
      modelBeforeUpdate: unknown,
      modelAfterUpdate: unknown,
      commandNames: ReadonlyArray<string>,
      isModelChanged: boolean,
    ) =>
      SubscriptionRef.update(stateRef, state => {
        const absoluteIndex = state.startIndex + state.entries.length

        const diff = isModelChanged
          ? computeDiff(modelBeforeUpdate, modelAfterUpdate)
          : emptyDiff

        const hasChangedFields = HashSet.size(diff.changedPaths) > 0

        const nextState: StoreState = {
          ...state,
          entries: Array.append(state.entries, {
            tag: message._tag,
            message,
            commandNames,
            mountStartNames: [],
            mountEndNames: [],
            timestamp: performance.now(),
            isModelChanged: hasChangedFields,
            diff,
          }),
          keyframes: addKeyframeIfNeeded(
            state.keyframes,
            absoluteIndex + 1,
            modelAfterUpdate,
          ),
          maybeLatestModel: Option.some(modelAfterUpdate),
        }

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
     *  to `initMountStartNames`; init has no `ends` because nothing existed
     *  to unmount. */
    const attachRenderedMounts = (
      mountStartNames: ReadonlyArray<string>,
      mountEndNames: ReadonlyArray<string>,
    ) =>
      SubscriptionRef.update(stateRef, state => {
        if (
          Array.isReadonlyArrayEmpty(mountStartNames) &&
          Array.isReadonlyArrayEmpty(mountEndNames)
        ) {
          return state
        }

        return Array.match(state.entries, {
          onEmpty: () => ({
            ...state,
            initMountStartNames: Array.appendAll(
              state.initMountStartNames,
              mountStartNames,
            ),
          }),
          onNonEmpty: entries => ({
            ...state,
            entries: Array.modifyLastNonEmpty(
              entries,
              (last): HistoryEntry => ({
                ...last,
                mountStartNames: Array.appendAll(
                  last.mountStartNames,
                  mountStartNames,
                ),
                mountEndNames: Array.appendAll(
                  last.mountEndNames,
                  mountEndNames,
                ),
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
        yield* SubscriptionRef.set(stateRef, {
          ...state,
          isPaused: true,
          pausedAtIndex: index,
        })
      })

    const resume = Effect.gen(function* () {
      const currentModel = yield* bridge.getCurrentModel
      yield* bridge.render(currentModel)
      yield* SubscriptionRef.update(stateRef, state => ({
        ...state,
        isPaused: false,
      }))
    })

    const clear = SubscriptionRef.update(stateRef, state => ({
      ...emptyState,
      maybeInitModel: state.maybeInitModel,
      initCommandNames: state.initCommandNames,
      initMountStartNames: state.initMountStartNames,
      keyframes: Option.match(state.maybeInitModel, {
        onNone: () => HashMap.empty(),
        onSome: model =>
          HashMap.set(HashMap.empty<number, unknown>(), 0, model),
      }),
      maybeLatestModel: state.maybeInitModel,
    }))

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

    return {
      recordInit,
      recordMessage,
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
    commandNames: ReadonlyArray<string>,
    mountStartNames?: ReadonlyArray<string>,
  ) => Effect.Effect<void>
  recordMessage: (
    message: Readonly<{ _tag: string }>,
    modelBeforeUpdate: unknown,
    modelAfterUpdate: unknown,
    commandNames: ReadonlyArray<string>,
    isModelChanged: boolean,
  ) => Effect.Effect<void>
  attachRenderedMounts: (
    mountStartNames: ReadonlyArray<string>,
    mountEndNames: ReadonlyArray<string>,
  ) => Effect.Effect<void>
  getModelAtIndex: (index: number) => Effect.Effect<unknown>
  getMessageAtIndex: (index: number) => Effect.Effect<Option.Option<unknown>>
  getDiffAtIndex: (index: number) => Effect.Effect<DiffResult>
  jumpTo: (index: number) => Effect.Effect<void>
  resume: Effect.Effect<void>
  clear: Effect.Effect<void>
  stateRef: SubscriptionRef.SubscriptionRef<StoreState>
}>
