import { Effect, Fiber, Option, Schema, Stream } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  type FromEventConfig,
  type TypedEventTarget,
  fromEvent,
  fromEventFilterMap,
  fromEventFilterMapPreventDefault,
} from './fromEvent.js'
import { make } from './subscription.js'

type PingEvents = Readonly<{ ping: CustomEvent<string> }>

const makePingTarget = (): TypedEventTarget<PingEvents> => new EventTarget()

const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

const drain = <Message>(
  stream: Stream.Stream<Message>,
  sink: Array<Message>,
): Effect.Effect<void> =>
  Stream.runForEach(stream, message =>
    Effect.sync(() => {
      sink.push(message)
    }),
  )

describe('fromEvent', () => {
  it('emits a Message for every dispatched event', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent({
          target,
          type: 'ping',
          mapEvent: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a', 'b'])
  })

  it('removes the listener when the scope closes', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent({
          target,
          type: 'ping',
          mapEvent: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()

    expect(received).toEqual(['a'])
  })

  it('resolves a thunk target inside the acquire Effect', async () => {
    const target = makePingTarget()
    let isResolved = false
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent({
          target: () => {
            isResolved = true
            return target
          },
          type: 'ping',
          mapEvent: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    expect(isResolved).toBe(true)
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a'])
  })

  it('forwards listener options', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent({
          target,
          type: 'ping',
          mapEvent: event => event.detail,
          options: { once: true },
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a'])
  })
})

describe('fromEventFilterMap', () => {
  it('emits only for events the mapper keeps and skips the rest', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap({
          target,
          type: 'ping',
          filterMapEvent: event =>
            event.detail === 'skip' ? Option.none() : Option.some(event.detail),
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'skip' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a', 'b'])
  })

  it('removes the listener when the scope closes', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap({
          target,
          type: 'ping',
          filterMapEvent: event => Option.some(event.detail),
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()

    expect(received).toEqual(['a'])
  })

  it('runs preventDefault synchronously inside the mapper', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap({
          target,
          type: 'ping',
          filterMapEvent: event => {
            event.preventDefault()
            return Option.some(event.detail)
          },
        }),
        received,
      ),
    )

    await tick()
    const event = new CustomEvent('ping', { detail: 'a', cancelable: true })
    target.dispatchEvent(event)
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(event.defaultPrevented).toBe(true)
    expect(received).toEqual(['a'])
  })
})

describe('fromEventFilterMapPreventDefault', () => {
  const makeRecordingTarget = (): Readonly<{
    target: TypedEventTarget<PingEvents>
    recordedOptions: Array<AddEventListenerOptions | boolean | undefined>
  }> => {
    const events = new EventTarget()
    const recordedOptions: Array<
      AddEventListenerOptions | boolean | undefined
    > = []
    const target: TypedEventTarget<PingEvents> = {
      addEventListener: (type, callback, options) => {
        recordedOptions.push(options)
        events.addEventListener(type, callback, options)
      },
      removeEventListener: (type, callback, options) => {
        events.removeEventListener(type, callback, options)
      },
      dispatchEvent: event => events.dispatchEvent(event),
    }
    return { target, recordedOptions }
  }

  it('calls preventDefault inside the dispatch and emits for handled events', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMapPreventDefault({
          target,
          type: 'ping',
          filterMapEvent: event => Option.some(event.detail),
        }),
        received,
      ),
    )

    await tick()
    const event = new CustomEvent('ping', { detail: 'a', cancelable: true })
    target.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(received).toEqual([])

    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a'])
  })

  it('leaves default behavior intact and emits nothing for unhandled events', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMapPreventDefault({
          target,
          type: 'ping',
          filterMapEvent: () => Option.none(),
        }),
        received,
      ),
    )

    await tick()
    const event = new CustomEvent('ping', { detail: 'a', cancelable: true })
    target.dispatchEvent(event)
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(event.defaultPrevented).toBe(false)
    expect(received).toEqual([])
  })

  it('registers the listener with passive false when the config omits options', async () => {
    const { target, recordedOptions } = makeRecordingTarget()

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMapPreventDefault({
          target,
          type: 'ping',
          filterMapEvent: event => Option.some(event.detail),
        }),
        [],
      ),
    )

    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(recordedOptions).toEqual([{ passive: false }])
  })

  it('merges passive false into the options the config provides', async () => {
    const { target, recordedOptions } = makeRecordingTarget()

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMapPreventDefault({
          target,
          type: 'ping',
          filterMapEvent: event => Option.some(event.detail),
          options: { once: true },
        }),
        [],
      ),
    )

    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(recordedOptions).toEqual([{ once: true, passive: false }])
  })

  it('throws when the config passes passive true explicitly', () => {
    expect(() =>
      fromEventFilterMapPreventDefault({
        target: new EventTarget(),
        type: 'wheel',
        filterMapEvent: () => Option.none(),
        // @ts-expect-error a cancelling listener cannot be passive
        options: { passive: true },
      }),
    ).toThrow(/passive: true/)
  })
})

type InferenceMessage = Readonly<{ _tag: 'Pressed'; key: string }>

const pressed = (key: string): InferenceMessage => ({ _tag: 'Pressed', key })

declare const button: HTMLButtonElement
declare const svg: SVGSVGElement
declare const body: HTMLBodyElement
declare const chart: HTMLDivElement &
  TypedEventTarget<{ 'chart:zoomed': CustomEvent<number> }>
declare const overriddenClickChart: HTMLDivElement &
  TypedEventTarget<{ click: CustomEvent<number> }>
declare const windowOrButton: Window | HTMLButtonElement

describe('event type inference', () => {
  it('resolves the event from the target and the event name', () => {
    const stream = fromEvent({
      target: document,
      type: 'keydown',
      mapEvent: event => pressed(event.key),
    })

    expect(Stream.isStream(stream)).toBe(true)

    // NOTE: `pnpm typecheck` is the assertion for the block below, not vitest.
    // The suppression directives in it are the negative cases.
    if (false) {
      const rawEventStream = fromEvent({
        target: document,
        type: 'keydown',
        mapEvent: event => event,
      })

      expectTypeOf(rawEventStream).toEqualTypeOf<Stream.Stream<KeyboardEvent>>()

      expectTypeOf(
        fromEventFilterMap({
          target: document,
          type: 'keydown',
          filterMapEvent: event => Option.some(event),
        }),
      ).toEqualTypeOf<Stream.Stream<KeyboardEvent>>()

      expectTypeOf(
        fromEventFilterMapPreventDefault({
          target: document,
          type: 'keydown',
          filterMapEvent: event => Option.some(event),
        }),
      ).toEqualTypeOf<Stream.Stream<KeyboardEvent>>()

      make<{ isActive: boolean }, InferenceMessage>()(entry => ({
        keyboard: entry(
          { isActive: Schema.Boolean },
          {
            modelToDependencies: model => ({ isActive: model.isActive }),
            // @ts-expect-error a raw KeyboardEvent is not an application Message
            dependenciesToStream: () => rawEventStream,
          },
        ),
      }))

      expectTypeOf(
        fromEvent({
          target: document,
          type: 'keydown',
          mapEvent: event => pressed(event.key),
        }),
      ).toEqualTypeOf<Stream.Stream<InferenceMessage>>()

      fromEvent({
        target: window,
        type: 'wheel',
        mapEvent: event => pressed(String(event.deltaY)),
      })

      fromEvent({
        target: () => document,
        type: 'touchmove',
        mapEvent: event => pressed(String(event.touches.length)),
      })

      fromEvent({
        target: window.matchMedia('(prefers-color-scheme: dark)'),
        type: 'change',
        mapEvent: event => pressed(String(event.matches)),
      })

      fromEvent({
        target: button,
        type: 'click',
        mapEvent: event => pressed(String(event.clientX)),
      })

      fromEvent({
        target: svg,
        type: 'pointerdown',
        mapEvent: event => pressed(String(event.pointerId)),
      })

      fromEvent({
        target: new XMLHttpRequest(),
        type: 'progress',
        mapEvent: event => pressed(String(event.loaded)),
      })

      fromEvent({
        target: new Worker(''),
        type: 'message',
        mapEvent: event => pressed(String(event.data)),
      })

      fromEvent({
        target: indexedDB.open('foldkit'),
        type: 'upgradeneeded',
        mapEvent: event => pressed(String(event.oldVersion)),
      })

      fromEvent({
        target: document,
        type: 'DOMContentLoaded',
        mapEvent: event => pressed(event.type),
      })

      fromEvent({
        target: body,
        type: 'hashchange',
        mapEvent: event => pressed(event.newURL),
      })

      fromEvent({
        target: chart,
        type: 'chart:zoomed',
        mapEvent: event => pressed(String(event.detail)),
      })

      fromEvent({
        target: chart,
        type: 'click',
        mapEvent: event => pressed(String(event.clientX)),
      })

      fromEvent({
        target: overriddenClickChart,
        type: 'click',
        mapEvent: event => pressed(String(event.detail)),
      })

      fromEvent({
        target: windowOrButton,
        type: 'click',
        mapEvent: event => pressed(String(event.clientX)),
      })

      fromEvent({
        target: windowOrButton,
        // @ts-expect-error 'hashchange' is not dispatched by every member
        type: 'hashchange',
        mapEvent: () => pressed(''),
      })

      fromEvent({
        target: new EventTarget(),
        type: 'anything-at-all',
        mapEvent: event => pressed(event.type),
      })

      expectTypeOf(
        fromEventFilterMap({
          target: makePingTarget(),
          type: 'ping',
          filterMapEvent: event => Option.some(pressed(event.detail)),
        }),
      ).toEqualTypeOf<Stream.Stream<InferenceMessage>>()

      expectTypeOf(
        fromEventFilterMapPreventDefault({
          target: makePingTarget(),
          type: 'ping',
          filterMapEvent: event => Option.some(pressed(event.detail)),
        }),
      ).toEqualTypeOf<Stream.Stream<InferenceMessage>>()

      const neverStream = fromEventFilterMap({
        target: window,
        type: 'keydown',
        filterMapEvent: () => Option.none(),
      })

      expectTypeOf(neverStream).toEqualTypeOf<Stream.Stream<never>>()

      expectTypeOf(
        Stream.merge(
          neverStream,
          fromEvent({
            target: document,
            type: 'keydown',
            mapEvent: event => pressed(event.key),
          }),
        ),
      ).toEqualTypeOf<Stream.Stream<InferenceMessage>>()

      fromEvent({
        target: window,
        type: 'keydown',
        // @ts-expect-error 'keydown' resolves to a KeyboardEvent
        mapEvent: (event: MouseEvent) => pressed(String(event.clientX)),
      })

      fromEvent({
        target: window,
        type: 'keydown',
        mapEvent: (event: Event) => pressed(event.type),
      })

      fromEvent({
        target: document,
        // @ts-expect-error 'keydwn' is not an event Document dispatches
        type: 'keydwn',
        mapEvent: () => pressed(''),
      })

      fromEvent({
        target: button,
        // @ts-expect-error 'hashchange' is a Window event, not an HTMLElement one
        type: 'hashchange',
        mapEvent: () => pressed(''),
      })

      fromEvent({
        target: window,
        type: 'wheel',
        // @ts-expect-error a WheelEvent has no `key`
        mapEvent: event => pressed(event.key),
      })

      fromEventFilterMap({
        target: makePingTarget(),
        // @ts-expect-error the target declares only 'ping'
        type: 'pong',
        filterMapEvent: () => Option.none(),
      })

      fromEventFilterMap({
        target: makePingTarget(),
        type: 'ping',
        // @ts-expect-error the declared detail is a string
        filterMapEvent: event => Option.some(pressed(event.detail.key)),
      })

      // @ts-expect-error config aliases constrain event names too
      expectTypeOf<FromEventConfig<Document, 'keydwn', InferenceMessage>>()

      // @ts-expect-error every declared event-map value must be an Event
      expectTypeOf<TypedEventTarget<{ ping: string }>>()
    }
  })
})
