import { Deferred, Effect, Stream } from 'effect'
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

const mountAndInteract = (host: HTMLElement): Effect.Effect<Array<Message>> =>
  Effect.scoped(
    Effect.gen(function* () {
      const received: Array<Message> = []
      const mounted = yield* Deferred.make<void>()

      yield* MountMap({ hostId: 'test-map-host' })
        .f(host, Stream.empty)
        .pipe(
          Stream.runForEach(message =>
            Effect.sync(() => {
              received.push(message)
              if (message._tag === 'MovedMap') {
                Effect.runSync(Deferred.succeed(mounted, undefined))
              }
            }),
          ),
          Effect.forkScoped,
        )

      yield* Deferred.await(mounted)
      const marker = host.querySelector('[data-location-id]')
      if (marker === null) {
        throw new Error('Expected a mounted marker')
      }

      marker.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      maplibre.emitMoveEnd()
      yield* Effect.yieldNow

      expect(received.map(message => message._tag)).toEqual([
        'SucceededMountMap',
        'MovedMap',
        'ClickedMarker',
        'MovedMap',
      ])
      return received
    }),
  )

describe('MountMap', () => {
  beforeEach(() => {
    maplibre.container = undefined
    maplibre.clearEventHandlers()
    vi.clearAllMocks()
  })

  test('rebinds map events when the same host id remounts', async () => {
    const firstHost = document.createElement('div')
    const firstMessages = await Effect.runPromise(mountAndInteract(firstHost))
    expect(maplibre.removeMap).toHaveBeenCalledOnce()

    maplibre.emitMoveEnd()
    firstHost
      .querySelector('[data-location-id]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(firstMessages).toHaveLength(4)

    const secondHost = document.createElement('div')
    await Effect.runPromise(mountAndInteract(secondHost))

    expect(maplibre.makeMap).toHaveBeenCalledTimes(2)
    expect(maplibre.removeMap).toHaveBeenCalledTimes(2)
  })
})
