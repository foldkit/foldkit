import { Effect, Exit, Match as M, Queue, Schema as S, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { type Html, html } from '../html/index.js'
import { m } from '../message/index.js'
import * as Mount from '../mount/index.js'
import * as Port from '../port/index.js'
import { evo } from '../struct/index.js'
import { embed, makeApplication, makeElement } from './runtime.js'
import * as Subscription from './subscription.js'

const ChangedStep = m('ChangedStep', { step: S.Number })
const ClickedIncrement = m('ClickedIncrement')
const CompletedReportCount = m('CompletedReportCount')
const CompletedTrackHost = m('CompletedTrackHost')
const Ticked = m('Ticked')
const Message = S.Union([
  ChangedStep,
  ClickedIncrement,
  CompletedReportCount,
  CompletedTrackHost,
  Ticked,
])
type Message = typeof Message.Type

const Model = S.Struct({ count: S.Number, step: S.Number })
type Model = typeof Model.Type

const ports = {
  inbound: {
    stepChanged: Port.inbound(S.NumberFromString.check(S.isFinite())),
  },
  outbound: { countChanged: Port.outbound(S.Number) },
}

const ReportCount = Command.define(
  'ReportCount',
  { count: S.Number },
  CompletedReportCount,
)(({ count }) =>
  Port.emit(ports.outbound.countChanged, count).pipe(
    Effect.as(CompletedReportCount()),
  ),
)

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ChangedStep: ({ step }) => [evo(model, { step: () => step }), []],
      ClickedIncrement: () => {
        const count = model.count + model.step
        return [evo(model, { count: () => count }), [ReportCount({ count })]]
      },
      CompletedReportCount: () => [model, []],
      CompletedTrackHost: () => [model, []],
      Ticked: () => [model, []],
    }),
  )

let isTickStreamActive = false
let isMountActive = false

const TICK_INTERVAL_MS = 5

const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  hostStep: Port.subscription(ports.inbound.stepChanged, step =>
    ChangedStep({ step }),
  ),
  tick: Subscription.persistent(
    Stream.callback<Message>(queue =>
      Effect.acquireRelease(
        Effect.sync(() => {
          isTickStreamActive = true
          return setInterval(() => {
            Queue.offerUnsafe(queue, Ticked())
          }, TICK_INTERVAL_MS)
        }),
        intervalId =>
          Effect.sync(() => {
            clearInterval(intervalId)
            isTickStreamActive = false
          }),
      ).pipe(Effect.flatMap(() => Effect.never)),
    ),
  ),
}))

const TrackHost = Mount.define(
  'TrackHost',
  CompletedTrackHost,
)(() =>
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        isMountActive = true
      }),
      () =>
        Effect.sync(() => {
          isMountActive = false
        }),
    )
    return CompletedTrackHost()
  }),
)

const h = html<Message>()

const view = (model: Model): Html =>
  h.div(
    [h.OnMount(TrackHost())],
    [
      h.button([h.OnClick(ClickedIncrement())], ['increment']),
      h.div([], [`count:${model.count}`]),
      h.div([], [`step:${model.step}`]),
    ],
  )

let container: HTMLElement

const makeWidget = (
  initCommands: ReadonlyArray<Command.Command<Message>> = [],
) =>
  makeElement({
    Model,
    init: () => [{ count: 0, step: 1 }, initCommands],
    update,
    view,
    subscriptions,
    ports,
    container,
  })

beforeEach(() => {
  isTickStreamActive = false
  isMountActive = false
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const clickIncrement = (): void => {
  const button = document.body.querySelector('button')
  expect(button).not.toBeNull()
  button?.click()
}

describe('embed', () => {
  it('renders the app and drives update through an inbound Port send', async () => {
    const handle = embed(makeWidget())

    try {
      await awaitBodyText('step:1')

      const sendExit = handle.ports.stepChanged.send('5')
      expect(Exit.isSuccess(sendExit)).toBe(true)

      await awaitBodyText('step:5')
    } finally {
      handle.dispose()
    }
  })

  it('applies sends issued immediately after embed, before the runtime is live', async () => {
    const handle = embed(makeWidget())

    try {
      handle.ports.stepChanged.send('7')
      await awaitBodyText('step:7')
    } finally {
      handle.dispose()
    }
  })

  it('delivers outbound emissions to every subscriber in order, and unsubscribe detaches one listener', async () => {
    const handle = embed(makeWidget())
    const received: Array<string> = []

    try {
      handle.ports.countChanged.subscribe(count => {
        received.push(`first:${count}`)
      })
      const unsubscribeSecond = handle.ports.countChanged.subscribe(count => {
        received.push(`second:${count}`)
      })

      await awaitBodyText('count:0')
      clickIncrement()
      await vi.waitFor(() => {
        expect(received).toEqual(['first:1', 'second:1'])
      })

      unsubscribeSecond()
      clickIncrement()
      await vi.waitFor(() => {
        expect(received).toEqual(['first:1', 'second:1', 'first:2'])
      })
    } finally {
      handle.dispose()
    }
  })

  it('delivers init Command emissions to a listener subscribed right after embed', async () => {
    const handle = embed(makeWidget([ReportCount({ count: 0 })]))
    const received: Array<number> = []

    try {
      handle.ports.countChanged.subscribe(count => {
        received.push(count)
      })

      await vi.waitFor(() => {
        expect(received).toEqual([0])
      })
    } finally {
      handle.dispose()
    }
  })

  it('keeps other listeners and the app alive when a listener throws', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const handle = embed(makeWidget())
    const received: Array<number> = []

    try {
      handle.ports.countChanged.subscribe(() => {
        throw new Error('listener boom')
      })
      handle.ports.countChanged.subscribe(count => {
        received.push(count)
      })

      await awaitBodyText('count:0')
      clickIncrement()

      await vi.waitFor(() => {
        expect(received).toEqual([1])
      })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[foldkit] An outbound port listener threw:',
        expect.any(Error),
      )
      await awaitBodyText('count:1')
    } finally {
      handle.dispose()
    }
  })

  it('rejects an invalid inbound value with a typed Exit and keeps the app working', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const handle = embed(makeWidget())

    try {
      await awaitBodyText('step:1')

      const invalidExit = handle.ports.stepChanged.send('not a number')
      expect(Exit.isFailure(invalidExit)).toBe(true)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[foldkit] Inbound port "stepChanged" rejected a value:',
        expect.anything(),
      )

      const validExit = handle.ports.stepChanged.send('9')
      expect(Exit.isSuccess(validExit)).toBe(true)
      await awaitBodyText('step:9')
    } finally {
      handle.dispose()
    }
  })

  it('seeds the initial model from flags', async () => {
    const Flags = S.Struct({ initialCount: S.Number })

    const handle = embed(
      makeElement({
        Model,
        Flags,
        flags: Effect.succeed({ initialCount: 41 }),
        init: flags => [{ count: flags.initialCount, step: 1 }, []],
        update,
        view,
        subscriptions,
        ports,
        container,
      }),
    )

    try {
      await awaitBodyText('count:41')
    } finally {
      handle.dispose()
    }
  })

  it('dispose stops Subscriptions, releases Mounts, removes the rendered DOM, and restores the container', async () => {
    const handle = embed(makeWidget())

    await awaitBodyText('count:0')
    expect(isTickStreamActive).toBe(true)
    expect(isMountActive).toBe(true)

    handle.dispose()

    await vi.waitFor(() => {
      expect(isTickStreamActive).toBe(false)
      expect(isMountActive).toBe(false)
      expect(document.body.textContent).not.toContain('count:0')
    })
    expect(document.getElementById('app')).toBe(container)
    expect(container.childNodes.length).toBe(0)
  })

  it('dispose is idempotent and silences the handle afterwards', async () => {
    const handle = embed(makeWidget())

    await awaitBodyText('count:0')
    handle.dispose()
    handle.dispose()

    await vi.waitFor(() => {
      expect(isTickStreamActive).toBe(false)
    })

    const sendExit = handle.ports.stepChanged.send('3')
    expect(Exit.isSuccess(sendExit)).toBe(true)
    const unsubscribe = handle.ports.countChanged.subscribe(() => {})
    unsubscribe()
  })

  it('throws when a program is embedded twice without disposing', async () => {
    const element = makeWidget()
    const handle = embed(element)

    try {
      await awaitBodyText('count:0')
      expect(() => embed(element)).toThrow(/already embedded/)
    } finally {
      handle.dispose()
    }
  })

  it('supports dispose immediately followed by a fresh embed of the same program', async () => {
    const element = makeWidget()

    const firstHandle = embed(element)
    await awaitBodyText('count:0')
    firstHandle.dispose()

    const secondHandle = embed(element)
    try {
      await awaitBodyText('count:0')
      const sendExit = secondHandle.ports.stepChanged.send('4')
      expect(Exit.isSuccess(sendExit)).toBe(true)
      await awaitBodyText('step:4')
    } finally {
      secondHandle.dispose()
    }
  })

  it('works with a makeApplication program', async () => {
    const handle = embed(
      makeApplication({
        Model,
        init: () => [{ count: 0, step: 1 }, []],
        update,
        view: model => ({ title: 'Widget', body: view(model) }),
        subscriptions,
        ports,
        container,
      }),
    )
    const received: Array<number> = []

    try {
      handle.ports.countChanged.subscribe(count => {
        received.push(count)
      })

      await awaitBodyText('count:0')
      handle.ports.stepChanged.send('10')
      await awaitBodyText('step:10')

      clickIncrement()
      await vi.waitFor(() => {
        expect(received).toEqual([10])
      })
    } finally {
      handle.dispose()
    }

    await vi.waitFor(() => {
      expect(isTickStreamActive).toBe(false)
    })
  })
})
