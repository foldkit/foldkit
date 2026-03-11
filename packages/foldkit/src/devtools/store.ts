import { Array, Effect, HashMap, Option, SubscriptionRef, pipe } from 'effect'

const KEYFRAME_INTERVAL = 31
const DEFAULT_MAX_ENTRIES = 500

type HistoryEntry = Readonly<{
  tag: string
  message: unknown
  commandCount: number
  timestamp: number
}>

type StoreState = Readonly<{
  entries: ReadonlyArray<HistoryEntry>
  keyframes: HashMap.HashMap<number, unknown>
  startIndex: number
  isPaused: boolean
  pausedAtIndex: number
}>

type Bridge = Readonly<{
  replay: (model: unknown, message: unknown) => unknown
  render: (model: unknown) => Effect.Effect<void>
  getCurrentModel: Effect.Effect<unknown>
}>

const emptyState: StoreState = {
  entries: [],
  keyframes: HashMap.empty(),
  startIndex: 0,
  isPaused: false,
  pausedAtIndex: 0,
}

const createDevtoolsStore = (
  bridge: Bridge,
  maxEntries = DEFAULT_MAX_ENTRIES,
) =>
  Effect.gen(function* () {
    const stateRef = yield* SubscriptionRef.make(emptyState)

    const replayToIndex = (state: StoreState, index: number): unknown => {
      const segmentStart =
        Math.floor(index / KEYFRAME_INTERVAL) * KEYFRAME_INTERVAL

      const keyframeIndex = HashMap.has(state.keyframes, segmentStart)
        ? segmentStart
        : state.startIndex

      return pipe(
        HashMap.get(state.keyframes, keyframeIndex),
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

      return {
        entries: Array.drop(state.entries, KEYFRAME_INTERVAL),
        keyframes: HashMap.remove(state.keyframes, state.startIndex),
        startIndex: nextStartIndex,
        isPaused: state.isPaused && state.pausedAtIndex >= nextStartIndex,
        pausedAtIndex: state.pausedAtIndex,
      }
    }

    const recordInit = (model: unknown) =>
      SubscriptionRef.update(stateRef, state => ({
        ...state,
        keyframes: HashMap.set(state.keyframes, 0, model),
      }))

    const recordMessage = (
      message: Readonly<{ _tag: string }>,
      modelAfterUpdate: unknown,
      commandCount: number,
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

    const getModelAtIndex = (index: number) =>
      pipe(
        stateRef,
        SubscriptionRef.get,
        Effect.map(state => replayToIndex(state, index)),
      )

    const jumpTo = (index: number) =>
      Effect.gen(function* () {
        const state = yield* SubscriptionRef.get(stateRef)
        yield* bridge.render(replayToIndex(state, index))
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

    const clear = SubscriptionRef.set(stateRef, emptyState)

    return {
      recordInit,
      recordMessage,
      getModelAtIndex,
      jumpTo,
      resume,
      clear,
      stateRef,
    }
  })

type DevtoolsStore = Effect.Effect.Success<
  ReturnType<typeof createDevtoolsStore>
>

export {
  createDevtoolsStore,
  type Bridge,
  type DevtoolsStore,
  type HistoryEntry,
  type StoreState,
}
