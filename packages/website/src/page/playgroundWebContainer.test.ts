import { Deferred, Effect, Fiber, Ref } from 'effect'
import { TestClock } from 'effect/testing'
import { describe, expect, test, vi } from 'vitest'

import type { WebContainerProcess } from '@webcontainer/api'

import {
  PROCESS_OUTPUT_TAIL_CHARACTERS,
  captureProcessOutput,
  installDependencies,
  startDevServer,
} from './playgroundWebContainer'

const makeProcess = (
  exit: Promise<number>,
  output: ReadableStream<string>,
  kill = vi.fn(),
): WebContainerProcess => ({
  exit,
  input: new WritableStream<string>(),
  output,
  kill,
  resize: vi.fn(),
})

const closedOutput = () =>
  new ReadableStream<string>({
    start(controller) {
      controller.close()
    },
  })

describe('Playground WebContainer processes', () => {
  test('keeps only the newest process output', async () => {
    const newestOutput = 'b'.repeat(128)
    const output = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('a'.repeat(PROCESS_OUTPUT_TAIL_CHARACTERS))
        controller.enqueue(newestOutput)
        controller.close()
      },
    })

    const tail = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const captured = yield* captureProcessOutput(output, 'test process')
          yield* Fiber.join(captured.fiber)
          return yield* Ref.get(captured.tail)
        }),
      ),
    )

    expect(tail).toHaveLength(PROCESS_OUTPUT_TAIL_CHARACTERS)
    expect(tail.endsWith(newestOutput)).toBe(true)
  })

  test('reports output stream failures through the Effect error channel', async () => {
    const output = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('before failure')
        controller.error(new Error('stream broke'))
      },
    })

    const error = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const captured = yield* captureProcessOutput(output, 'test process')
          return yield* Fiber.join(captured.fiber).pipe(Effect.flip)
        }),
      ),
    )

    expect(error.message).toBe('Failed to read test process output.')
    expect(error.cause).toEqual(new Error('stream broke'))
  })

  test('waits for trailing install output before reporting a nonzero exit', async () => {
    const kill = vi.fn()
    const process = makeProcess(
      Promise.resolve(1),
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue('first line\n')
          queueMicrotask(() => {
            controller.enqueue('trailing line')
            controller.close()
          })
        },
      }),
      kill,
    )
    const container = {
      spawn: vi.fn(() => Promise.resolve(process)),
    }

    const error = await Effect.runPromise(
      installDependencies(container).pipe(Effect.flip),
    )

    expect(error.message).toContain('npm install exited with code 1.')
    expect(error.message).toContain('first line\ntrailing line')
    expect(kill).toHaveBeenCalledOnce()
  })

  test('kills a process delivered after its spawn deadline', async () => {
    const lateSpawn = Deferred.makeUnsafe<WebContainerProcess>()
    const kill = vi.fn()
    const process = makeProcess(
      Promise.resolve(0),
      new ReadableStream<string>(),
      kill,
    )
    const container = {
      spawn: vi.fn(() => Effect.runPromise(Deferred.await(lateSpawn))),
    }

    const error = await Effect.runPromise(
      Effect.gen(function* () {
        const installFiber = yield* installDependencies(container).pipe(
          Effect.forkChild({ startImmediately: true }),
        )
        yield* Effect.yieldNow
        yield* TestClock.adjust('91 seconds')
        return yield* Fiber.join(installFiber).pipe(Effect.flip)
      }).pipe(Effect.provide(TestClock.layer())),
    )

    expect(error.message).toBe('npm install did not start within 90 seconds.')
    Effect.runSync(Deferred.succeed(lateSpawn, process))
    await vi.waitFor(() => expect(kill).toHaveBeenCalledOnce())
  })

  test('unsubscribes the readiness listener when the dev process exits early', async () => {
    const unsubscribe = vi.fn()
    const kill = vi.fn()
    const process = makeProcess(Promise.resolve(1), closedOutput(), kill)
    const container = {
      spawn: vi.fn(() => Promise.resolve(process)),
      on: vi.fn(
        (
          _event: 'server-ready',
          _listener: (port: number, url: string) => void,
        ) => unsubscribe,
      ),
    }

    const error = await Effect.runPromise(
      Effect.scoped(startDevServer(container)).pipe(Effect.flip),
    )

    expect(error.message).toBe('npm run dev exited with code 1.')
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(kill).toHaveBeenCalledOnce()
  })

  test('reports a dev output failure before the server becomes ready', async () => {
    const unsubscribe = vi.fn()
    const kill = vi.fn()
    const process = makeProcess(
      Effect.runPromise(Effect.never),
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue('output before failure')
          setTimeout(() => controller.error(new Error('stream broke')), 0)
        },
      }),
      kill,
    )
    const container = {
      spawn: vi.fn(() => Promise.resolve(process)),
      on: vi.fn(
        (
          _event: 'server-ready',
          _listener: (port: number, url: string) => void,
        ) => unsubscribe,
      ),
    }

    const error = await Effect.runPromise(
      Effect.scoped(startDevServer(container)).pipe(Effect.flip),
    )

    expect(error.message).toContain(
      'Failed to read npm run dev output. stream broke',
    )
    expect(error.message).toContain('output before failure')
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(kill).toHaveBeenCalledOnce()
  })

  test('reports a dev process exit after the server becomes ready', async () => {
    const processExit = Deferred.makeUnsafe<number>()
    const unsubscribe = vi.fn()
    const kill = vi.fn()
    const process = makeProcess(
      Effect.runPromise(Deferred.await(processExit)),
      new ReadableStream<string>(),
      kill,
    )
    const container = {
      spawn: vi.fn(() => Promise.resolve(process)),
      on: vi.fn(
        (
          _event: 'server-ready',
          listener: (port: number, url: string) => void,
        ) => {
          queueMicrotask(() => listener(4173, 'http://localhost:4173'))
          return unsubscribe
        },
      ),
    }

    const error = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { previewUrl, serverFailure } = yield* startDevServer(container)
          expect(previewUrl).toBe('http://localhost:4173')
          const failureFiber = yield* Deferred.await(serverFailure).pipe(
            Effect.flip,
            Effect.forkChild({ startImmediately: true }),
          )
          yield* Deferred.succeed(processExit, 2)
          yield* Effect.yieldNow
          yield* TestClock.adjust('2 seconds')
          return yield* Fiber.join(failureFiber)
        }),
      ).pipe(Effect.provide(TestClock.layer())),
    )

    expect(error.message).toBe('npm run dev exited with code 2.')
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(kill).toHaveBeenCalledOnce()
  })

  test('drains trailing dev output before reporting an exit', async () => {
    const processExit = Deferred.makeUnsafe<number>()
    const process = makeProcess(
      Effect.runPromise(Deferred.await(processExit)),
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue('first line\n')
          setTimeout(() => {
            controller.enqueue('trailing line')
            controller.close()
          }, 0)
        },
      }),
    )
    const container = {
      spawn: vi.fn(() => Promise.resolve(process)),
      on: vi.fn(
        (
          _event: 'server-ready',
          listener: (port: number, url: string) => void,
        ) => {
          queueMicrotask(() => listener(4173, 'http://localhost:4173'))
          return vi.fn()
        },
      ),
    }

    const error = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { serverFailure } = yield* startDevServer(container)
          yield* Deferred.succeed(processExit, 2)
          return yield* Deferred.await(serverFailure).pipe(Effect.flip)
        }),
      ),
    )

    expect(error.message).toContain('npm run dev exited with code 2.')
    expect(error.message).toContain('first line\ntrailing line')
  })

  test('drains trailing dev output when reading the exit status fails', async () => {
    const processExit = Deferred.makeUnsafe<number, Error>()
    const process = makeProcess(
      Effect.runPromise(Deferred.await(processExit)),
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue('first line\n')
          setTimeout(() => {
            controller.enqueue('trailing line')
            controller.close()
          }, 0)
        },
      }),
    )
    const container = {
      spawn: vi.fn(() => Promise.resolve(process)),
      on: vi.fn(
        (
          _event: 'server-ready',
          listener: (port: number, url: string) => void,
        ) => {
          queueMicrotask(() => listener(4173, 'http://localhost:4173'))
          return vi.fn()
        },
      ),
    }

    const error = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { serverFailure } = yield* startDevServer(container)
          yield* Deferred.fail(processExit, new Error('exit broke'))
          return yield* Deferred.await(serverFailure).pipe(Effect.flip)
        }),
      ),
    )

    expect(error.message).toContain(
      'npm run dev exit status could not be read. exit broke',
    )
    expect(error.message).toContain('first line\ntrailing line')
  })
})
