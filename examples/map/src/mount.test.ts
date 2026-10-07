import { Deferred, Effect, PubSub, Stream } from 'effect'
import { Mount } from 'foldkit'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Message, MountMap } from './main'

const maplibre = vi.hoisted(() => {
  let container: HTMLElement | undefined
  let onMoveEnd: (() => void) | undefined

  return {
    get container(): HTMLElement | undefined {
      return container
    },
    set container(nextContainer: HTMLElement | undefined) {
      container = nextContainer
    },
    disableKeyboard: vi.fn(),
    enableKeyboard: vi.fn(),
    disablePointerInteractions: vi.fn(),
    enablePointerInteractions: vi.fn(),
    clearEventHandlers: (): void => {
      onMoveEnd = undefined
    },
    emitMoveEnd: (): void => {
      onMoveEnd?.()
    },
    setMoveEndListener: (listener: () => void): void => {
      onMoveEnd = listener
    },
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

    readonly boxZoom = {
      disable: maplibre.disablePointerInteractions,
      enable: maplibre.enablePointerInteractions,
    }

    readonly doubleClickZoom = {
      disable: maplibre.disablePointerInteractions,
      enable: maplibre.enablePointerInteractions,
    }

    readonly dragPan = {
      disable: maplibre.disablePointerInteractions,
      enable: maplibre.enablePointerInteractions,
    }

    readonly dragRotate = {
      disable: maplibre.disablePointerInteractions,
      enable: maplibre.enablePointerInteractions,
    }

    readonly scrollZoom = {
      disable: maplibre.disablePointerInteractions,
      enable: maplibre.enablePointerInteractions,
    }

    readonly touchPitch = {
      disable: maplibre.disablePointerInteractions,
      enable: maplibre.enablePointerInteractions,
    }

    readonly touchZoomRotate = {
      disable: maplibre.disablePointerInteractions,
      enable: maplibre.enablePointerInteractions,
    }

    constructor({ container }: { container: HTMLElement }) {
      maplibre.container = container
      maplibre.makeMap()
    }

    remove(): void {
      maplibre.removeMap()
    }

    on(eventName: string, listener: () => void): this {
      if (eventName === 'moveend') {
        maplibre.setMoveEndListener(listener)
      }
      return this
    }

    off(): this {
      maplibre.clearEventHandlers()
      return this
    }

    getContainer(): HTMLElement {
      return maplibre.container ?? document.createElement('div')
    }

    getBounds() {
      return {
        getWest: () => -180,
        getSouth: () => -85,
        getEast: () => 180,
        getNorth: () => 85,
      }
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
    maplibre.clearEventHandlers()
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
    expect(maplibre.disablePointerInteractions).toHaveBeenCalledTimes(7)
    expect(maplibre.enablePointerInteractions).toHaveBeenCalledTimes(14)
    expect(maplibre.removeMap).toHaveBeenCalledOnce()
  })

  test('suppresses initial and interaction Messages while the Mount is paused', async () => {
    const host = document.createElement('div')

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const observedMount = yield* Deferred.make<void>()
          const receivedMessages: Array<Message> = []
          const viewStates = yield* PubSub.unbounded<Mount.ViewState>({
            replay: 1,
          })
          yield* PubSub.publish(viewStates, Mount.ViewState.make('Paused'))
          yield* MountMap({ hostId: 'test-map-host' })
            .f(host, Stream.fromPubSub(viewStates))
            .pipe(
              Stream.runForEach(message =>
                Effect.sync(() => {
                  receivedMessages.push(message)
                  if (message._tag === 'SucceededMountMap') {
                    Effect.runSync(Deferred.succeed(observedMount, undefined))
                  }
                }),
              ),
              Effect.forkScoped,
            )

          yield* Deferred.await(observedMount)
          const marker = host.querySelector('[data-location-id]')
          marker?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          maplibre.emitMoveEnd()
          yield* Effect.yieldNow

          expect(receivedMessages.map(message => message._tag)).toEqual([
            'SucceededMountMap',
          ])
        }),
      ),
    )
  })
})
