import { Effect, Fiber, Match as M, Option, Schema as S } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { renderToString } from '../experimental/server/server.js'
import type { Document } from '../html/index.js'
import { __htmlBuilder } from '../html/index.js'
import { m } from '../message/index.js'
import { __startProgram, makeApplication } from './runtime.js'

const ClickedIncrement = m('ClickedIncrement')
const Message = S.Union([ClickedIncrement])
type Message = typeof Message.Type

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

const Flags = S.Struct({ start: S.Number })
type Flags = typeof Flags.Type

const h = __htmlBuilder<Message>()

const init = (
  flags: Flags,
): readonly [Model, ReadonlyArray<Command<Message>>] => [
  Model.make({ count: flags.start }),
  [],
]

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedIncrement: () => [Model.make({ count: model.count + 1 }), []],
    }),
  )

const view = (model: Model): Document => ({
  title: `Count ${model.count}`,
  body: h.div(
    [],
    [
      h.button([h.Id('bump'), h.OnClick(ClickedIncrement())], ['+']),
      h.span([h.Id('count')], [String(model.count)]),
    ],
  ),
})

const serverConfig = { Flags, init, view }

const renderServerPage = async (flags: Flags): Promise<void> => {
  const rendered = await Effect.runPromise(
    renderToString(serverConfig, { flags }),
  )
  document.body.innerHTML = rendered.html
}

const nullContainer = (): HTMLElement | null =>
  document.getElementById('does-not-exist')

const makeClientApplication = (
  onFlagsEffect: () => Flags,
): ReturnType<typeof makeApplication> =>
  makeApplication({
    Model,
    Flags,
    flags: Effect.sync(onFlagsEffect),
    init,
    update,
    view,
    container: nullContainer(),
  })

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const resetRootAttributes = (): void => {
  document.documentElement.removeAttribute('lang')
  document.documentElement.removeAttribute('dir')
}

afterEach(() => {
  document.body.innerHTML = ''
  resetRootAttributes()
})

describe('hydrating boot', () => {
  it('re-asserts the Document lang and dir on <html> matching the server stamp', async () => {
    const localizedView = (model: Model): Document => ({
      title: `Count ${model.count}`,
      lang: 'ar',
      dir: 'Rtl',
      body: h.div([], [h.span([h.Id('count')], [String(model.count)])]),
    })
    const localizedConfig = { Flags, init, view: localizedView }
    const rendered = await Effect.runPromise(
      renderToString(localizedConfig, { flags: { start: 5 } }),
    )
    document.body.innerHTML = rendered.html
    if (rendered.lang !== undefined) {
      document.documentElement.lang = rendered.lang
    }
    if (rendered.dir !== undefined) {
      document.documentElement.dir = rendered.dir
    }
    expect(rendered.lang).toBe('ar')
    expect(rendered.dir).toBe('rtl')

    const application = makeApplication({
      Model,
      Flags,
      flags: Effect.sync(() => ({ start: 99 })),
      init,
      update,
      view: localizedView,
      container: nullContainer(),
    })
    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate'),
    )

    try {
      await awaitBodyText('5')
      expect(document.documentElement.lang).toBe('ar')
      expect(document.documentElement.dir).toBe('rtl')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('adopts the server DOM and replays the flags payload', async () => {
    await renderServerPage({ start: 5 })

    const serverRoot = document.querySelector('[data-foldkit-app]')
    const serverCount = document.getElementById('count')
    expect(serverRoot).not.toBeNull()
    expect(serverCount?.textContent).toBe('5')

    let flagsEffectRuns = 0
    const application = makeClientApplication(() => {
      flagsEffectRuns += 1
      return { start: 99 }
    })

    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate'),
    )

    try {
      await awaitBodyText('5')
      expect(flagsEffectRuns).toBe(0)
      expect(document.getElementById('count')).toBe(serverCount)
      expect(serverRoot?.isConnected).toBe(true)
      expect(document.querySelector('[data-foldkit-app]')).toBeNull()
      await vi.waitFor(() => {
        expect(document.title).toBe('Count 5')
      })

      document
        .getElementById('bump')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      await awaitBodyText('6')
      expect(document.getElementById('count')).toBe(serverCount)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('round-trips non-JSON-native Schema values through the flags payload', async () => {
    const OptionalFlags = S.Struct({ maybeStart: S.Option(S.Number) })
    type OptionalFlags = typeof OptionalFlags.Type
    const optionalInit = (
      flags: OptionalFlags,
    ): readonly [Model, ReadonlyArray<Command<Message>>] => [
      Model.make({ count: Option.getOrElse(flags.maybeStart, () => 0) }),
      [],
    ]
    const rendered = await Effect.runPromise(
      renderToString(
        { Flags: OptionalFlags, init: optionalInit, view },
        { flags: { maybeStart: Option.some(8) } },
      ),
    )
    document.body.innerHTML = rendered.html
    const serverCount = document.getElementById('count')

    const application = makeApplication({
      Model,
      Flags: OptionalFlags,
      flags: Effect.succeed({ maybeStart: Option.some(99) }),
      init: optionalInit,
      update,
      view,
      container: nullContainer(),
    })
    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate'),
    )

    try {
      await awaitBodyText('8')
      expect(document.getElementById('count')).toBe(serverCount)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('falls back to a fresh render when the flags payload is undecodable', async () => {
    await renderServerPage({ start: 5 })
    const payloadScript = document.querySelector('script[data-foldkit-flags]')
    expect(payloadScript).not.toBeNull()
    if (payloadScript !== null) {
      payloadScript.textContent = 'not json'
    }
    const serverCount = document.getElementById('count')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let flagsEffectRuns = 0
    const application = makeClientApplication(() => {
      flagsEffectRuns += 1
      return { start: 99 }
    })

    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate'),
    )

    try {
      await awaitBodyText('99')
      expect(flagsEffectRuns).toBe(1)
      expect(document.getElementById('count')).not.toBe(serverCount)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no decodable flags'),
      )
    } finally {
      warn.mockRestore()
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('prefers an HMR-restored Model over hydration', async () => {
    await renderServerPage({ start: 5 })
    const serverCount = document.getElementById('count')

    let flagsEffectRuns = 0
    const application = makeClientApplication(() => {
      flagsEffectRuns += 1
      return { start: 99 }
    })

    const fiber = Effect.runFork(
      __startProgram(application, Model.make({ count: 42 }), 'Hydrate'),
    )

    try {
      await awaitBodyText('42')
      expect(flagsEffectRuns).toBe(0)
      expect(document.getElementById('count')).not.toBe(serverCount)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('throws for a null container when no server root is stamped', () => {
    document.body.innerHTML = '<div id="present"></div>'

    expect(() =>
      makeApplication({
        Model,
        init: () => [Model.make({ count: 0 }), []],
        update,
        view,
        container: nullContainer(),
      }),
    ).toThrow('Container is null')
  })

  it('renders fresh under run, leaving a server-rendered root unadopted', async () => {
    await renderServerPage({ start: 5 })

    let flagsEffectRuns = 0
    const application = makeClientApplication(() => {
      flagsEffectRuns += 1
      return { start: 9 }
    })

    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Fresh'),
    )

    try {
      await awaitBodyText('9')
      expect(flagsEffectRuns).toBe(1)
      expect(document.getElementById('count')?.textContent).toBe('9')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('hydrate on an unstamped container falls back without adopting another app root', async () => {
    await renderServerPage({ start: 5 })
    const serverRoot = document.querySelector('[data-foldkit-app]')
    const widgetContainer = document.createElement('div')
    widgetContainer.id = 'widget'
    document.body.appendChild(widgetContainer)

    let flagsEffectRuns = 0
    const widget = makeApplication({
      Model,
      Flags,
      flags: Effect.sync(() => {
        flagsEffectRuns += 1
        return { start: 7 }
      }),
      init,
      update,
      view,
      container: document.getElementById('widget'),
    })

    const fiber = Effect.runFork(__startProgram(widget, undefined, 'Hydrate'))

    try {
      await awaitBodyText('7')
      expect(flagsEffectRuns).toBe(1)
      expect(serverRoot?.isConnected).toBe(true)
      expect(serverRoot?.textContent).toContain('5')
      expect(serverRoot?.hasAttribute('data-foldkit-app')).toBe(true)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('throws when multiple stamped roots exist and no container disambiguates', async () => {
    await renderServerPage({ start: 5 })
    const secondRoot = document.createElement('div')
    secondRoot.setAttribute('data-foldkit-app', 'other')
    document.body.appendChild(secondRoot)

    expect(() => makeClientApplication(() => ({ start: 0 }))).toThrow(
      'multiple server-rendered roots',
    )
  })
})
