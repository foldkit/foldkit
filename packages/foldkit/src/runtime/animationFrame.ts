import { Context, Effect, Option, Queue, Scheduler, Stream } from 'effect'

import { browserScheduler } from './browserScheduler.js'

const makeAnimationFrameTicks = (
  runInFrame: (now: number, emit: () => void) => void,
): Stream.Stream<number> =>
  Stream.callback<number>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const state = {
          frameId: 0,
          lastTime: performance.now(),
          isActive: true,
        }

        const tick = (now: number): void => {
          if (!state.isActive) {
            return
          }

          const deltaTime = now - state.lastTime
          state.lastTime = now
          runInFrame(now, () => Queue.offerUnsafe(queue, deltaTime))

          if (state.isActive) {
            state.frameId = requestAnimationFrame(tick)
          }
        }

        state.frameId = requestAnimationFrame(tick)
        return state
      }),
      state =>
        Effect.sync(() => {
          state.isActive = false
          cancelAnimationFrame(state.frameId)
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/** @internal The animation-frame source provided by one browser runtime. */
export class AnimationFrameRuntime extends Context.Service<
  AnimationFrameRuntime,
  Readonly<{ ticks: Stream.Stream<number> }>
>()('@foldkit/AnimationFrameRuntime') {}

/** @internal Emits frame deltas using the owning runtime's scheduling context,
 *  or an independent frame source when consumed outside a runtime. */
export const animationFrameTicks: Stream.Stream<number> = Stream.unwrap(
  Effect.gen(function* () {
    const maybeRuntime = yield* Effect.serviceOption(AnimationFrameRuntime)

    return Option.match(maybeRuntime, {
      onNone: () => makeAnimationFrameTicks((_now, emit) => emit()),
      onSome: runtime => runtime.ticks,
    })
  }),
)

/** @internal The frame context and Effect provider owned by one runtime. */
export type AnimationFrameContext = Readonly<{
  currentFrame: () => Option.Option<number>
  provide: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}>

/** @internal Tracks frame callbacks and their browser-scheduler microtasks
 *  without carrying frame context into another runtime or a later task. */
export const createAnimationFrameRuntime = (): AnimationFrameContext => {
  let maybeCurrentFrame = Option.none<number>()

  const runWithFrame = (
    maybeFrame: Option.Option<number>,
    callback: () => void,
  ): void => {
    const maybePreviousFrame = maybeCurrentFrame
    maybeCurrentFrame = maybeFrame

    try {
      callback()
    } finally {
      maybeCurrentFrame = maybePreviousFrame
    }
  }

  const ticks = makeAnimationFrameTicks((now, emit) =>
    runWithFrame(Option.some(now), emit),
  )

  const wrapScheduler = (
    scheduler: Scheduler.Scheduler,
  ): Scheduler.Scheduler => ({
    executionMode: scheduler.executionMode,
    shouldYield: fiber => scheduler.shouldYield(fiber),
    makeDispatcher: () => {
      const dispatcher = scheduler.makeDispatcher()

      return {
        scheduleTask: (task, priority) => {
          const maybeFrame =
            scheduler === browserScheduler ? maybeCurrentFrame : Option.none()

          dispatcher.scheduleTask(
            () => runWithFrame(maybeFrame, task),
            priority,
          )
        },
        flush: () => dispatcher.flush(),
      }
    },
  })

  const provide = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      const scheduler = yield* Scheduler.Scheduler

      return yield* effect.pipe(
        Effect.provideService(AnimationFrameRuntime, { ticks }),
        Effect.provideService(Scheduler.Scheduler, wrapScheduler(scheduler)),
      )
    })

  return {
    currentFrame: () => maybeCurrentFrame,
    provide,
  }
}
