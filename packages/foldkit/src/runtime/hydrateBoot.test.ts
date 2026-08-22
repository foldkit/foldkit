import { Effect, Fiber, Option, Schema as S } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { renderToString } from '../experimental/server/server.js'
import type { Document } from '../html/index.js'
import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { __startProgram, hydrate, makeApplication, run } from './runtime.js'

const Message = defineMessageUnion({
  ClickedIncrement: {},
})
type Message = typeof Message.Type

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

const Flags = S.Struct({ start: S.Number })
type Flags = typeof Flags.Type

const h = __htmlBuilder<Message>()

const init = (
  flags: Flags,
): Readonly<{
  model: Model
  commands?: ReadonlyArray<Command<Message>>
  outMessage?: never
}> => ({ model: Model.make({ count: flags.start }) })

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command<Message>>
  outMessage?: never
}>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedIncrement: () => ({ model: Model.make({ count: model.count + 1 }) }),
  })

const view = (model: Model): Document => ({
  title: `Count ${model.count}`,
  body: h.div(
    [],
    [
      h.button([h.Id('bump'), h.OnClick(Message.ClickedIncrement())], ['+']),
      h.span([h.Id('count')], [String(model.count)]),
    ],
  ),
})

const serverConfig = { Flags, init, view }

const renderServerPage = async (flags: Flags): Promise<void> => {
  const rendered = await Effect.runPromise(
    renderToString(serverConfig, { flags, buildId: BUILD_ID }),
  )
  document.body.innerHTML = rendered.html
}

const nullContainer = (): HTMLElement | null =>
  document.getElementById('does-not-exist')

const makeClientApplication = () =>
  makeApplication({
    Model,
    Flags,
    init,
    update,
    view,
    container: nullContainer(),
  })

const hydrateUnchecked = (
  application: ReturnType<typeof makeClientApplication>,
  optionsArguments: ReadonlyArray<unknown>,
): void => {
  Reflect.apply(hydrate, undefined, [application, ...optionsArguments])
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const startHydrationUnchecked = (
  application: ReturnType<typeof makeClientApplication>,
  buildId: any,
): Effect.Effect<void> =>
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
  __startProgram(application, undefined, 'Hydrate', undefined, buildId)

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
  document.head
    .querySelectorAll('[data-foldkit-app]')
    .forEach(root => root.remove())
  document
    .querySelectorAll('[data-foldkit-refusal-shield]')
    .forEach(shield => shield.remove())
  document.body.inert = false
  document.body.removeAttribute('inert')
  document.body.removeAttribute('aria-hidden')
  document.body.removeAttribute('data-foldkit-refused')
  resetRootAttributes()
})

const BUILD_ID = 'test-build-id'

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
      renderToString(localizedConfig, {
        flags: { start: 5 },
        buildId: BUILD_ID,
      }),
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
      init,
      update,
      view: localizedView,
      container: nullContainer(),
    })
    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
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

    const application = makeClientApplication()

    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
    )

    try {
      await awaitBodyText('5')
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
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message>>
      outMessage?: never
    }> => ({
      model: Model.make({ count: Option.getOrElse(flags.maybeStart, () => 0) }),
    })
    const rendered = await Effect.runPromise(
      renderToString(
        { Flags: OptionalFlags, init: optionalInit, view },
        { flags: { maybeStart: Option.some(8) }, buildId: BUILD_ID },
      ),
    )
    document.body.innerHTML = rendered.html
    const serverCount = document.getElementById('count')

    const application = makeApplication({
      Model,
      Flags: OptionalFlags,
      init: optionalInit,
      update,
      view,
      container: nullContainer(),
    })
    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
    )

    try {
      await awaitBodyText('8')
      expect(document.getElementById('count')).toBe(serverCount)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('fails hydration when the flags payload is undecodable', async () => {
    await renderServerPage({ start: 5 })
    const payloadScript = document.querySelector('script[data-foldkit-flags]')
    expect(payloadScript).not.toBeNull()
    if (payloadScript !== null) {
      payloadScript.textContent = 'not json'
    }
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('could not decode the server Flags payload')
    expect(document.getElementById('count')?.textContent).toBe('5')
  })

  it('validates the flags payload before applying an HMR-restored Model', async () => {
    await renderServerPage({ start: 5 })
    const payloadScript = document.querySelector('script[data-foldkit-flags]')
    expect(payloadScript).not.toBeNull()
    if (payloadScript !== null) {
      payloadScript.textContent = 'not json'
    }
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(
          application,
          Model.make({ count: 42 }),
          'Hydrate',
          undefined,
          BUILD_ID,
        ),
      ),
    ).rejects.toThrow('could not decode the server Flags payload')
    expect(document.getElementById('count')?.textContent).toBe('5')
  })

  it('fails hydration when the flags payload is missing', async () => {
    await renderServerPage({ start: 5 })
    document.querySelector('script[data-foldkit-flags]')?.remove()

    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('server Flags payload is missing')
    expect(document.getElementById('count')?.textContent).toBe('5')
  })

  it('fails hydration when multiple flags payloads claim the application', async () => {
    await renderServerPage({ start: 5 })
    const payloadScript = document.querySelector('script[data-foldkit-flags]')
    expect(payloadScript).not.toBeNull()
    if (payloadScript !== null) {
      document.body.appendChild(payloadScript.cloneNode(true))
    }

    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('multiple server Flags payloads')
    expect(document.getElementById('count')?.textContent).toBe('5')
  })

  it('prefers an HMR-restored Model over hydration', async () => {
    await renderServerPage({ start: 5 })
    const serverCount = document.getElementById('count')
    const application = makeClientApplication()

    const fiber = Effect.runFork(
      __startProgram(
        application,
        Model.make({ count: 42 }),
        'Hydrate',
        undefined,
        BUILD_ID,
      ),
    )

    try {
      await awaitBodyText('42')
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
        init: () => ({ model: Model.make({ count: 0 }) }),
        update,
        view,
        container: nullContainer(),
      }),
    ).toThrow('Container is null')
  })

  it('renders fresh under run, leaving a server-rendered root unadopted', async () => {
    await renderServerPage({ start: 5 })

    let flagsEffectRuns = 0
    const application = makeClientApplication()
    const flags = Effect.sync(() => {
      flagsEffectRuns += 1
      return { start: 9 }
    })

    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Fresh', flags),
    )

    try {
      await awaitBodyText('9')
      expect(flagsEffectRuns).toBe(1)
      expect(document.getElementById('count')?.textContent).toBe('9')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('contains a server-rendered page when the container is outside its root', async () => {
    await renderServerPage({ start: 5 })
    const serverRoot = document.querySelector('[data-foldkit-app]')
    const widgetContainer = document.createElement('div')
    widgetContainer.id = 'widget'
    document.body.appendChild(widgetContainer)

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: document.getElementById('widget'),
      }),
    ).toThrow("container outside the document's server-rendered application")
    expect(serverRoot?.isConnected).toBe(true)
    expect(serverRoot?.textContent).toContain('5')
    expect(serverRoot?.hasAttribute('data-foldkit-app')).toBe(true)
    expectContained(serverRoot)
  })

  it('hydrates the stamped root when the container id resolves to a rendered descendant', async () => {
    const nestedView = (model: Model): Document => ({
      title: `Count ${model.count}`,
      // The view reuses the conventional container id on an inner element, so
      // document.getElementById('root') resolves to this descendant rather than
      // the stamped root above it.
      body: h.div(
        [],
        [
          h.div(
            [h.Id('root')],
            [h.span([h.Id('count')], [String(model.count)])],
          ),
        ],
      ),
    })
    const rendered = await Effect.runPromise(
      renderToString(
        { Flags, init, view: nestedView },
        { flags: { start: 5 }, buildId: BUILD_ID },
      ),
    )
    document.body.innerHTML = rendered.html
    const serverRoot = document.querySelector('[data-foldkit-app]')
    expect(serverRoot).not.toBeNull()
    expect(document.getElementById('root')).not.toBe(serverRoot)

    const application = makeApplication({
      Model,
      Flags,
      init,
      update,
      view: nestedView,
      container: document.getElementById('root'),
    })
    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
    )

    try {
      await awaitBodyText('5')
      expect(serverRoot?.isConnected).toBe(true)
      expect(document.querySelector('[data-foldkit-app]')).toBeNull()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('refuses a multi-rooted page before resolving an unstamped container', async () => {
    await renderServerPage({ start: 5 })
    const ownRoot = document.querySelector('[data-foldkit-app]')
    const otherRoot = document.createElement('div')
    otherRoot.setAttribute('data-foldkit-app', 'other')
    const nested = document.createElement('div')
    nested.id = 'nested'
    otherRoot.appendChild(nested)
    document.body.appendChild(otherRoot)

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: document.getElementById('nested'),
      }),
    ).toThrow('more than one page-owning application')
    expect(ownRoot?.isConnected).toBe(true)
    expect(otherRoot.getAttribute('data-foldkit-app')).toBe('other')
    expectContained(ownRoot)
  })

  it('throws when two stamped roots share a runtime id', async () => {
    // A page assembled outside `injectIntoTemplate` can still carry two roots
    // answering to one id. Whichever application booted second would read the
    // other's Flags payload and restore the other's preserved Model.
    await renderServerPage({ start: 5 })
    const duplicate = document.createElement('div')
    duplicate.setAttribute('data-foldkit-app', 'app')
    document.body.appendChild(duplicate)

    expect(() => makeClientApplication()).toThrow(
      /more than one server-rendered root stamped "app"/,
    )
  })

  it('throws for duplicate ids on applications without Flags', () => {
    document.body.innerHTML =
      '<div data-foldkit-app="app"></div><div data-foldkit-app="app"></div>'

    expect(() =>
      makeApplication({
        Model,
        init: () => ({ model: Model.make({ count: 0 }) }),
        update,
        view,
        container: nullContainer(),
      }),
    ).toThrow(/more than one server-rendered root stamped "app"/)
  })

  it('accepts one stamped root with a nondefault runtime id', () => {
    document.body.innerHTML = '<div data-foldkit-app="alpha" id="alpha"></div>'

    const application = makeApplication({
      Model,
      init: () => ({ model: Model.make({ count: 0 }) }),
      update,
      view,
      container: document.getElementById('alpha'),
    })

    expect(application.runtimeId).toBe('alpha')
  })

  it('pairs a nondefault runtime id with its Flags payload', async () => {
    const rendered = await Effect.runPromise(
      renderToString(serverConfig, {
        flags: { start: 7 },
        buildId: BUILD_ID,
        runtimeId: 'beta',
      }),
    )
    document.body.innerHTML = rendered.html
    const betaRoot = document.querySelector('[data-foldkit-app="beta"]')

    const betaApplication = makeApplication({
      Model,
      Flags,
      init,
      update,
      view,
      container: document.querySelector('[data-foldkit-app="beta"]'),
    })

    expect(betaApplication.runtimeId).toBe('beta')

    const betaFiber = Effect.runFork(
      __startProgram(
        betaApplication,
        undefined,
        'Hydrate',
        undefined,
        BUILD_ID,
      ),
    )

    try {
      await vi.waitFor(() => {
        expect(betaRoot?.textContent).toContain('7')
      })
      expect(betaRoot?.isConnected).toBe(true)
    } finally {
      await Effect.runPromise(Fiber.interrupt(betaFiber))
    }
  })

  it('throws when multiple stamped roots exist', async () => {
    await renderServerPage({ start: 5 })
    const secondRoot = document.createElement('div')
    secondRoot.setAttribute('data-foldkit-app', 'other')
    document.body.appendChild(secondRoot)

    expect(() => makeClientApplication()).toThrow(
      'more than one page-owning application',
    )
  })

  it('separates fresh Flags acquisition from hydration at the type boundary', () => {
    document.body.innerHTML = '<div data-foldkit-app="app"></div>'
    const application = makeClientApplication()

    expect(application.runtimeId).toBe('app')

    if (false) {
      // @ts-expect-error a fresh boot of a Flags application requires a Flags Effect
      run(application)
      run(application, { flags: Effect.succeed({ start: 1 }) })
      // @ts-expect-error hydration requires the client's build id
      hydrate(application)
      hydrate(application, {
        buildId: BUILD_ID,
        // @ts-expect-error hydration owns Flags and accepts no client producer
        flags: Effect.succeed({ start: 1 }),
      })
      hydrate(application, { buildId: BUILD_ID })
    }
  })

  it('refuses a page cached from before build ids existed', async () => {
    // The page a visitor still has open from 0.147 carries no marker at all.
    // Reading an absent marker as equal to an absent client id would accept
    // every such page as this build's own, which is exactly the adoption the id
    // exists to refuse.
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    servedRoot?.removeAttribute('data-foldkit-build')
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('no known deployment')
  })

  it('refuses a hydration given no build id', async () => {
    await renderServerPage({ start: 5 })
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, undefined),
      ),
    ).rejects.toThrow('was given no build id')
  })

  it('refuses a hydration given an empty build id', async () => {
    // An empty string is the shape an unset FOLDKIT_BUILD_ID compiles to. It
    // must not pass for a deployment name, and it must not match the absent
    // marker on an older page either.
    await renderServerPage({ start: 5 })
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, ''),
      ),
    ).rejects.toThrow('was given no build id')
  })

  it('refuses build skew before decoding the served Flags', async () => {
    // A page from another deployment carries that deployment's Flags. This
    // Schema may well accept them while every value in them means something
    // else, so the comparison has to settle before the payload is read at all.
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    servedRoot?.setAttribute('data-foldkit-build', 'other-deployment')
    const payloadScript = document.querySelector('script[data-foldkit-flags]')
    if (payloadScript === null) {
      throw new Error('expected a served Flags payload')
    }
    const decodeAttempts: Array<string> = []
    const payload = payloadScript.textContent ?? ''
    Object.defineProperty(payloadScript, 'textContent', {
      get: () => {
        decodeAttempts.push(payload)
        return payload
      },
    })
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('this client belongs to deployment')
    expect(decodeAttempts).toEqual([])
  })

  it('runs no init Command for a page from another deployment', async () => {
    // The Flags of a stale page are schema-compatible here, so nothing but the
    // build id can tell them apart. Startup must stop before `init` returns
    // Commands the new code would then run against the old deployment's data.
    const started: Array<number> = []
    const recordingInit = (
      flags: Flags,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message>>
      outMessage?: never
    }> => {
      started.push(flags.start)
      return { model: Model.make({ count: flags.start }) }
    }
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    servedRoot?.setAttribute('data-foldkit-build', 'other-deployment')

    const application = makeApplication({
      Model,
      Flags,
      init: recordingInit,
      update,
      view,
      container: nullContainer(),
    })

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('this client belongs to deployment')
    expect(started).toEqual([])
  })

  // What a refusal leaves behind: the document's body marked in place and a
  // modal shield outside it. `inert` is an HTML attribute, so it cannot go on a
  // root that may be SVG or MathML, and inertness propagates from an HTML
  // ancestor to descendants of any namespace. The root keeps the parent it was
  // served under: wrapping it would reparent the subtree, which reconnects every
  // custom element in it and reloads every frame.
  const expectContained = (root: Element | null): void => {
    const shield = document.querySelector<HTMLDialogElement>(
      ':root > dialog[data-foldkit-refusal-shield]',
    )
    expect(document.body.hasAttribute('inert')).toBe(true)
    expect(document.body.getAttribute('aria-hidden')).toBe('true')
    expect(document.body.hasAttribute('data-foldkit-refused')).toBe(true)
    expect(document.querySelectorAll('[data-foldkit-refused]').length).toBe(1)
    expect(shield?.parentElement).toBe(document.documentElement)
    expect(shield?.open).toBe(true)
    expect(document.activeElement).toBe(shield)
    if (root !== null) {
      expect(root.isConnected).toBe(true)
    }
  }

  const expectNotContained = (): void => {
    expect(document.body.hasAttribute('inert')).toBe(false)
    expect(document.body.hasAttribute('data-foldkit-refused')).toBe(false)
    expect(document.querySelector('[data-foldkit-refusal-shield]')).toBeNull()
  }

  it.each([
    { name: 'omitted options', optionsArguments: [] },
    { name: 'undefined options', optionsArguments: [undefined] },
    { name: 'null options', optionsArguments: [null] },
  ])(
    'contains the page when a JavaScript caller supplies $name',
    async ({ optionsArguments }) => {
      await renderServerPage({ start: 5 })
      const servedRoot = document.querySelector('[data-foldkit-app]')
      const application = makeClientApplication()
      const runtimeLog = vi.spyOn(console, 'log').mockImplementation(() => {})
      const hmrWarning = vi.spyOn(console, 'warn').mockImplementation(() => {})

      try {
        expect(() =>
          hydrateUnchecked(application, optionsArguments),
        ).not.toThrow()
        await vi.waitFor(() => expectContained(servedRoot))
      } finally {
        runtimeLog.mockRestore()
        hmrWarning.mockRestore()
      }
    },
  )

  it.each([
    { name: 'null', buildId: null },
    { name: 'a number', buildId: 0 },
    { name: 'a boolean', buildId: false },
    { name: 'an object', buildId: {} },
  ])('refuses $name as a JavaScript build id', async ({ buildId }) => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(startHydrationUnchecked(application, buildId)),
    ).rejects.toThrow('was given no build id')
    expectContained(servedRoot)
  })

  it('refuses a null build id before adopting an unstamped root', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    servedRoot?.removeAttribute('data-foldkit-build')
    const initAttempts: Array<number> = []
    const application = makeApplication({
      Model,
      Flags,
      init: (
        flags: Flags,
      ): Readonly<{
        model: Model
        commands?: ReadonlyArray<Command<Message>>
        outMessage?: never
      }> => {
        initAttempts.push(flags.start)
        throw new Error('the invalid handoff reached init')
      },
      update,
      view,
      container: nullContainer(),
    })
    const runtimeLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    const hmrWarning = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      hydrateUnchecked(application, [{ buildId: null }])
      await vi.waitFor(() => expectContained(servedRoot))
      expect(initAttempts).toEqual([])
    } finally {
      runtimeLog.mockRestore()
      hmrWarning.mockRestore()
    }
  })

  it('takes a rejected page out of reach before stopping', async () => {
    // Refusing to adopt keeps this build's code off the page, but the markup is
    // still live: its links navigate and its forms submit to whatever the old
    // deployment wrote. Containing the root is what stops a visitor acting on a
    // page no running code understands.
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    servedRoot?.setAttribute('data-foldkit-build', 'other-deployment')
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('this client belongs to deployment')

    expectContained(servedRoot)
  })

  it('contains the root when the Flags payload is missing', async () => {
    // Build skew is one reason to refuse, not the only one. A handoff that
    // cannot be read leaves exactly the same live page behind.
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    document.querySelector('script[data-foldkit-flags]')?.remove()
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('server Flags payload is missing')

    expectContained(servedRoot)
  })

  it('contains the root when the Flags payload is duplicated', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    const payload = document.querySelector('script[data-foldkit-flags]')
    if (payload === null) {
      throw new Error('expected a served Flags payload')
    }
    document.body.appendChild(payload.cloneNode(true))
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('multiple server Flags payloads')

    expectContained(servedRoot)
  })

  it('contains the root when the Flags payload is malformed', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    const payload = document.querySelector('script[data-foldkit-flags]')
    if (payload === null) {
      throw new Error('expected a served Flags payload')
    }
    payload.textContent = '{not json'
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('could not decode the server')

    expectContained(servedRoot)
  })

  it('contains the root when the Flags payload does not fit the Schema', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    const payload = document.querySelector('script[data-foldkit-flags]')
    if (payload === null) {
      throw new Error('expected a served Flags payload')
    }
    payload.textContent = '{"unrelated":"shape"}'
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('could not decode the server')

    expectContained(servedRoot)
  })

  it('contains the page when no stamped root is found', async () => {
    // Nothing names an application here, but the caller named a container, and
    // whatever sits in it came from a render this client will not adopt.
    document.body.innerHTML = '<div id="app"><a href="/x">go</a></div>'
    const container = document.getElementById('app')
    const application = makeApplication({
      Model,
      Flags,
      init,
      update,
      view,
      container,
    })

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('could not find a server-rendered root')

    expectContained(container)
  })

  it('contains an SVG or MathML root, which cannot be inert itself', async () => {
    // `inert` is an HTML attribute. Assigning it to an SVG or MathML element
    // only creates an expando and a foreign-namespace attribute that contains
    // nothing, and both are hydratable root types. Inertness propagates from an
    // HTML ancestor to descendants of any namespace, which is what the shield
    // relies on.
    for (const markup of [
      '<svg xmlns="http://www.w3.org/2000/svg" data-foldkit-app="app" data-foldkit-build="other"></svg>',
      '<math xmlns="http://www.w3.org/1998/Math/MathML" data-foldkit-app="app" data-foldkit-build="other"></math>',
    ]) {
      document.body.innerHTML = markup
      const servedRoot = document.querySelector('[data-foldkit-app]')
      const application = makeApplication({
        Model,
        init: () => ({ model: Model.make({ count: 0 }) }),
        update,
        view,
        container: nullContainer(),
      })

      await expect(
        Effect.runPromise(
          __startProgram(
            application,
            undefined,
            'Hydrate',
            undefined,
            BUILD_ID,
          ),
        ),
      ).rejects.toThrow('this client belongs to deployment')

      expectContained(servedRoot)
      expect(servedRoot?.hasAttribute('inert')).toBe(false)
    }
  })

  it('covers an open modal without invoking its lifecycle', async () => {
    // A modal lives in the top layer, where ancestor inertness does not reach
    // it. Closing author-owned dialogs invokes their listeners while startup is
    // failing, so a later modal shield covers them without changing their state.
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    const dialog = document.createElement('dialog')
    dialog.setAttribute('open', '')
    const field = document.createElement('input')
    dialog.appendChild(field)
    const bodyKeys: Array<string> = []
    document.body.addEventListener('keydown', () => bodyKeys.push('keydown'))
    const closed: Array<string> = []
    dialog.addEventListener('cancel', () => closed.push('cancel'))
    dialog.addEventListener('close', () => closed.push('close'))
    servedRoot?.appendChild(dialog)
    servedRoot?.setAttribute('data-foldkit-build', 'other-deployment')
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('this client belongs to deployment')

    const shield = document.querySelector<HTMLDialogElement>(
      ':root > dialog[data-foldkit-refusal-shield]',
    )
    const cancel = new Event('cancel', { cancelable: true })
    expect(shield?.dispatchEvent(cancel)).toBe(false)
    expect(cancel.defaultPrevented).toBe(true)
    const tab = new KeyboardEvent('keydown', {
      cancelable: true,
      key: 'Tab',
    })
    expect(shield?.dispatchEvent(tab)).toBe(false)
    expect(tab.defaultPrevented).toBe(true)
    expect(shield?.open).toBe(true)
    expect(dialog.open).toBe(true)
    expect(closed).toEqual([])
    field.focus()
    const keydown = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'A',
    })
    expect(field.dispatchEvent(keydown)).toBe(false)
    expect(keydown.defaultPrevented).toBe(true)
    expect(bodyKeys).toEqual([])
    expectContained(servedRoot)
  })

  it('does not trust an author-owned refusal marker as its shield', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    const authored = document.createElement('dialog')
    authored.setAttribute('data-foldkit-refusal-shield', '')
    authored.setAttribute('data-foldkit-refused', '')
    authored.setAttribute('open', '')
    servedRoot?.appendChild(authored)
    servedRoot?.setAttribute('data-foldkit-build', 'other-deployment')
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('this client belongs to deployment')

    const owned = document.querySelector<HTMLDialogElement>(
      ':root > dialog[data-foldkit-refusal-shield]',
    )
    expect(owned).not.toBe(authored)
    expect(owned?.open).toBe(true)
    expect(authored.open).toBe(true)
    expect(authored.isConnected).toBe(true)
  })

  const shadowRootModes: ReadonlyArray<ShadowRootMode> = ['open', 'closed']
  for (const mode of shadowRootModes) {
    it(`covers an open modal dialog inside a shadow root with mode ${mode}`, async () => {
      await renderServerPage({ start: 5 })
      const servedRoot = document.querySelector('[data-foldkit-app]')
      const host = document.createElement('div')
      servedRoot?.appendChild(host)
      const shadowRoot = host.attachShadow({ mode })
      const dialog = document.createElement('dialog')
      dialog.setAttribute('open', '')
      const closed: Array<string> = []
      dialog.addEventListener('cancel', () => closed.push('cancel'))
      dialog.addEventListener('close', () => closed.push('close'))
      shadowRoot.appendChild(dialog)
      servedRoot?.setAttribute('data-foldkit-build', 'other-deployment')
      const application = makeClientApplication()

      await expect(
        Effect.runPromise(
          __startProgram(
            application,
            undefined,
            'Hydrate',
            undefined,
            BUILD_ID,
          ),
        ),
      ).rejects.toThrow('this client belongs to deployment')

      expect(dialog.open).toBe(true)
      expect(closed).toEqual([])
      expectContained(servedRoot)
    })
  }

  it('leaves an upgraded custom element connected while containing the page', async () => {
    // Containment marks an element the page already has. Wrapping the root
    // instead would reparent it, and every custom element in the subtree would
    // run disconnectedCallback and connectedCallback again, after the dialog
    // sweep had already run.
    const connections: Array<string> = []
    if (customElements.get('refusal-probe') === undefined) {
      customElements.define(
        'refusal-probe',
        class extends HTMLElement {
          connectedCallback(): void {
            connections.push('connected')
          }
          disconnectedCallback(): void {
            connections.push('disconnected')
          }
        },
      )
    }
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    servedRoot?.appendChild(document.createElement('refusal-probe'))
    servedRoot?.setAttribute('data-foldkit-build', 'other-deployment')
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('this client belongs to deployment')

    expect(connections).toEqual(['connected'])
    expectContained(servedRoot)
  })

  it('contains the page when a runtime id is claimed twice', async () => {
    // Two roots under one id are one application claimed twice, which the
    // runtime refuses while resolving the container. That refusal leaves the
    // same live markup behind as any later one.
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    if (servedRoot === null) {
      throw new Error('expected a served root')
    }
    document.body.appendChild(servedRoot.cloneNode(true))

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: nullContainer(),
      }),
    ).toThrow('more than one server-rendered root stamped')

    expectContained(servedRoot)
  })

  it('contains the page when distinct roots leave the container ambiguous', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    if (servedRoot === null) {
      throw new Error('expected a served root')
    }
    const other = servedRoot.cloneNode(true)
    if (other instanceof Element) {
      other.setAttribute('data-foldkit-app', 'other-application')
    }
    document.body.appendChild(other)

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: nullContainer(),
      }),
    ).toThrow('more than one page-owning application')

    expectContained(servedRoot)
  })

  it('contains the page when an explicit container selects one of two roots', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector<HTMLElement>('[data-foldkit-app]')
    if (servedRoot === null) {
      throw new Error('expected a served root')
    }
    const other = servedRoot.cloneNode(true)
    if (other instanceof Element) {
      other.setAttribute('data-foldkit-app', 'other-application')
    }
    document.body.appendChild(other)

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: servedRoot,
      }),
    ).toThrow('more than one page-owning application')

    expectContained(servedRoot)
  })

  it('contains the page when the root stamp is empty', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector<HTMLElement>('[data-foldkit-app]')
    servedRoot?.setAttribute('data-foldkit-app', '')

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: servedRoot,
      }),
    ).toThrow('nonempty runtime id')

    expectContained(servedRoot)
  })

  it('contains the page when its stamped root is inside a shadow tree', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector<HTMLElement>('[data-foldkit-app]')
    if (servedRoot === null) {
      throw new Error('expected a served root')
    }
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    document.body.appendChild(host)
    shadowRoot.appendChild(servedRoot)

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: servedRoot,
      }),
    ).toThrow('document light DOM')

    expectContained(servedRoot)
  })

  it('contains the page when an unstamped container is under a shadow-tree root', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector<HTMLElement>('[data-foldkit-app]')
    const container = servedRoot?.querySelector<HTMLElement>('#count')
    if (servedRoot === null || container == null) {
      throw new Error('expected a served root and descendant')
    }
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'closed' })
    document.body.appendChild(host)
    shadowRoot.appendChild(servedRoot)

    expect(() =>
      makeApplication({ Model, Flags, init, update, view, container }),
    ).toThrow('stamped root outside the document body light DOM')

    expectContained(servedRoot)
  })

  it('contains the document when an unstamped container is under a detached root', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector<HTMLElement>('[data-foldkit-app]')
    const container = servedRoot?.querySelector<HTMLElement>('#count')
    if (servedRoot === null || container == null) {
      throw new Error('expected a served root and descendant')
    }
    servedRoot.remove()

    expect(() =>
      makeApplication({ Model, Flags, init, update, view, container }),
    ).toThrow('stamped root outside the document body light DOM')

    expect(servedRoot.isConnected).toBe(false)
    expectContained(null)
  })

  it('contains a foreign document when its stamped root owns the container', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector<HTMLElement>('[data-foldkit-app]')
    if (servedRoot === null) {
      throw new Error('expected a served root')
    }
    const otherDocument = document.implementation.createHTMLDocument('other')
    const adoptedRoot = otherDocument.adoptNode(servedRoot)
    otherDocument.body.appendChild(adoptedRoot)
    const container = adoptedRoot.querySelector<HTMLElement>('#count')
    if (container === null) {
      throw new Error('expected a served descendant')
    }

    const showModal = vi
      .spyOn(HTMLDialogElement.prototype, 'showModal')
      .mockImplementation(() => {
        throw new DOMException('The document is not fully active')
      })
    try {
      expect(() =>
        makeApplication({ Model, Flags, init, update, view, container }),
      ).toThrow('another document')
    } finally {
      showModal.mockRestore()
    }

    expect(adoptedRoot.isConnected).toBe(true)
    expect(otherDocument.body.hasAttribute('inert')).toBe(true)
    expect(otherDocument.body.getAttribute('aria-hidden')).toBe('true')
    expect(otherDocument.body.hasAttribute('data-foldkit-refused')).toBe(true)
    const shield = otherDocument.querySelector<HTMLDialogElement>(
      ':root > dialog[data-foldkit-refusal-shield]',
    )
    expect(shield?.open).toBe(true)
  })

  it('contains the page when its stamped root is outside the body', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector<HTMLElement>('[data-foldkit-app]')
    if (servedRoot === null) {
      throw new Error('expected a served root')
    }
    document.head.appendChild(servedRoot)

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: servedRoot,
      }),
    ).toThrow('outside the document body')

    expectContained(servedRoot)
  })

  it('contains the page when the served root lost its stamp', async () => {
    // The shape a generated client has: `container` is
    // `document.getElementById('root')`, and template injection put the render
    // where that placeholder was. Strip the stamp and neither handle survives,
    // so the failure lands while the container is being resolved.
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    servedRoot?.removeAttribute('data-foldkit-app')

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: nullContainer(),
      }),
    ).toThrow('Container is null')

    expectContained(servedRoot)
  })

  it('leaves a page with no server render alone when the container is missing', async () => {
    // The same failure on a page a server never rendered is an application whose
    // container element does not exist. There is no served handoff to refuse and
    // nothing to take out of reach, so the page is left as it is.
    document.body.innerHTML = '<p>a client-only page</p>'

    expect(() =>
      makeApplication({
        Model,
        Flags,
        init,
        update,
        view,
        container: nullContainer(),
      }),
    ).toThrow('Container is null')

    expectNotContained()
  })

  it('leaves a page from its own build interactive', async () => {
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    const application = makeClientApplication()
    const fiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
    )

    try {
      await awaitBodyText('5')
      expect(servedRoot?.hasAttribute('inert')).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('refuses build skew before Schema decoding can fail on it', async () => {
    // Incompatible Flags used to fail decoding first, which left the served
    // page visible but inert and reported a Schema problem rather than the
    // deployment mismatch that caused it.
    await renderServerPage({ start: 5 })
    const servedRoot = document.querySelector('[data-foldkit-app]')
    servedRoot?.setAttribute('data-foldkit-build', 'other-deployment')
    const payloadScript = document.querySelector('script[data-foldkit-flags]')
    if (payloadScript === null) {
      throw new Error('expected a served Flags payload')
    }
    payloadScript.textContent = '{"unrelated":"shape"}'
    const application = makeClientApplication()

    await expect(
      Effect.runPromise(
        __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
      ),
    ).rejects.toThrow('this client belongs to deployment')
  })
})
