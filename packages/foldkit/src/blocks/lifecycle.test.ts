import { Array, Deferred, Effect, Exit, Layer, Option, Schema } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { embed } from '../runtime/start.js'
import { message, model } from '../test/story.js'
import { Block, deliver, runtimeBlockOf } from './block.js'
import * as Engine from './engine.js'
import { makeElement } from './program.js'
import { story } from './testing.js'

afterEach(() => {
  document.body.innerHTML = ''
})

const mountContainer = (id: string): HTMLElement => {
  const container = document.createElement('div')
  container.id = id
  document.body.append(container)
  return container
}

const click = (id: string): void => {
  document.getElementById(id)?.click()
}

// IN-FLIGHT COMMANDS

const ReportMessage = defineMessageUnion({ CompletedLoad: {} })

const Load = Command.define('Load', {
  messages: [ReportMessage.CompletedLoad],
})

class Report extends Block<Report>()('Report', {
  Model: Schema.Struct({ loads: Schema.Number }),
  Message: ReportMessage,
  Command: [Load],
}) {}

const makeReportLive = (gate: Deferred.Deferred<void>) =>
  Report.make(
    Effect.fn(function* () {
      return {
        model: { loads: 0 },
        start: [Load()],
        update: {
          CompletedLoad: model => ({ model: { loads: model.loads + 1 } }),
        },
        commands: {
          Load: () =>
            Deferred.await(gate).pipe(
              Effect.as(Report.Message.CompletedLoad()),
            ),
        },
        view: (model, h) => h.p([h.Id('loads')], [`${model.loads}`]),
      }
    }),
  )

class Dashboard extends Block<Dashboard>()('Dashboard', {
  Model: Schema.Struct({ maybeReport: Schema.Option(Report) }),
  Message: defineMessageUnion({ ClickedOpen: {}, ClickedClose: {} }),
}) {}

const DashboardLive = Dashboard.make(
  Effect.fn(function* () {
    const report = yield* new Report('report')

    return {
      model: { maybeReport: Option.none() },
      update: {
        ClickedOpen: () => ({ model: { maybeReport: Option.some(report) } }),
        ClickedClose: () => ({ model: { maybeReport: Option.none() } }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.button([
              h.Id('open'),
              h.OnClick(Dashboard.Message.ClickedOpen()),
            ]),
            h.button([
              h.Id('close'),
              h.OnClick(Dashboard.Message.ClickedClose()),
            ]),
            ...Option.toArray(
              Option.map(model.maybeReport, instance => instance.view()),
            ),
          ],
        ),
    }
  }),
)

describe('Block instance lifecycle', () => {
  it('drops the result of a Command whose instance left the Model', async () => {
    const gate = Deferred.makeUnsafe<void>()
    const program = makeElement(Dashboard, {
      container: mountContainer('dashboard'),
      layer: DashboardLive.pipe(Layer.provide(makeReportLive(gate))),
      devTools: false,
    })
    const handle = embed(program)
    await vi.waitFor(() =>
      expect(document.getElementById('open')).not.toBe(null),
    )

    click('open')
    await vi.waitFor(() =>
      expect(document.getElementById('loads')).not.toBe(null),
    )
    click('close')
    await vi.waitFor(() => expect(document.getElementById('loads')).toBe(null))
    click('open')
    await vi.waitFor(() =>
      expect(document.getElementById('loads')).not.toBe(null),
    )

    Effect.runSync(Deferred.succeed(gate, undefined))

    await vi.waitFor(() =>
      expect(document.getElementById('loads')?.textContent).toBe('1'),
    )
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(document.getElementById('loads')?.textContent).toBe('1')

    handle.dispose()
  })
})

const runCommand = (
  command: Engine.AnyCommand,
): Promise<Exit.Exit<unknown, unknown>> =>
  // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context, effecttsgo/unsafe-effect-type-assertion, typescript/consistent-type-assertions
  Effect.runPromiseExit(command.effect as Effect.Effect<unknown, unknown>)

describe('Block Command results', () => {
  it('drops a queued result and a late start once the instance left the Model', () =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const gate = yield* Deferred.make<void>()
          yield* Deferred.succeed(gate, undefined)
          const context = yield* Layer.build(
            DashboardLive.pipe(Layer.provide(makeReportLive(gate))),
          )
          const graph = Engine.makeGraph({ isSimulation: true })
          const root = Engine.constructSync(
            graph,
            runtimeBlockOf(Dashboard),
            [],
            'Dashboard',
            undefined,
            context,
          )
          Engine.takeStarted(graph)

          const opened = Engine.update(
            graph,
            root,
            Dashboard.Message.ClickedOpen(),
          )
          const load = Option.getOrThrow(Array.head(opened.commands))
          const queuedResult = yield* Effect.promise(() => runCommand(load))
          expect(Exit.isSuccess(queuedResult)).toBe(true)

          const closed = Engine.update(
            graph,
            opened.instance,
            Dashboard.Message.ClickedClose(),
          )
          const lateStart = yield* Effect.promise(() => runCommand(load))
          const reopened = Engine.update(
            graph,
            closed.instance,
            Dashboard.Message.ClickedOpen(),
          )
          const delivered = Engine.update(
            graph,
            reopened.instance,
            Exit.isSuccess(queuedResult) ? queuedResult.value : undefined,
          )

          expect(Exit.hasInterrupts(lateStart)).toBe(true)
          expect(Engine.resolve(delivered.instance)).toEqual({
            maybeReport: Option.some({ loads: 0 }),
          })
        }),
      ),
    ))
})

// OUTMESSAGE HANDLERS

class Toggle extends Block<Toggle>()('Toggle', {
  Model: Schema.Struct({ isOpen: Schema.Boolean }),
  Message: defineMessageUnion({ ClickedToggle: {} }),
  OutMessage: defineMessageUnion({ Opened: {}, Closed: {} }),
}) {}

const ToggleLive = Toggle.make(
  Effect.fn(function* () {
    return {
      model: { isOpen: false },
      update: {
        ClickedToggle: model => ({
          model: { isOpen: !model.isOpen },
          outMessage: model.isOpen
            ? Toggle.OutMessage.Closed()
            : Toggle.OutMessage.Opened(),
        }),
      },
      view: (_, h) => h.div([]),
    }
  }),
)

class Panel extends Block<Panel>()('Panel', {
  Model: Schema.Struct({
    toggle: Toggle,
    opens: Schema.Number,
    closes: Schema.Number,
  }),
}) {}

const PanelLive = Panel.make(
  Effect.fn(function* () {
    const toggle = yield* new Toggle('toggle')

    return {
      model: { toggle, opens: 0, closes: 0 },
      update: {
        ...toggle.on({
          Opened: model => ({ model: { ...model, opens: model.opens + 1 } }),
        }),
        ...toggle.on({
          Closed: model => ({ model: { ...model, closes: model.closes + 1 } }),
        }),
      },
      view: model => model.toggle.view(),
    }
  }),
)

const ExhaustivePanelLive = Panel.make(
  Effect.fn(function* () {
    const toggle = yield* new Toggle('toggle')

    return {
      model: { toggle, opens: 0, closes: 0 },
      update: {
        ...toggle.onAll({
          Opened: model => ({ model: { ...model, opens: model.opens + 1 } }),
          Closed: model => ({ model: { ...model, closes: model.closes + 1 } }),
        }),
      },
      view: model => model.toggle.view(),
    }
  }),
)

describe('Block OutMessage handlers', () => {
  it('handles every OutMessage with `onAll`', () =>
    Effect.runPromise(
      story(
        ExhaustivePanelLive.pipe(Layer.provide(ToggleLive)),
        message(deliver(Toggle, 'toggle', Toggle.Message.ClickedToggle())),
        message(deliver(Toggle, 'toggle', Toggle.Message.ClickedToggle())),
        model(panel => {
          expect(panel.opens).toBe(1)
          expect(panel.closes).toBe(1)
        }),
      ),
    ))

  it('handles an OutMessage from any `on` entry for the child', () =>
    Effect.runPromise(
      story(
        PanelLive.pipe(Layer.provide(ToggleLive)),
        message(deliver(Toggle, 'toggle', Toggle.Message.ClickedToggle())),
        message(deliver(Toggle, 'toggle', Toggle.Message.ClickedToggle())),
        model(panel => {
          expect(panel.opens).toBe(1)
          expect(panel.closes).toBe(1)
        }),
      ),
    ))
})

// STORY SCOPES

const released: Array<string> = []

class Resource extends Block<Resource>()('Resource', {
  Model: Schema.Struct({}),
}) {}

const ResourceLive = Resource.make(
  Effect.fn(function* (id) {
    yield* Effect.addFinalizer(() => Effect.sync(() => released.push(id)))
    return { model: {}, view: (_, h) => h.div([]) }
  }),
)

describe('Block stories', () => {
  it('closes instance scopes when the story ends', async () => {
    released.length = 0
    await Effect.runPromise(story(ResourceLive))
    expect(released).toEqual(['Resource'])
  })
})
