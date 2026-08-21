import { Effect, Number, Predicate, Schema as S } from 'effect'
import { describe, it } from 'vitest'

import { Document, __htmlBuilder, __requireDispatch } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { evo } from '../struct/index.js'
import { makeApplication } from './runtime.js'

/**
 * Internal dispatch-throughput benchmark. Skipped by default to keep CI
 * runs lean. Run with:
 *
 *   RUN_RUNTIME_BENCH=1 pnpm vitest run src/runtime/dispatchBench.test.ts
 *
 * Constructs a minimal Foldkit application (counter Model, trivial view that
 * captures the runtime dispatcher), starts it under happy-dom, then dispatches
 * N Messages from outside the runtime and measures wall-clock time until
 * every Message has been processed.
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

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  Increment: {},
  Done: {},
})
type Message = typeof Message.Type

let captureDispatch: ((d: (message: unknown) => void) => void) | null = null

const view = (model: Model): Document => {
  if (captureDispatch !== null) {
    captureDispatch(__requireDispatch())
    captureDispatch = null
  }
  const h = __htmlBuilder<Message>()
  return {
    title: 'bench',
    body: h.div([], [model.count.toString()]),
  }
}

const init = (): Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}> => ({ model: { count: 0 } })

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}>

const runOnce = async (messageCount: number): Promise<number> => {
  const container = document.createElement('div')
  container.id = `bench-${Math.random().toString(36).slice(2)}`
  document.body.appendChild(container)

  let resolveDone: () => void = () => {}
  const done = new Promise<void>(resolve => {
    resolveDone = resolve
  })

  const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
      Increment: () => ({ model: evo(model, { count: Number.increment }) }),
      Done: () => {
        resolveDone()
        return { model }
      },
    })

  let capturedDispatch: ((message: unknown) => void) | null = null
  captureDispatch = d => {
    capturedDispatch = d
  }

  const application = makeApplication<Model, Message>({
    Model,
    init,
    update,
    view,
    container,
    devTools: false,
    freezeModel: false,
  })

  Effect.runFork(application.start())

  await new Promise<void>(resolve => {
    const wait = (): void => {
      if (capturedDispatch !== null) {
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
  dispatch(Message.Done())
  await done
  const elapsed = performance.now() - start

  return elapsed
}

const summarize = (
  label: string,
  messageCount: number,
  samples: ReadonlyArray<number>,
): void => {
  const sorted = [...samples].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  const min = sorted[0] ?? 0
  const max = sorted[sorted.length - 1] ?? 0
  const messagesPerSecond = (messageCount / median) * 1000
  const microsPerMessage = (median * 1000) / messageCount
  console.log(
    `[bench] ${label}: ` +
      `median=${median.toFixed(1)}ms ` +
      `min=${min.toFixed(1)}ms ` +
      `max=${max.toFixed(1)}ms ` +
      `(n=${samples.length}, ${messageCount} msgs/run) ` +
      `| ${microsPerMessage.toFixed(2)}µs/msg ` +
      `| ${messagesPerSecond.toFixed(0)} msg/s`,
  )
}

describe.skipIf(!isBenchEnabled)('dispatch throughput', () => {
  it(
    'measures throughput of an external Message burst',
    { timeout: 120_000 },
    async () => {
      const WARMUP_RUNS = 2
      const MEASURED_RUNS = 8
      const COUNT = 5_000

      for (let index = 0; index < WARMUP_RUNS; index++) {
        await runOnce(COUNT)
      }

      const samples: Array<number> = []
      for (let index = 0; index < MEASURED_RUNS; index++) {
        samples.push(await runOnce(COUNT))
      }

      summarize('external burst', COUNT, samples)
    },
  )
})
