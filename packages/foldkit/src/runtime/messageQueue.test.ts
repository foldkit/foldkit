import { Effect, Option } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { type MessageQueue, makeMessageQueue } from './messageQueue.js'
import { type RuntimeStatus, makeRuntimeStatus } from './runtimeStatus.js'

const Message = defineMessageUnion({
  ClickedA: {},
  ClickedB: {},
  ClickedC: {},
  ClickedD: {},
  ClickedE: {},
})
type Message = typeof Message.Type
const lifecycleFlags: ReadonlyArray<keyof RuntimeStatus> = [
  'isRenderingFrame',
  'isRuntimeDisposed',
  'isCrashed',
]
const UPDATE_COST_MS = 6
let processingTime = 0
let deliveries: Array<() => void> = []

beforeEach(() => {
  processingTime = 0
  deliveries = []
  vi.spyOn(performance, 'now').mockImplementation(() => processingTime)
  vi.stubGlobal(
    'MessageChannel',
    class {
      port1 = {
        postMessage: () => deliveries.push(() => this.port2.onmessage?.()),
        close: vi.fn(),
      }
      port2: { onmessage?: () => void; close: () => void } = { close: vi.fn() }
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const withQueue = (
  run: (
    fixture: Readonly<{
      queue: MessageQueue<Message>
      status: RuntimeStatus
      processed: Array<string>
      failed: Array<Option.Option<Message>>
      setProcess: (process: (message: Message) => void) => void
    }>,
  ) => void,
) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const status = makeRuntimeStatus()
        const processed: Array<string> = []
        const failed: Array<Option.Option<Message>> = []
        let process = (_message: Message) => {}
        const queue = yield* makeMessageQueue<Message>({
          status,
          processMessage: message => {
            processed.push(message._tag)
            processingTime += UPDATE_COST_MS
            process(message)
          },
          crashWith: (_cause, maybeMessage) =>
            Effect.sync(() => {
              status.isCrashed = true
              failed.push(maybeMessage)
            }),
        })
        yield* Effect.sync(() =>
          run({
            queue,
            status,
            processed,
            failed,
            setProcess: next => {
              process = next
            },
          }),
        )
      }),
    ),
  )

const deliver = () => {
  const delivery = deliveries.shift()
  expect(delivery).toBeDefined()
  delivery?.()
}

describe('finite queued prefix', () => {
  it('captures FIFO work once and leaves reentrant suffix Messages to the posted drain', async () => {
    await withQueue(({ queue, processed, setProcess }) => {
      queue.enqueueMessage(Message.ClickedA())
      queue.enqueueMessage(Message.ClickedB())
      queue.enqueueMessage(Message.ClickedC())
      queue.completeBoot()
      expect(processed).toEqual(['ClickedA'])
      setProcess(message => {
        if (message._tag === 'ClickedB') {
          queue.enqueueMessage(Message.ClickedD())
        }
        if (message._tag === 'ClickedC') {
          queue.enqueueMessage(Message.ClickedE())
        }
      })
      queue.drainQueuedPrefix()
      expect(processed).toEqual(['ClickedA', 'ClickedB', 'ClickedC'])
      expect(deliveries).toHaveLength(1)
      deliver()
      deliver()
      expect(processed).toEqual([
        'ClickedA',
        'ClickedB',
        'ClickedC',
        'ClickedD',
        'ClickedE',
      ])
      expect(queue.isAnyMessageDeferred()).toBe(false)
    })
  })

  it('retains posted-task ownership after the prefix empties the queue', async () => {
    await withQueue(({ queue, processed }) => {
      queue.enqueueMessage(Message.ClickedA())
      queue.enqueueMessage(Message.ClickedB())
      queue.completeBoot()
      queue.drainQueuedPrefix()
      expect(queue.isAnyMessageDeferred()).toBe(false)
      queue.enqueueMessage(Message.ClickedC())
      expect(processed).toEqual(['ClickedA', 'ClickedB'])
      expect(deliveries).toHaveLength(1)
      deliver()
      expect(processed).toEqual(['ClickedA', 'ClickedB', 'ClickedC'])
    })
  })

  it('respects boot and lifecycle gates and prevents nested processing', async () => {
    await withQueue(({ queue, status, processed, setProcess }) => {
      queue.enqueueMessage(Message.ClickedA())
      queue.drainQueuedPrefix()
      expect(processed).toEqual([])
      queue.enqueueMessage(Message.ClickedB())
      queue.completeBoot()
      for (const flag of lifecycleFlags) {
        status[flag] = true
        queue.drainQueuedPrefix()
        expect(processed).toEqual(['ClickedA'])
        status[flag] = false
      }
      setProcess(() => {
        queue.enqueueMessage(Message.ClickedC())
        queue.drainQueuedPrefix()
        queue.drainPendingMessages()
        expect(processed).toEqual(['ClickedA', 'ClickedB'])
      })
      queue.drainQueuedPrefix()
      setProcess(() => {})
      deliver()
      expect(processed).toEqual(['ClickedA', 'ClickedB', 'ClickedC'])
      queue.resetDrainBudget()
      queue.drainQueuedPrefix()
      queue.enqueueMessage(Message.ClickedD())
      queue.enqueueMessage(Message.ClickedE())
      expect(processed).toEqual([
        'ClickedA',
        'ClickedB',
        'ClickedC',
        'ClickedD',
      ])
      deliver()
      expect(processed).toEqual([
        'ClickedA',
        'ClickedB',
        'ClickedC',
        'ClickedD',
        'ClickedE',
      ])
    })
  })

  it('attributes a prefix defect to the failing Message and stops held drains', async () => {
    await withQueue(({ queue, processed, failed, setProcess }) => {
      for (const message of [
        Message.ClickedA(),
        Message.ClickedB(),
        Message.ClickedC(),
        Message.ClickedD(),
      ]) {
        queue.enqueueMessage(message)
      }
      queue.completeBoot()
      setProcess(message => {
        queue.drainQueuedPrefix()
        if (message._tag === 'ClickedC') {
          throw new Error('prefix failure')
        }
      })
      queue.drainQueuedPrefix()
      expect(processed).toEqual(['ClickedA', 'ClickedB', 'ClickedC'])
      expect(failed).toEqual([Option.some(Message.ClickedC())])
      deliver()
      expect(processed).toEqual(['ClickedA', 'ClickedB', 'ClickedC'])
    })
  })

  it.each([false, true])(
    'restores processing and accounts prefix time on exceptional exit %s',
    async isFailure => {
      await withQueue(({ queue, status, processed, setProcess }) => {
        queue.completeBoot()
        status.isRenderingFrame = true
        queue.enqueueMessage(Message.ClickedA())
        queue.enqueueMessage(Message.ClickedB())
        status.isRenderingFrame = false
        setProcess(message => {
          if (isFailure && message._tag === 'ClickedB') {
            throw new Error('prefix failure')
          }
        })
        queue.drainQueuedPrefix()
        expect(processed).toEqual(['ClickedA', 'ClickedB'])
        expect(status.isCrashed).toBe(isFailure)
        status.isCrashed = false
        setProcess(() => {})
        queue.enqueueMessage(Message.ClickedE())
        expect(processed).toEqual(['ClickedA', 'ClickedB'])
        expect(deliveries).toHaveLength(1)
        deliver()
        expect(processed).toEqual(['ClickedA', 'ClickedB', 'ClickedE'])
      })
    },
  )
})
