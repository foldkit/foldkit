import { Context, Effect, Fiber, Layer, Option, Schema, Stream } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { Block } from './block.js'
import { make, makeElement } from './program.js'

class Ticker extends Block<Ticker>()('Ticker', {
  Message: defineMessageUnion({ Ticked: {} }),
  OutMessage: defineMessageUnion({ Ticked: {} }),
}) {}

const released: Array<string> = []

const TickerLive = Ticker.make(
  Effect.fn(function* (id) {
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        released.push(id)
      }),
    )
    return {
      stream: Stream.tick('5 millis').pipe(Stream.as(Ticker.Message.Ticked())),
      update: {
        Ticked: model => ({ model, outMessage: Ticker.OutMessage.Ticked() }),
      },
    }
  }),
)

class Saved extends Context.Service<
  Saved,
  { readonly counts: Array<number> }
>()('Saved') {}

const AutoMessage = defineMessageUnion({
  ClickedToggle: {},
  ClickedSave: {},
  CompletedSave: {},
})

const Save = Command.define('Save', {
  args: { count: Schema.Number },
  messages: [AutoMessage.CompletedSave],
})

class AutoCounter extends Block<AutoCounter>()('AutoCounter', {
  Model: Schema.Struct({
    count: Schema.Number,
    maybeTicker: Schema.Option(Ticker),
  }),
  Message: AutoMessage,
  Command: [Save],
}) {}

const AutoCounterLive = AutoCounter.make(
  Effect.fn(function* () {
    const saved = yield* Saved
    const ticker = yield* new Ticker('ticker')

    return {
      model: { count: 0, maybeTicker: Option.some(ticker) },
      update: {
        ClickedToggle: model => ({
          model: {
            ...model,
            maybeTicker: Option.isSome(model.maybeTicker)
              ? Option.none()
              : Option.some(ticker),
          },
        }),
        ClickedSave: model => ({
          model,
          commands: [Save({ count: model.count })],
        }),
        CompletedSave: model => ({ model }),
        ...ticker.on({
          Ticked: model => ({ model: { ...model, count: model.count + 1 } }),
        }),
      },
      commands: {
        Save: ({ count }) =>
          Effect.sync(() => {
            saved.counts.push(count)
            return AutoCounter.Message.CompletedSave()
          }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.span([h.Id('count')], [`${model.count}`]),
            h.button(
              [h.Id('toggle'), h.OnClick(AutoCounter.Message.ClickedToggle())],
              ['Toggle'],
            ),
            h.button(
              [h.Id('save'), h.OnClick(AutoCounter.Message.ClickedSave())],
              ['Save'],
            ),
          ],
        ),
    }
  }),
)

const waitFor = (predicate: () => boolean) =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (predicate()) {
        return
      }
      yield* Effect.sleep('5 millis')
    }
    throw new Error('Timed out waiting for condition')
  })

describe('Block program', () => {
  it.live(
    'runs streams, executes Commands, and releases removed instances',
    () =>
      Effect.gen(function* () {
        const container = document.createElement('div')
        container.id = 'app'
        document.body.append(container)
        const counts: Array<number> = []

        const program = make(AutoCounter, {
          container,
          layer: AutoCounterLive.pipe(
            Layer.provide(TickerLive),
            Layer.provide(Layer.succeed(Saved, { counts })),
          ),
        })

        const fiber = yield* Effect.forkChild(program.start())
        const countText = () =>
          globalThis.Number(
            document.getElementById('count')?.textContent ?? '0',
          )

        yield* waitFor(() => countText() >= 2)

        document.getElementById('toggle')?.click()
        yield* waitFor(() => released.includes('ticker'))
        const stoppedAt = countText()
        yield* Effect.sleep('30 millis')
        expect(countText()).toBe(stoppedAt)

        document.getElementById('save')?.click()
        yield* waitFor(() => counts.length === 1)
        expect(counts).toEqual([stoppedAt])

        yield* Fiber.interrupt(fiber)
        container.remove()
      }),
  )
})

const ClockMessage = defineMessageUnion({
  ClickedPause: {},
  Ticked: {},
  CompletedLoad: { start: Schema.Number },
})

const Load = Command.define('Load', { messages: [ClockMessage.CompletedLoad] })

class Clock extends Block<Clock>()('Clock', {
  Model: Schema.Struct({ ticks: Schema.Number, isPaused: Schema.Boolean }),
  Message: ClockMessage,
  Command: [Load],
}) {}

const ClockLive = Clock.make(
  Effect.fn(function* () {
    return {
      model: { ticks: 0, isPaused: false },
      start: [Load()],
      update: {
        ClickedPause: model => ({ model: { ...model, isPaused: true } }),
        Ticked: model => ({ model: { ...model, ticks: model.ticks + 1 } }),
        CompletedLoad: (model, { start }) => ({
          model: { ...model, ticks: model.ticks + start },
        }),
      },
      commands: {
        Load: () => Effect.succeed(Clock.Message.CompletedLoad({ start: 100 })),
      },
      subscriptions: {
        ticks: {
          dependencies: model => model.isPaused,
          stream: (isPaused: boolean) =>
            isPaused
              ? Stream.empty
              : Stream.tick('5 millis').pipe(Stream.as(Clock.Message.Ticked())),
        },
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.span([h.Id('ticks')], [`${model.ticks}`]),
            h.button(
              [h.Id('pause'), h.OnClick(Clock.Message.ClickedPause())],
              ['Pause'],
            ),
          ],
        ),
    }
  }),
)

describe('Block program startup', () => {
  it.live(
    'runs start Commands and restarts Subscriptions when their dependencies change',
    () =>
      Effect.gen(function* () {
        const container = document.createElement('div')
        container.id = 'clock'
        document.body.append(container)

        const fiber = yield* Effect.forkChild(
          make(Clock, { container, layer: ClockLive }).start(),
        )
        const ticks = () =>
          globalThis.Number(
            document.getElementById('ticks')?.textContent ?? '0',
          )

        yield* waitFor(() => ticks() >= 102)
        document.getElementById('pause')?.click()
        yield* Effect.sleep('20 millis')
        const pausedAt = ticks()
        yield* Effect.sleep('30 millis')
        expect(ticks()).toBe(pausedAt)

        yield* Fiber.interrupt(fiber)
        container.remove()
      }),
  )
})

class Probe extends Block<Probe>()('Probe', {
  Model: Schema.Struct({ label: Schema.String }),
}) {}

const ProbeLive = Probe.make(
  Effect.fn(function* () {
    return {
      model: { label: 'probe' },
      view: (model, h) => h.div([h.Id('probe')], [model.label]),
    }
  }),
)

describe('Block element program', () => {
  it.live('renders the root view as Html into its container', () =>
    Effect.gen(function* () {
      const container = document.createElement('div')
      container.id = 'probe-root'
      document.body.append(container)

      const fiber = yield* Effect.forkChild(
        makeElement(Probe, { container, layer: ProbeLive }).start(),
      )

      yield* waitFor(
        () => document.getElementById('probe')?.textContent === 'probe',
      )

      yield* Fiber.interrupt(fiber)
      document.getElementById('probe')?.remove()
      container.remove()
    }),
  )
})
