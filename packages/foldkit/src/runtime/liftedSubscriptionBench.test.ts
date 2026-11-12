import {
  Array,
  Effect,
  Fiber,
  Number,
  Option,
  Predicate,
  Record,
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
 * Internal benchmark for Subscriptions lifted through a deriving `read`.
 * Skipped by default to keep CI runs lean. Run with:
 *
 *   RUN_RUNTIME_BENCH=1 pnpm vitest run src/runtime/liftedSubscriptionBench.test.ts
 *
 * Starts a counter application whose N Subscriptions are lifted from a child
 * record through a `read` that derives the child Model from the parent (it
 * indexes a list of settings by key, as a child context built from parent
 * fields does). Dispatches a burst of Messages that each change the Model and
 * measures wall-clock time until every Subscription has derived its
 * dependencies from every Model.
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

const SETTING_COUNT = 100

const Setting = Schema.Struct({ key: Schema.String, value: Schema.String })

const Model = Schema.Struct({
  count: Schema.Number,
  settings: Schema.Array(Setting),
})
type Model = typeof Model.Type

type ChildModel = Readonly<{
  count: number
  settingsByKey: Readonly<Record<string, string>>
}>

const Message = defineMessageUnion({
  Increment: {},
})
type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

const init = (): UpdateReturn => ({
  model: {
    count: 0,
    settings: Array.makeBy(SETTING_COUNT, index => ({
      key: `setting${index}`,
      value: `value${index}`,
    })),
  },
})

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    Increment: () => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
  })

const readChild = (model: Model): Option.Option<ChildModel> =>
  Option.some({
    count: model.count,
    settingsByKey: Record.fromEntries(
      Array.map(model.settings, ({ key, value }) => [key, value]),
    ),
  })

const runOnce = async (
  subscriptionCount: number,
  messageCount: number,
): Promise<number> => {
  const container = document.createElement('div')
  container.id = `bench-${Math.random().toString(36).slice(2)}`
  document.body.appendChild(container)

  const expectedDerivations = subscriptionCount * (messageCount + 1)
  let derivations = 0
  let resolveDerived: () => void = () => {}
  const derived = new Promise<void>(resolve => {
    resolveDerived = resolve
  })

  const childSubscriptions = Subscription.make<ChildModel, Message>()(entry =>
    Object.fromEntries(
      Array.makeBy(subscriptionCount, index => [
        `subscription${index}`,
        entry(
          { isCounting: Schema.Boolean },
          {
            modelToDependencies: model => {
              derivations++
              if (derivations >= expectedDerivations) {
                resolveDerived()
              }
              return { isCounting: model.count >= 0 }
            },
            dependenciesToStream: () => Stream.empty,
          },
        ),
      ]),
    ),
  )

  const subscriptions = Subscription.lift(childSubscriptions)<Model, Message>({
    read: readChild,
    toParentMessage: message => message,
  })

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

describe.skipIf(!isBenchEnabled)('lifted Subscriptions', () => {
  it(
    'measures the per-Message cost of a deriving read',
    { timeout: 600_000 },
    async () => {
      const WARMUP_RUNS = 2
      const MEASURED_RUNS = 7
      const MESSAGE_COUNT = 1_000
      const SUBSCRIPTION_COUNTS = [1, 10, 50, 200, 500]

      for (const subscriptionCount of SUBSCRIPTION_COUNTS) {
        for (let index = 0; index < WARMUP_RUNS; index++) {
          await runOnce(subscriptionCount, MESSAGE_COUNT)
        }

        const samples: Array<number> = []
        for (let index = 0; index < MEASURED_RUNS; index++) {
          samples.push(await runOnce(subscriptionCount, MESSAGE_COUNT))
        }

        const elapsed = median(samples)
        console.log(
          `[bench] ${subscriptionCount} lifted Subscriptions: ` +
            `median=${elapsed.toFixed(1)}ms ` +
            `(n=${samples.length}, ${MESSAGE_COUNT} msgs/run) ` +
            `| ${((elapsed * 1000) / MESSAGE_COUNT).toFixed(2)}µs/msg`,
        )
      }
    },
  )
})
