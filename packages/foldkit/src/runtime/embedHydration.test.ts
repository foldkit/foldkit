import { Effect, Fiber, Schema } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderToString } from '../experimental/server/server.js'
import type { Document, Html } from '../html/index.js'
import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Update from '../update/index.js'
import { makeApplication } from './makeApplication.js'
import { makeElement } from './makeElement.js'
import { __startProgram, embed } from './start.js'

const BUILD_ID = 'test-build-id'

const Message = defineMessageUnion({
  ClickedIncrement: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({ id: Schema.String, count: Schema.Number })
type Model = typeof Model.Type

const Flags = Schema.Struct({ id: Schema.String, start: Schema.Number })
type Flags = typeof Flags.Type

const h = __htmlBuilder<Message>()

const init = (flags: Flags): Update.Return<Model, Message> => ({
  model: Model.make({ id: flags.id, count: flags.start }),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: Model.make({ id: model.id, count: model.count + 1 }),
    }),
  })

const panelView = (model: Model): Html =>
  h.div(
    [h.Id(model.id)],
    [
      h.button(
        [h.Id(`${model.id}-bump`), h.OnClick(Message.ClickedIncrement())],
        ['+'],
      ),
      h.span([h.Id(`${model.id}-count`)], [String(model.count)]),
    ],
  )

const serverPanel = {
  Flags,
  init,
  view: (model: Model): Document => ({ title: '', body: panelView(model) }),
}

const ApplicationFlags = Schema.Struct({ start: Schema.Number })

const applicationView = (model: { readonly count: number }): Document => ({
  title: `App ${model.count}`,
  body: h.main(
    [h.Id('page')],
    [h.span([h.Id('page-count')], [`${model.count}`])],
  ),
})

const serverApplication = {
  Flags: ApplicationFlags,
  init: (flags: typeof ApplicationFlags.Type) => ({
    model: { count: flags.start },
  }),
  view: applicationView,
}

const renderPanel = async (id: string, start: number): Promise<string> => {
  const rendered = await Effect.runPromise(
    renderToString(serverPanel, {
      flags: { id, start },
      runtimeId: id,
      isEmbedded: true,
      buildId: BUILD_ID,
    }),
  )
  return rendered.html
}

const makePanel = (id: string, start: number) =>
  makeElement({
    Model,
    Flags,
    flags: Effect.succeed({ id, start }),
    init,
    update,
    view: panelView,
    container: document.getElementById(id),
  })

const text = (id: string): string | null =>
  document.getElementById(id)?.textContent ?? null

const click = (id: string): void => {
  document
    .getElementById(id)
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

afterEach(() => {
  document.body.innerHTML = ''
  document
    .querySelectorAll('[data-foldkit-refusal-shield]')
    .forEach(shield => shield.remove())
  document.body.inert = false
  document.body.removeAttribute('inert')
  document.body.removeAttribute('aria-hidden')
  document.body.removeAttribute('data-foldkit-refused')
})

describe('embed with isHydratable', () => {
  it('adopts two server roots on one page and keeps their nodes', async () => {
    document.body.innerHTML =
      (await renderPanel('panel-a', 5)) + (await renderPanel('panel-b', 9))

    const rootA = document.getElementById('panel-a')
    const rootB = document.getElementById('panel-b')
    const spanA = document.getElementById('panel-a-count')
    const spanB = document.getElementById('panel-b-count')
    expect(rootA?.hasAttribute('data-foldkit-embed')).toBe(true)
    expect(rootB?.hasAttribute('data-foldkit-embed')).toBe(true)

    const handleA = embed(makePanel('panel-a', 0), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-a', start: 0 }),
    })
    const handleB = embed(makePanel('panel-b', 0), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-b', start: 0 }),
    })

    try {
      await vi.waitFor(() => {
        expect(document.querySelector('[data-foldkit-app]')).toBeNull()
      })
      expect(document.getElementById('panel-a')).toBe(rootA)
      expect(document.getElementById('panel-b')).toBe(rootB)
      expect(document.getElementById('panel-a-count')).toBe(spanA)
      expect(document.getElementById('panel-b-count')).toBe(spanB)
      expect(document.querySelector('[data-foldkit-embed]')).toBeNull()
      expect(document.body.hasAttribute('inert')).toBe(false)

      click('panel-a-bump')
      await vi.waitFor(() => {
        expect(text('panel-a-count')).toBe('6')
      })
      expect(text('panel-b-count')).toBe('9')
      expect(document.getElementById('panel-a-count')).toBe(spanA)
    } finally {
      handleA.dispose()
      handleB.dispose()
    }
  })

  it('reads the Flags payload that belongs to its own root', async () => {
    document.body.innerHTML =
      (await renderPanel('panel-a', 5)) + (await renderPanel('panel-b', 9))

    // NOTE: the client Flags Effect disagrees with the payload on purpose. A
    // hydrating root must take the server value, not the client one.
    const handle = embed(makePanel('panel-b', 100), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-b', start: 100 }),
    })

    try {
      await vi.waitFor(() => {
        expect(document.querySelector('[data-foldkit-embed]')).not.toBeNull()
      })
      await vi.waitFor(() => {
        expect(
          document
            .getElementById('panel-b')
            ?.hasAttribute('data-foldkit-embed'),
        ).toBe(false)
      })
      expect(text('panel-b-count')).toBe('9')
      expect(text('panel-a-count')).toBe('5')
    } finally {
      handle.dispose()
    }
  })

  it('heals a mismatched text node in place', async () => {
    document.body.innerHTML = await renderPanel('panel-a', 5)
    const span = document.getElementById('panel-a-count')
    const textNode = span?.firstChild
    if (textNode) {
      textNode.textContent = 'tampered'
    }
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const handle = embed(makePanel('panel-a', 0), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-a', start: 0 }),
    })

    try {
      await vi.waitFor(() => {
        expect(text('panel-a-count')).toBe('5')
      })
      expect(document.getElementById('panel-a-count')).toBe(span)
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    } finally {
      handle.dispose()
    }
  })

  it('builds fresh when the container carries no stamp', async () => {
    const container = document.createElement('div')
    container.id = 'panel-a'
    document.body.appendChild(container)

    const handle = embed(makePanel('panel-a', 7), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-a', start: 7 }),
    })

    try {
      await vi.waitFor(() => {
        expect(text('panel-a-count')).toBe('7')
      })
      expect(document.body.hasAttribute('inert')).toBe(false)
    } finally {
      handle.dispose()
    }
  })

  it('builds fresh beside a stamped sibling that belongs to another program', async () => {
    document.body.innerHTML = await renderPanel('panel-a', 5)
    const container = document.createElement('div')
    container.id = 'panel-b'
    document.body.appendChild(container)
    const rootA = document.getElementById('panel-a')

    const handle = embed(makePanel('panel-b', 3), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-b', start: 3 }),
    })

    try {
      await vi.waitFor(() => {
        expect(text('panel-b-count')).toBe('3')
      })
      expect(document.getElementById('panel-a')).toBe(rootA)
      expect(rootA?.hasAttribute('data-foldkit-embed')).toBe(true)
    } finally {
      handle.dispose()
    }
  })

  it('coexists with a hydrated page-owning application', async () => {
    const renderedApplication = await Effect.runPromise(
      renderToString(serverApplication, {
        flags: { start: 2 },
        buildId: BUILD_ID,
      }),
    )
    document.body.innerHTML =
      renderedApplication.html + (await renderPanel('panel-a', 5))

    const pageRoot = document.getElementById('page')
    const pageCount = document.getElementById('page-count')
    const panelCount = document.getElementById('panel-a-count')

    const application = makeApplication({
      Model: Schema.Struct({ count: Schema.Number }),
      Flags: ApplicationFlags,
      init: serverApplication.init,
      update: (model: { readonly count: number }) => ({ model }),
      view: applicationView,
      container: document.getElementById('does-not-exist'),
    })
    const applicationFiber = Effect.runFork(
      __startProgram(application, undefined, 'Hydrate', undefined, BUILD_ID),
    )
    const handle = embed(makePanel('panel-a', 0), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-a', start: 0 }),
    })

    try {
      await vi.waitFor(() => {
        expect(document.title).toBe('App 2')
        expect(document.querySelector('[data-foldkit-app]')).toBeNull()
      })
      expect(document.body.hasAttribute('inert')).toBe(false)
      expect(document.getElementById('page')).toBe(pageRoot)
      expect(document.getElementById('page-count')).toBe(pageCount)
      expect(document.getElementById('panel-a-count')).toBe(panelCount)
      click('panel-a-bump')
      await vi.waitFor(() => {
        expect(text('panel-a-count')).toBe('6')
      })
    } finally {
      handle.dispose()
      await Effect.runPromise(Fiber.interrupt(applicationFiber))
    }
  })

  it('still refuses a second page-owning root', async () => {
    const first = await Effect.runPromise(
      renderToString(serverApplication, {
        flags: { start: 1 },
        buildId: BUILD_ID,
        runtimeId: 'one',
      }),
    )
    const second = await Effect.runPromise(
      renderToString(
        { ...serverApplication, view: applicationView },
        { flags: { start: 1 }, buildId: BUILD_ID, runtimeId: 'two' },
      ),
    )
    document.body.innerHTML = first.html + second.html

    expect(() =>
      makeApplication({
        Model: Schema.Struct({ count: Schema.Number }),
        Flags: ApplicationFlags,
        init: serverApplication.init,
        update: (model: { readonly count: number }) => ({ model }),
        view: applicationView,
        container: document.getElementById('does-not-exist'),
      }),
    ).toThrow(/more than one page-owning application/)
    expect(document.body.hasAttribute('inert')).toBe(true)
  })

  it('refuses the page when the root was served by another deployment', async () => {
    document.body.innerHTML = await renderPanel('panel-a', 5)
    const rootA = document.getElementById('panel-a')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const handle = embed(makePanel('panel-a', 0), {
      isHydratable: true,
      buildId: 'another-build-id',
      flags: Effect.succeed({ id: 'panel-a', start: 0 }),
    })

    try {
      await vi.waitFor(() => {
        expect(document.body.hasAttribute('inert')).toBe(true)
      })
      expect(document.getElementById('panel-a')).toBe(rootA)
      expect(text('panel-a-count')).toBe('5')
    } finally {
      handle.dispose()
    }
  })

  it('refuses a root stamped as page-owning', async () => {
    const rendered = await Effect.runPromise(
      renderToString(serverPanel, {
        flags: { id: 'panel-a', start: 5 },
        runtimeId: 'panel-a',
        buildId: BUILD_ID,
      }),
    )
    document.body.innerHTML = rendered.html
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const handle = embed(makePanel('panel-a', 0), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-a', start: 0 }),
    })

    try {
      await vi.waitFor(() => {
        expect(document.body.hasAttribute('inert')).toBe(true)
      })
    } finally {
      handle.dispose()
    }
  })

  it('refuses a root whose stamp is not its container id', async () => {
    const rendered = await Effect.runPromise(
      renderToString(serverPanel, {
        flags: { id: 'panel-a', start: 5 },
        runtimeId: 'other',
        isEmbedded: true,
        buildId: BUILD_ID,
      }),
    )
    document.body.innerHTML = rendered.html
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const handle = embed(makePanel('panel-a', 0), {
      isHydratable: true,
      buildId: BUILD_ID,
      flags: Effect.succeed({ id: 'panel-a', start: 0 }),
    })

    try {
      await vi.waitFor(() => {
        expect(document.body.hasAttribute('inert')).toBe(true)
      })
    } finally {
      handle.dispose()
    }
  })

  it('rebuilds a stamped container when isHydratable is off, as before', async () => {
    document.body.innerHTML = await renderPanel('panel-a', 5)
    const span = document.getElementById('panel-a-count')

    const handle = embed(makePanel('panel-a', 8), {
      flags: Effect.succeed({ id: 'panel-a', start: 8 }),
    })

    try {
      await vi.waitFor(() => {
        expect(text('panel-a-count')).toBe('8')
      })
      expect(document.getElementById('panel-a-count')).not.toBe(span)
    } finally {
      handle.dispose()
    }
  })

  it('throws for a program created by makeApplication', () => {
    const application = makeApplication({
      Model: Schema.Struct({ count: Schema.Number }),
      init: () => ({ model: { count: 0 } }),
      update: (model: { readonly count: number }) => ({ model }),
      view: applicationView,
      container: document.body.appendChild(document.createElement('div')),
    })
    expect(() => embed(application, { isHydratable: true })).toThrow(
      /only for a program created by makeElement/,
    )
  })
})
