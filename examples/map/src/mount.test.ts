import { Deferred, Effect, PubSub, Stream } from 'effect'
import { Mount } from 'foldkit'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { MountMap } from './main'

const maplibre = vi.hoisted(() => {
  let container: HTMLElement | undefined

  return {
    get container(): HTMLElement | undefined {
      return container
    },
    set container(nextContainer: HTMLElement | undefined) {
      container = nextContainer
    },
    disableKeyboard: vi.fn(),
    enableKeyboard: vi.fn(),
    makeMap: vi.fn(),
    removeMap: vi.fn(),
  }
})

vi.mock('maplibre-gl', () => {
  class Map {
    readonly keyboard = {
      disable: maplibre.disableKeyboard,
      enable: maplibre.enableKeyboard,
    }

    constructor({ container }: { container: HTMLElement }) {
      maplibre.container = container
      maplibre.makeMap()
    }

    remove(): void {
      maplibre.removeMap()
    }
  }

  class Marker {
    readonly element: HTMLButtonElement

    constructor({ element }: { element: HTMLButtonElement }) {
      this.element = element
    }

    setLngLat(): this {
      return this
    }

    addTo(): this {
      maplibre.container?.appendChild(this.element)
      return this
    }
  }

  return { Map, Marker, setWorkerUrl: vi.fn() }
})

describe('MountMap', () => {
  beforeEach(() => {
    maplibre.container = undefined
    vi.clearAllMocks()
  })

  test('makes the surviving map read-only while its view is paused', async () => {
    const host = document.createElement('div')

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const observedInitialLive = yield* Deferred.make<void>()
          const observedPaused = yield* Deferred.make<void>()
          const observedResumed = yield* Deferred.make<void>()
          maplibre.enableKeyboard.mockImplementation(() => {
            if (maplibre.enableKeyboard.mock.calls.length === 1) {
              Effect.runSync(Deferred.succeed(observedInitialLive, undefined))
            } else if (maplibre.enableKeyboard.mock.calls.length === 2) {
              Effect.runSync(Deferred.succeed(observedResumed, undefined))
            }
          })
          maplibre.disableKeyboard.mockImplementation(() => {
            Effect.runSync(Deferred.succeed(observedPaused, undefined))
          })

          const viewStates = yield* PubSub.unbounded<Mount.ViewState>({
            replay: 1,
          })
          yield* PubSub.publish(viewStates, Mount.ViewState.make('Live'))
          yield* MountMap({ hostId: 'test-map-host' })
            .f(host, Stream.fromPubSub(viewStates))
            .pipe(Stream.runDrain, Effect.forkScoped)

          yield* Deferred.await(observedInitialLive)
          yield* Effect.yieldNow
          expect(maplibre.makeMap).toHaveBeenCalledOnce()
          const markers = host.querySelectorAll('button[data-location-id]')
          expect(markers.length).toBeGreaterThan(0)
          for (const marker of markers) {
            expect(marker).toHaveProperty('disabled', false)
          }

          yield* PubSub.publish(viewStates, Mount.ViewState.make('Paused'))
          yield* Deferred.await(observedPaused)
          yield* Effect.yieldNow
          expect(maplibre.makeMap).toHaveBeenCalledOnce()
          for (const marker of markers) {
            expect(marker).toHaveProperty('disabled', true)
          }

          yield* PubSub.publish(viewStates, Mount.ViewState.make('Live'))
          yield* Deferred.await(observedResumed)
          yield* Effect.yieldNow
          expect(maplibre.makeMap).toHaveBeenCalledOnce()
          for (const marker of markers) {
            expect(marker).toHaveProperty('disabled', false)
          }
        }),
      ),
    )

    expect(maplibre.disableKeyboard).toHaveBeenCalledOnce()
    expect(maplibre.enableKeyboard).toHaveBeenCalledTimes(2)
    expect(maplibre.removeMap).toHaveBeenCalledOnce()
  })
})
