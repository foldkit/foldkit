import { Array, Effect, Fiber, Option, Schema, Stream } from 'effect'
import {
  type Mock,
  type MockInstance,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { fromMediaQuery } from './fromMediaQuery.js'
import { make } from './subscription.js'

class FakeMediaQueryList extends EventTarget {
  matches = false
  readonly media: string

  constructor(media: string) {
    super()
    this.media = media
  }

  setMatches(matches: boolean): void {
    this.matches = matches
  }

  dispatchChange(matches: boolean): void {
    this.matches = matches
    const event = new Event('change')
    Object.defineProperty(event, 'matches', { value: matches })
    this.dispatchEvent(event)
  }
}

type MatchMediaHarness = Readonly<{
  list: FakeMediaQueryList
  matchMedia: Mock<(query: string) => FakeMediaQueryList>
  addEventListener: MockInstance<FakeMediaQueryList['addEventListener']>
  removeEventListener: MockInstance<FakeMediaQueryList['removeEventListener']>
}>

const stubMatchMedia = (query: string): MatchMediaHarness => {
  const list = new FakeMediaQueryList(query)
  const addEventListener = vi.spyOn(list, 'addEventListener')
  const removeEventListener = vi.spyOn(list, 'removeEventListener')
  const matchMedia = vi.fn((_requestedQuery: string) => list)

  vi.stubGlobal('matchMedia', matchMedia)

  return { list, matchMedia, addEventListener, removeEventListener }
}

const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

const MAX_SETTLE_TICKS = 20

const settle = async (sink: ReadonlyArray<unknown>, count: number) => {
  for (let remaining = MAX_SETTLE_TICKS; remaining > 0; remaining--) {
    await tick()

    if (sink.length >= count) {
      return
    }
  }
}

const drain = <Output>(
  stream: Stream.Stream<Output>,
  sink: Array<Output>,
): Effect.Effect<void> =>
  Stream.runForEach(stream, output =>
    Effect.sync(() => {
      sink.push(output)
    }),
  )

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const describeMatches = (isMatching: boolean): string =>
  isMatching ? 'reduced' : 'full'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fromMediaQuery', () => {
  it('emits the current value when the Stream starts', async () => {
    const harness = stubMatchMedia(REDUCED_MOTION_QUERY)
    harness.list.setMatches(true)
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromMediaQuery({
          query: REDUCED_MOTION_QUERY,
          mapMatches: describeMatches,
        }),
        received,
      ),
    )

    await settle(received, 1)
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['reduced'])
    expect(harness.matchMedia).toHaveBeenCalledTimes(1)
    expect(harness.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY)
  })

  it('emits each change after the current value', async () => {
    const harness = stubMatchMedia(REDUCED_MOTION_QUERY)
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromMediaQuery({
          query: REDUCED_MOTION_QUERY,
          mapMatches: describeMatches,
        }),
        received,
      ),
    )

    await settle(received, 1)
    harness.list.dispatchChange(true)
    harness.list.dispatchChange(false)
    await settle(received, 3)
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['full', 'reduced', 'full'])
  })

  it('does not call matchMedia until the Stream starts', () => {
    const harness = stubMatchMedia(REDUCED_MOTION_QUERY)

    fromMediaQuery({
      query: REDUCED_MOTION_QUERY,
      mapMatches: describeMatches,
    })

    expect(harness.matchMedia).not.toHaveBeenCalled()
  })

  it('removes the change listener when the Stream stops', async () => {
    const harness = stubMatchMedia(REDUCED_MOTION_QUERY)
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromMediaQuery({
          query: REDUCED_MOTION_QUERY,
          mapMatches: describeMatches,
        }),
        received,
      ),
    )

    await settle(received, 1)
    await Effect.runPromise(Fiber.interrupt(fiber))

    harness.list.dispatchChange(true)
    await tick()

    expect(harness.addEventListener).toHaveBeenCalledTimes(1)
    expect(harness.removeEventListener).toHaveBeenCalledTimes(1)

    const maybeHandler = Option.map(
      Array.head(harness.addEventListener.mock.calls),
      ([, handler]) => handler,
    )
    expect(Option.isSome(maybeHandler)).toBe(true)
    if (Option.isSome(maybeHandler)) {
      expect(harness.removeEventListener).toHaveBeenCalledWith(
        'change',
        maybeHandler.value,
      )
    }

    expect(received).toEqual(['full'])
  })

  it('reads the current value again when a gated entry restarts', async () => {
    const harness = stubMatchMedia(REDUCED_MOTION_QUERY)
    const received: Array<string> = []

    type Model = Readonly<{ isFollowingSystem: boolean }>

    const subscriptions = make<Model, string>()(entry => ({
      reducedMotion: entry(
        { isFollowingSystem: Schema.Boolean },
        {
          modelToDependencies: model => ({
            isFollowingSystem: model.isFollowingSystem,
          }),
          dependenciesToStream: ({ isFollowingSystem }) =>
            Stream.when(
              fromMediaQuery({
                query: REDUCED_MOTION_QUERY,
                mapMatches: describeMatches,
              }),
              Effect.sync(() => isFollowingSystem),
            ),
        },
      ),
    }))

    const runWhile = (isFollowingSystem: boolean) => {
      const dependencies = { isFollowingSystem }
      return Effect.runFork(
        drain(
          subscriptions.reducedMotion.dependenciesToStream(dependencies),
          received,
        ),
      )
    }

    const openFiber = runWhile(true)
    await settle(received, 1)
    await Effect.runPromise(Fiber.interrupt(openFiber))

    const closedFiber = runWhile(false)
    await tick()
    harness.list.setMatches(true)
    await Effect.runPromise(Fiber.interrupt(closedFiber))

    const reopenedFiber = runWhile(true)
    await settle(received, 2)
    await Effect.runPromise(Fiber.interrupt(reopenedFiber))

    expect(received).toEqual(['full', 'reduced'])
  })
})
