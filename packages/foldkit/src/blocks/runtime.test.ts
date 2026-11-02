import { Array, Duration, Effect, Layer, Option, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Port from '../port/index.js'
import * as ModelPreservationBridge from '../runtime/modelPreservationBridge.js'
import * as PreserveScheduler from '../runtime/preserveScheduler.js'
import { embed } from '../runtime/start.js'
import { Block } from './block.js'
import * as Engine from './engine.js'
import { makeElement } from './program.js'

const originalMakePreserveScheduler = PreserveScheduler.makePreserveScheduler
const preserveCallbacks: Array<
  PreserveScheduler.PreserveSchedulerCallbacks<unknown>
> = []

beforeEach(() => {
  preserveCallbacks.length = 0
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
  vi.spyOn(PreserveScheduler, 'makePreserveScheduler').mockImplementation(
    callbacks => {
      preserveCallbacks.push(callbacks)
      return originalMakePreserveScheduler(callbacks, Duration.hours(1))
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const mountContainer = (id: string): HTMLElement => {
  const container = document.createElement('div')
  container.id = id
  document.body.append(container)
  return container
}

const textOf = (id: string): string | null | undefined =>
  document.getElementById(id)?.textContent

const click = (id: string): void => {
  document.getElementById(id)?.click()
}

// EMBED

const ports = {
  inbound: { stepChanged: Port.inbound(Schema.NumberFromString) },
  outbound: { countChanged: Port.outbound(Schema.Number) },
}

const WidgetMessage = defineMessageUnion({
  ReceivedStep: { step: Schema.Number },
  CompletedReportCount: {},
})

const ReportCount = Command.define('ReportCount', {
  args: { count: Schema.Number },
  messages: [WidgetMessage.CompletedReportCount],
})

class Widget extends Block<Widget>()('Widget', {
  Model: Schema.Struct({ count: Schema.Number }),
  Message: WidgetMessage,
  Command: [ReportCount],
}) {}

const widgetEvents: Array<string> = []

const WidgetLive = Widget.toLayer(() => ({
  init: () => ({ count: 0 }),
  subscriptions: {
    steps: {
      dependencies: () => 'steps',
      stream: () =>
        Stream.unwrap(
          Effect.acquireRelease(
            Effect.sync(() => {
              widgetEvents.push('acquired')
            }),
            () =>
              Effect.sync(() => {
                widgetEvents.push('released')
              }),
          ).pipe(
            Effect.as(
              Port.stream(ports.inbound.stepChanged).pipe(
                Stream.map(step => Widget.Message.ReceivedStep({ step })),
              ),
            ),
          ),
        ),
    },
  },
  update: {
    ReceivedStep: (model, { step }) => {
      const count = model.count + step
      return { model: { count }, commands: [ReportCount({ count })] }
    },
    CompletedReportCount: model => ({ model }),
  },
  commands: {
    ReportCount: ({ count }) =>
      Port.emit(ports.outbound.countChanged, count).pipe(
        Effect.as(Widget.Message.CompletedReportCount()),
      ),
  },
  view: (model, h) => h.p([h.Id('widget-count')], [`${model.count}`]),
}))

describe('Runtime.embed with a Block program', () => {
  it('connects Ports, releases what Subscriptions hold on dispose, and embeds again', async () => {
    widgetEvents.length = 0
    const container = mountContainer('widget')
    const program = makeElement(Widget, {
      container,
      layer: WidgetLive,
      ports,
    })

    const handle = embed(program)
    const reported: Array<number> = []
    handle.ports.countChanged.subscribe(count => {
      reported.push(count)
    })
    handle.ports.stepChanged.send('5')

    await vi.waitFor(() => expect(textOf('widget-count')).toBe('5'))
    await vi.waitFor(() => expect(reported).toEqual([5]))

    handle.dispose()
    await vi.waitFor(() =>
      expect(widgetEvents).toEqual(['acquired', 'released']),
    )

    const second = embed(program)
    second.ports.stepChanged.send('2')
    await vi.waitFor(() => expect(textOf('widget-count')).toBe('2'))

    second.dispose()
    await vi.waitFor(() =>
      expect(widgetEvents).toEqual([
        'acquired',
        'released',
        'acquired',
        'released',
      ]),
    )
  })
})

// MODEL PRESERVATION

const CounterMessage = defineMessageUnion({ ClickedIncrement: {} })

class Counter extends Block<Counter>()('Counter', {
  Model: Schema.Struct({ counterId: Schema.String, count: Schema.Number }),
  Message: CounterMessage,
}) {}

const CounterLive = Counter.toLayer(() => ({
  init: (_, { id }) => ({ counterId: id, count: 0 }),
  update: {
    ClickedIncrement: model => ({
      model: { ...model, count: model.count + 1 },
    }),
  },
  view: (model, h) =>
    h.button(
      [
        h.Id(`counter-${model.counterId}`),
        h.OnClick(Counter.Message.ClickedIncrement()),
      ],
      [`${model.count}`],
    ),
}))

const BoardMessage = defineMessageUnion({
  ClickedAddRow: {},
  ClickedShowBonus: {},
  CompletedLoad: {},
})

const Load = Command.define('Load', { messages: [BoardMessage.CompletedLoad] })

class Board extends Block<Board>()('Board', {
  Model: Schema.Struct({
    openedAt: Schema.Date,
    loads: Schema.Number,
    home: Counter,
    rows: Schema.Array(Counter),
    maybeBonus: Schema.Option(Counter),
  }),
  Message: BoardMessage,
  Command: [Load],
}) {}

const loadRuns: Array<number> = []

const BoardLive = Board.toLayer(() => ({
  init: () => ({
    openedAt: new Date('2026-10-29T00:00:00.000Z'),
    loads: 0,
    home: new Counter('home'),
    rows: [],
    maybeBonus: Option.none(),
  }),
  start: () => [Load()],
  update: {
    ClickedAddRow: model => ({
      model: {
        ...model,
        rows: [...model.rows, new Counter(`row-${model.rows.length}`)],
      },
    }),
    ClickedShowBonus: model => ({
      model: { ...model, maybeBonus: Option.some(new Counter('bonus')) },
    }),
    CompletedLoad: model => ({
      model: { ...model, loads: model.loads + 1 },
    }),
  },
  commands: {
    Load: () =>
      Effect.sync(() => {
        loadRuns.push(loadRuns.length)
        return Board.Message.CompletedLoad()
      }),
  },
  view: (model, h) =>
    h.div(
      [],
      [
        h.p([h.Id('board-opened')], [model.openedAt.toISOString()]),
        h.p([h.Id('board-loads')], [`${model.loads}`]),
        h.button(
          [h.Id('add-row'), h.OnClick(Board.Message.ClickedAddRow())],
          ['Add row'],
        ),
        h.button(
          [h.Id('show-bonus'), h.OnClick(Board.Message.ClickedShowBonus())],
          ['Show bonus'],
        ),
        model.home.view(),
        ...model.rows.map(counter =>
          h.keyed('div')(counter.id, [], [counter.view()]),
        ),
        ...Option.toArray(model.maybeBonus).map(counter => counter.view()),
      ],
    ),
}))

const BoardLayer = BoardLive.pipe(Layer.provide(CounterLive))

const preserveBoard = async (): Promise<unknown> => {
  const send = vi
    .spyOn(ModelPreservationBridge, 'preserveModel')
    .mockImplementation(() => {})
  const renderRoot = vi.spyOn(Engine, 'renderRoot')
  const container = mountContainer('board')
  const handle = embed(makeElement(Board, { container, layer: BoardLayer }))

  await vi.waitFor(() => expect(textOf('board-loads')).toBe('1'))
  click('counter-home')
  click('counter-home')
  click('add-row')
  click('add-row')
  await vi.waitFor(() => expect(textOf('counter-row-1')).toBe('0'))
  click('counter-row-1')
  click('show-bonus')
  await vi.waitFor(() => expect(textOf('counter-bonus')).toBe('0'))
  click('counter-bonus')
  click('counter-bonus')
  click('counter-bonus')
  await vi.waitFor(() => expect(textOf('counter-bonus')).toBe('3'))

  const [, root] = Option.getOrThrow(Array.last(renderRoot.mock.calls))
  const preservation = Option.getOrThrow(Array.head(preserveCallbacks))
  Effect.runSync(preservation.onFlush(root))
  const [, encoded] = Option.getOrThrow(Array.last(send.mock.calls))

  handle.dispose()
  await vi.waitFor(() =>
    expect(document.getElementById('board-loads')).toBeNull(),
  )
  document.body.innerHTML = ''
  preserveCallbacks.length = 0
  return JSON.parse(JSON.stringify(encoded))
}

describe('Block program Model preservation', () => {
  it('restores child instances, collections, and optional children without rerunning start Commands', async () => {
    loadRuns.length = 0
    const wire = await preserveBoard()
    expect(loadRuns).toHaveLength(1)

    vi.mocked(ModelPreservationBridge.resolvePreservedModel).mockReturnValue(
      Effect.succeed(wire),
    )
    const container = mountContainer('board')
    const handle = embed(makeElement(Board, { container, layer: BoardLayer }))

    try {
      await vi.waitFor(() => expect(textOf('counter-bonus')).toBe('3'))
      expect(textOf('counter-home')).toBe('2')
      expect(textOf('counter-row-0')).toBe('0')
      expect(textOf('counter-row-1')).toBe('1')
      expect(textOf('board-loads')).toBe('1')
      expect(textOf('board-opened')).toBe('2026-10-29T00:00:00.000Z')
      expect(loadRuns).toHaveLength(1)

      click('counter-row-1')
      click('add-row')
      await vi.waitFor(() => expect(textOf('counter-row-1')).toBe('2'))
      await vi.waitFor(() => expect(textOf('counter-row-2')).toBe('0'))
    } finally {
      handle.dispose()
    }
  })

  it('initializes fresh when a preserved child Model no longer decodes', async () => {
    loadRuns.length = 0
    const wire = await preserveBoard()
    const encoded = JSON.stringify(wire)
    const stale = JSON.parse(
      encoded.replaceAll(
        '"counterId":"row-1","count":1',
        '"counterId":"row-1","count":"one"',
      ),
    )
    expect(JSON.stringify(stale)).not.toBe(encoded)

    vi.mocked(ModelPreservationBridge.resolvePreservedModel).mockReturnValue(
      Effect.succeed(stale),
    )
    const container = mountContainer('board')
    const handle = embed(makeElement(Board, { container, layer: BoardLayer }))

    try {
      await vi.waitFor(() => expect(loadRuns).toHaveLength(2))
      await vi.waitFor(() => expect(textOf('board-loads')).toBe('1'))
      expect(textOf('counter-home')).toBe('0')
      expect(document.getElementById('counter-row-0')).toBeNull()
    } finally {
      handle.dispose()
    }
  })
})
