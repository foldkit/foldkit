import { Effect, Fiber, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/public.js'
import * as Application from './application.js'
import { __startProgram, run } from './start.js'

const Message = defineMessageUnion({
  ClickedRevealMount: {},
  CompletedAnchorPanel: { label: Schema.String },
})
type Message = typeof Message.Type

const Model = Schema.Struct({ status: Schema.String })
type Model = typeof Model.Type

const AnchorPanel = Mount.define('AnchorPanel', {
  args: { label: Schema.String },
  messages: [Message.CompletedAnchorPanel],
})

const update = (_model: Model, message: Message) =>
  Message.match(message, {
    ClickedRevealMount: () => ({ model: { status: 'revealing Mount' } }),
    CompletedAnchorPanel: ({ label }) => ({ model: { status: label } }),
  })

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'mount-layer-test'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const makeApplication = <
  const Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
>(
  mounts: Mounts,
) =>
  Application.make({
    Model,
    init: () => ({ model: { status: 'ready' } }),
    update,
    view: (model, h) => ({
      title: 'Mount Layer test',
      body: h.div(
        [h.OnMount(AnchorPanel({ label: 'anchored' }))],
        [model.status],
      ),
    }),
    mounts,
    container,
  })

describe('Layer-backed Mount runtime', () => {
  it('runs a registered Mount through its application Layer', async () => {
    const application = makeApplication([AnchorPanel])
    const provided = Application.provide(
      application,
      AnchorPanel.toLayer(
        Effect.succeed(({ label }) =>
          Effect.succeed(Message.CompletedAnchorPanel({ label })),
        ),
      ),
    )
    const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('anchored')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('crashes before patching an unregistered Layer-backed Mount', async () => {
    let reportedError: Error | undefined
    const application = Application.make({
      Model,
      init: () => ({ model: { status: 'ready' } }),
      update,
      view: (model, h) => ({
        title: 'Unregistered Mount test',
        body: h.div(
          [h.OnMount(AnchorPanel({ label: 'anchored' }))],
          [model.status],
        ),
      }),
      crash: {
        report: ({ error }) => {
          reportedError = error
        },
      },
      container,
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Fresh'),
    )

    try {
      await vi.waitFor(() => {
        expect(reportedError?.message).toContain(
          'Layer-backed Mounts that were not registered: AnchorPanel',
        )
        expect(document.title).toBe('Application Crash')
        expect(document.body.textContent).not.toContain('anchored')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      consoleError.mockRestore()
    }
  })

  it('checks a Layer-backed Mount revealed by a later Model state', async () => {
    let reportedError: Error | undefined
    const application = Application.make({
      Model,
      init: () => ({ model: { status: 'ready' } }),
      update,
      view: (model, h) => ({
        title: 'Conditional unregistered Mount test',
        body:
          model.status === 'revealing Mount'
            ? h.div(
                [h.OnMount(AnchorPanel({ label: 'anchored' }))],
                [model.status],
              )
            : h.button(
                [h.OnClick(Message.ClickedRevealMount())],
                ['reveal Mount'],
              ),
      }),
      crash: {
        report: ({ error }) => {
          reportedError = error
        },
      },
      container,
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Fresh'),
    )

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('reveal Mount')
      })

      document.body.querySelector('button')?.click()

      await vi.waitFor(() => {
        expect(reportedError?.message).toContain(
          'Layer-backed Mounts that were not registered: AnchorPanel',
        )
        expect(document.title).toBe('Application Crash')
        expect(document.body.textContent).not.toContain('revealing Mount')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      consoleError.mockRestore()
    }
  })

  it('allows a registered Mount Definition that the view does not render', async () => {
    let executions = 0
    const application = Application.make({
      Model,
      init: () => ({ model: { status: 'ready' } }),
      update,
      view: (model, h) => ({
        title: 'Unused Mount test',
        body: h.div([], [model.status]),
      }),
      mounts: [AnchorPanel],
      container,
    })
    const provided = Application.provide(
      application,
      AnchorPanel.toLayer(
        Effect.succeed(({ label }) => {
          executions += 1
          return Effect.succeed(Message.CompletedAnchorPanel({ label }))
        }),
      ),
    )
    const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('ready')
      })
      expect(executions).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('rejects distinct registered definitions with the same name', () => {
    const otherAnchorPanel = Mount.define('AnchorPanel', {
      args: { label: Schema.String },
      messages: [Message.CompletedAnchorPanel],
    })

    expect(() => makeApplication([AnchorPanel, otherAnchorPanel])).toThrow(
      'same name "AnchorPanel" but different definitions',
    )
  })

  it('allows repeated registration of one definition', () => {
    expect(() => makeApplication([AnchorPanel, AnchorPanel])).not.toThrow()
  })

  it('finishes Mount cleanup before releasing the handler Layer', async () => {
    const events: Array<string> = []
    const application = makeApplication([AnchorPanel])
    const handlerLayer = AnchorPanel.toLayer(
      Effect.acquireRelease(
        Effect.sync(() => {
          events.push('handler acquired')
          return ({ label }: Readonly<{ label: string }>) =>
            Effect.gen(function* () {
              yield* Effect.acquireRelease(
                Effect.sync(() => {
                  events.push('Mount acquired')
                }),
                () =>
                  Effect.gen(function* () {
                    yield* Effect.yieldNow
                    events.push('Mount released')
                  }),
              )
              return Message.CompletedAnchorPanel({ label })
            })
        }),
        () =>
          Effect.sync(() => {
            events.push('handler released')
          }),
      ),
    )
    const provided = Application.provide(application, handlerLayer)
    const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

    await vi.waitFor(() => {
      expect(document.body.textContent).toBe('anchored')
    })
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(events).toEqual([
      'handler acquired',
      'Mount acquired',
      'Mount released',
      'handler released',
    ])
  })
})

const checkApplicationTypes = (): void => {
  const application = makeApplication([AnchorPanel])

  // @ts-expect-error The registered AnchorPanel handler has not been provided.
  run(application)

  run(
    Application.provide(
      application,
      AnchorPanel.toLayer(
        Effect.succeed(({ label }) =>
          Effect.succeed(Message.CompletedAnchorPanel({ label })),
        ),
      ),
    ),
  )
}

void checkApplicationTypes
