import {
  Array,
  Effect,
  Fiber,
  Number,
  Option,
  Predicate,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { describe, it } from 'vitest'

import { Document, __htmlBuilder, __requireDispatch } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import { makeApplication } from './makeApplication.js'

/**
 * Internal Subscription fan-out benchmark. Skipped by default to keep CI
 * runs lean. Run with:
 *
 *   RUN_RUNTIME_BENCH=1 pnpm vitest run src/runtime/subscriptionBench.test.ts
 *
 * Starts a counter application with N Subscriptions, dispatches a burst of
 * Messages that each change the Model, and measures wall-clock time until
 * every Subscription has derived its dependencies from every Model and
 * started its stream for the final ones (a restart superseded before its
 * stream starts never starts it; when dependencies never change, the final
 * stream is the one started at boot, before timing begins). The dependency
 * projections are trivial, so the result is the runtime's own
 * per-Subscription cost. Two cases: dependencies that never change (the
 * common case, most Subscriptions on most Messages) and dependencies that
 * change on every Message (every Subscription restarts its stream every
 * time).
 */

// NOTE: reads process.env through globalThis so this browser-typed package
// never needs node type definitions; under vitest the node process global
// is always present.
const readBenchFlag = (): unknown => {
  const nodeProcess: unknown = Reflect.get(globalThis, 'process')
  if (!Predicate.hasProperty(nodeProcess, 'env')) {
    return undefined
  }
  const env = nodeProcess.env
  if (!Predicate.hasProperty(env, 'RUN_RUNTIME_BENCH')) {
    return undefined
  }
  return env.RUN_RUNTIME_BENCH
}

const isBenchEnabled = readBenchFlag() === '1'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  Increment: {},
})
type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

const init = (): UpdateReturn => ({ model: { count: 0 } })

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    Increment: () => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
  })

const DependencyChange = Schema.Literals(['Never', 'EveryMessage'])
type DependencyChange = typeof DependencyChange.Type

const runOnce = async (
  subscriptionCount: number,
  messageCount: number,
  dependencyChange: DependencyChange,
): Promise<number> => {
  const container = document.createElement('div')
  container.id = `bench-${Math.random().toString(36).slice(2)}`
  document.body.appendChild(container)

  const expectedDerivations = subscriptionCount * (messageCount + 1)
  const finalCount = dependencyChange === 'Never' ? 0 : messageCount
  let derivations = 0
  let finalStreamStarts = 0
  let resolveDerived: () => void = () => {}
  const derived = new Promise<void>(resolve => {
    resolveDerived = resolve
  })
  const resolveWhenSettled = (): void => {
    if (
      derivations >= expectedDerivations &&
      finalStreamStarts >= subscriptionCount
    ) {
      resolveDerived()
    }
  }

  const subscriptions = Subscription.make<Model, Message>()(entry =>
    Object.fromEntries(
      Array.makeBy(subscriptionCount, index => [
        `subscription${index}`,
        entry(
          { count: Schema.Number },
          {
            modelToDependencies: model => {
              derivations++
              resolveWhenSettled()
              return {
                count: dependencyChange === 'Never' ? 0 : model.count,
              }
            },
            dependenciesToStream: ({ count }) =>
              Stream.fromEffect(
                Effect.sync(() => {
                  if (count === finalCount) {
                    finalStreamStarts++
                    resolveWhenSettled()
                  }
                }),
              ).pipe(Stream.drain),
          },
        ),
      ]),
    ),
  )

  let capturedDispatch: ((message: unknown) => void) | undefined
  const view = (model: Model): Document => {
    if (capturedDispatch === undefined) {
      capturedDispatch = __requireDispatch()
    }
    const h = __htmlBuilder<Message>()
    return { title: 'bench', body: h.div([], [model.count.toString()]) }
  }

  const application = makeApplication<Model, Message>({
    Model,
    init,
    update,
    view,
    subscriptions,
    container,
    devTools: false,
    freezeModel: false,
  })

  const fiber = Effect.runFork(application.start())

  await new Promise<void>(resolve => {
    const wait = (): void => {
      if (capturedDispatch !== undefined && derivations >= subscriptionCount) {
        resolve()
      } else {
        setTimeout(wait, 0)
      }
    }
    wait()
  })

  const dispatch = capturedDispatch!
  const start = performance.now()
  for (let index = 0; index < messageCount; index++) {
    dispatch(Message.Increment())
  }
  await derived
  const elapsed = performance.now() - start

  await Effect.runPromise(Fiber.interrupt(fiber))
  container.remove()
  return elapsed
}

const median = (samples: ReadonlyArray<number>): number =>
  pipe(
    samples,
    Array.sort(Number.Order),
    sorted => Array.get(sorted, Math.floor(sorted.length / 2)),
    Option.getOrElse(() => 0),
  )

describe.skipIf(!isBenchEnabled)('Subscription fan-out', () => {
  it(
    'measures the per-Message cost of following the Model',
    { timeout: 1_200_000 },
    async () => {
      const WARMUP_RUNS = 2
      const MEASURED_RUNS = 7
      const MESSAGE_COUNT = 1_000
      const SUBSCRIPTION_COUNTS = [1, 10, 50, 200, 500]
      const DEPENDENCY_CHANGES: ReadonlyArray<DependencyChange> = [
        'Never',
        'EveryMessage',
      ]

      for (const dependencyChange of DEPENDENCY_CHANGES) {
        for (const subscriptionCount of SUBSCRIPTION_COUNTS) {
          for (let index = 0; index < WARMUP_RUNS; index++) {
            await runOnce(subscriptionCount, MESSAGE_COUNT, dependencyChange)
          }

          const samples: Array<number> = []
          for (let index = 0; index < MEASURED_RUNS; index++) {
            samples.push(
              await runOnce(subscriptionCount, MESSAGE_COUNT, dependencyChange),
            )
          }

          const elapsed = median(samples)
          console.log(
            `[bench] dependencies change ${dependencyChange}, ` +
              `${subscriptionCount} Subscriptions: ` +
              `median=${elapsed.toFixed(1)}ms ` +
              `(n=${samples.length}, ${MESSAGE_COUNT} msgs/run) ` +
              `| ${((elapsed * 1000) / MESSAGE_COUNT).toFixed(2)}µs/msg`,
          )
        }
      }
    },
  )
})
