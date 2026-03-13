import { Array, Effect, HashMap, Option, SubscriptionRef, pipe } from 'effect'

export const INIT_INDEX = -1
const KEYFRAME_INTERVAL = 31
const DEFAULT_MAX_ENTRIES = 500

export type HistoryEntry = Readonly<{
  tag: string
  message: unknown
  commandCount: number
  timestamp: number
  isModelChanged: boolean
}>

export type StoreState = Readonly<{
  entries: ReadonlyArray<HistoryEntry>
  keyframes: HashMap.HashMap<number, unknown>
  maybeInitModel: Option.Option<unknown>
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

    const recordInit = (model: unknown) =>
      SubscriptionRef.update(stateRef, state => ({
        ...state,
        maybeInitModel: Option.some(model),
        keyframes: HashMap.set(state.keyframes, 0, model),
      }))

    const recordMessage = (
      message: Readonly<{ _tag: string }>,
      modelAfterUpdate: unknown,
      commandCount: number,
      isModelChanged: boolean,
    ) =>
      SubscriptionRef.update(stateRef, state => {
        const absoluteIndex = state.startIndex + state.entries.length

        const nextState: StoreState = {
          ...state,
          entries: Array.append(state.entries, {
            tag: message._tag,
            message,
            commandCount,
            timestamp: performance.now(),
            isModelChanged,
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
      keyframes: Option.match(state.maybeInitModel, {
        onNone: () => HashMap.empty(),
        onSome: model =>
          HashMap.set(HashMap.empty<number, unknown>(), 0, model),
      }),
    }))

    return {
      recordInit,
      recordMessage,
      getModelAtIndex,
      getMessageAtIndex,
      jumpTo,
      resume,
      clear,
      stateRef,
    }
  })

export type DevtoolsStore = Readonly<{
  recordInit: (model: unknown) => Effect.Effect<void>
  recordMessage: (
    message: Readonly<{ _tag: string }>,
    modelAfterUpdate: unknown,
    commandCount: number,
    isModelChanged: boolean,
  ) => Effect.Effect<void>
  getModelAtIndex: (index: number) => Effect.Effect<unknown>
  getMessageAtIndex: (index: number) => Effect.Effect<Option.Option<unknown>>
  jumpTo: (index: number) => Effect.Effect<void>
  resume: Effect.Effect<void>
  clear: Effect.Effect<void>
  stateRef: SubscriptionRef.SubscriptionRef<StoreState>
}>
