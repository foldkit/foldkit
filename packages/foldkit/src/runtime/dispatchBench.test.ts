import { Effect, Match as M, Schema as S } from 'effect'
import { describe, it } from 'vitest'

import { Document, __requireDispatch, html } from '../html/index.js'
import { m } from '../message/index.js'
import { type EnvelopedMessage, orderByPriority } from './messagePriority.js'
import { makeProgram } from './runtime.js'

/**
 * Internal dispatch-throughput benchmark. Skipped by default to keep CI
 * runs lean. Run with:
 *
 *   RUN_RUNTIME_BENCH=1 pnpm vitest run src/runtime/dispatchBench.test.ts
 *
 * Constructs a minimal Foldkit program (counter Model, trivial view that
 * captures the runtime dispatcher), starts it under happy-dom, then dispatches
 * N Messages from outside the runtime and measures wall-clock time for the
 * queue to drain. Also includes a pure-function microbenchmark of
 * `orderByPriority`.
 */

const isBenchEnabled = process.env['RUN_RUNTIME_BENCH'] === '1'

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

const Increment = m('Increment')
const Done = m('Done')
const Message = S.Union([Increment, Done])
type Message = typeof Message.Type

let captureDispatch: ((d: (message: unknown) => void) => void) | null = null

const view = (model: Model): Document => {
  if (captureDispatch !== null) {
    captureDispatch(__requireDispatch())
    captureDispatch = null
  }
  const h = html<Message>()
  return {
    title: 'bench',
    body: h.div([], [model.count.toString()]),
  }
}

const init = (): readonly [Model, ReadonlyArray<never>] => [{ count: 0 }, []]

const runOnce = async (messageCount: number): Promise<number> => {
  const container = document.createElement('div')
  container.id = `bench-${Math.random().toString(36).slice(2)}`
  document.body.appendChild(container)

  let resolveDone: () => void = () => {}
  const done = new Promise<void>(resolve => {
    resolveDone = resolve
  })

  const update = (
    model: Model,
    message: Message,
  ): readonly [Model, ReadonlyArray<never>] =>
    M.value(message).pipe(
      M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
      M.tagsExhaustive({
        Increment: () => [{ count: model.count + 1 }, []],
        Done: () => {
          resolveDone()
          return [model, []]
        },
      }),
    )

  let capturedDispatch: ((message: unknown) => void) | null = null
  captureDispatch = d => {
    capturedDispatch = d
  }

  const program = makeProgram<Model, Message>({
    Model,
    init,
    update,
    view,
    container,
    devTools: false,
    freezeModel: false,
  })

  Effect.runFork(program.start())

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
    dispatch(Increment())
  }
  dispatch(Done())
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

const buildBatch = (size: number): ReadonlyArray<EnvelopedMessage<Message>> => {
  const items: Array<EnvelopedMessage<Message>> = []
  for (let index = 0; index < size; index++) {
    items.push({
      priority: index % 3 === 0 ? 'High' : 'Normal',
      message: Increment(),
    })
  }
  return items
}

describe.skipIf(!isBenchEnabled)('dispatch throughput', () => {
  it(
    'measures throughput of an external Message burst draining the queue',
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

  it('measures orderByPriority over mixed batches', () => {
    const WARMUP_ROUNDS = 1_000
    const MEASURED_ROUNDS = 5_000
    const BATCH_SIZE = 100
    const batch = buildBatch(BATCH_SIZE)

    for (let index = 0; index < WARMUP_ROUNDS; index++) {
      orderByPriority(batch)
    }

    const samples: Array<number> = []
    const TRIALS = 5
    for (let trial = 0; trial < TRIALS; trial++) {
      const start = performance.now()
      for (let index = 0; index < MEASURED_ROUNDS; index++) {
        orderByPriority(batch)
      }
      samples.push(performance.now() - start)
    }

    summarize(`orderByPriority (batch=${BATCH_SIZE})`, MEASURED_ROUNDS, samples)
  })
})
