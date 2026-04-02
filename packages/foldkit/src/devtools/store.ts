import {
  Array,
  Effect,
  HashMap,
  HashSet,
  Option,
  Predicate,
  Record,
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

const isExpandable = (value: unknown): boolean =>
  Predicate.isNotNull(value) && typeof value === 'object'

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
    const lastDot = path.lastIndexOf('.')
    if (lastDot === -1) {
      return
    }
    const parent = path.substring(0, lastDot)
    if (!affected.has(parent)) {
      affected.add(parent)
      addAncestors(parent)
    }
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
  timestamp: number
  isModelChanged: boolean
  diff: DiffResult
}>

export type StoreState = Readonly<{
  entries: ReadonlyArray<HistoryEntry>
  keyframes: HashMap.HashMap<number, unknown>
  maybeInitModel: Option.Option<unknown>
  initCommandNames: ReadonlyArray<string>
  startIndex: number
  isPaused: boolean
  pausedAtIndex: number
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
  startIndex: 0,
  isPaused: false,
  pausedAtIndex: 0,
}

export const createDevtoolsStore = (
  bridge: Bridge,
  maxEntries = DEFAULT_MAX_ENTRIES,
): Effect.Effect<DevtoolsStore> =>
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

    const recordInit = (model: unknown, commandNames: ReadonlyArray<string>) =>
      SubscriptionRef.update(stateRef, state => ({
        ...state,
        maybeInitModel: Option.some(model),
        initCommandNames: commandNames,
        keyframes: HashMap.set(state.keyframes, 0, model),
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

        const nextState: StoreState = {
          ...state,
          entries: Array.append(state.entries, {
            tag: message._tag,
            message,
            commandNames,
            timestamp: performance.now(),
            isModelChanged,
            diff,
          }),
          keyframes: addKeyframeIfNeeded(
            state.keyframes,
            absoluteIndex + 1,
            modelAfterUpdate,
          ),
        }

        return nextState.entries.length > maxEntries
          ? evictOldestSegment(nextState)
          : nextState
      })

    const resolveModel = (state: StoreState, index: number): unknown =>
      index === INIT_INDEX
        ? Option.getOrThrow(state.maybeInitModel)
        : replayToIndex(state, index)

    const getModelAtIndex = (index: number) =>
      pipe(
        stateRef,
        SubscriptionRef.get,
        Effect.map(state => resolveModel(state, index)),
      )

    const getMessageAtIndex = (index: number) =>
      SubscriptionRef.get(stateRef).pipe(
        Effect.map(state =>
          index === INIT_INDEX
            ? Option.none<unknown>()
            : pipe(
                state.entries,
                Array.get(index - state.startIndex),
                Option.map(({ message }) => message),
              ),
        ),
      )

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
      keyframes: Option.match(state.maybeInitModel, {
        onNone: () => HashMap.empty(),
        onSome: model =>
          HashMap.set(HashMap.empty<number, unknown>(), 0, model),
      }),
    }))

    const getDiffAtIndex = (index: number) =>
      SubscriptionRef.get(stateRef).pipe(
        Effect.map(state =>
          index === INIT_INDEX
            ? emptyDiff
            : pipe(
                state.entries,
                Array.get(index - state.startIndex),
                Option.map(({ diff }) => diff),
                Option.getOrElse(() => emptyDiff),
              ),
        ),
      )

    return {
      recordInit,
      recordMessage,
      getModelAtIndex,
      getMessageAtIndex,
      getDiffAtIndex,
      jumpTo,
      resume,
      clear,
      stateRef,
    }
  })

export type DevtoolsStore = Readonly<{
  recordInit: (
    model: unknown,
    commandNames: ReadonlyArray<string>,
  ) => Effect.Effect<void>
  recordMessage: (
    message: Readonly<{ _tag: string }>,
    modelBeforeUpdate: unknown,
    modelAfterUpdate: unknown,
    commandNames: ReadonlyArray<string>,
    isModelChanged: boolean,
  ) => Effect.Effect<void>
  getModelAtIndex: (index: number) => Effect.Effect<unknown>
  getMessageAtIndex: (index: number) => Effect.Effect<Option.Option<unknown>>
  getDiffAtIndex: (index: number) => Effect.Effect<DiffResult>
  jumpTo: (index: number) => Effect.Effect<void>
  resume: Effect.Effect<void>
  clear: Effect.Effect<void>
  stateRef: SubscriptionRef.SubscriptionRef<StoreState>
}>
