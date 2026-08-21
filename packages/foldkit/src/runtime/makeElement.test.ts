import { Effect, Fiber, Number, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { TextDirection, __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { evo } from '../struct/index.js'
import {
  __setDevToolsOverlay,
  makeApplication,
  makeElement,
} from './runtime.js'

const Message = defineMessageUnion({
  Rendered: {},
  ClickedBump: {},
})
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command<Message>>
  outMessage?: never
}>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    Rendered: () => ({ model }),
    ClickedBump: () => ({ model: { label: 'world' } }),
  })

const LocaleModel = S.Struct({
  lang: S.String,
  dir: TextDirection,
  revision: S.Number,
})
type LocaleModel = typeof LocaleModel.Type

const ENGLISH_LTR = LocaleModel.make({ lang: 'en', dir: 'Ltr', revision: 0 })
const FRENCH_AUTO = LocaleModel.make({
  lang: 'fr-CA',
  dir: 'Auto',
  revision: 0,
})

const LocaleMessage = defineMessageUnion({
  ClickedArabic: {},
  ClickedRerender: {},
})
type LocaleMessage = typeof LocaleMessage.Type

const localeH = __htmlBuilder<LocaleMessage>()

type LocaleUpdateReturn = Readonly<{
  model: LocaleModel
  commands?: ReadonlyArray<Command<LocaleMessage>>
  outMessage?: never
}>

const localeUpdate = (model: LocaleModel, message: LocaleMessage) =>
  LocaleMessage.match<LocaleUpdateReturn>(message, {
    ClickedArabic: () => ({
      model: evo(model, { lang: () => 'ar', dir: () => 'Rtl' }),
    }),
    ClickedRerender: () => ({
      model: evo(model, { revision: Number.increment }),
    }),
  })

const HOST_TITLE = 'Host Page Title'
const HOST_LANG = 'en'

let container: HTMLElement

const removeHeadMetadata = (): void => {
  document.head.querySelectorAll('link[rel="canonical"]').forEach(node => {
    node.remove()
  })
  document.head.querySelectorAll('meta[property="og:url"]').forEach(node => {
    node.remove()
  })
}

const resetRootAttributes = (): void => {
  document.documentElement.lang = HOST_LANG
  document.documentElement.removeAttribute('dir')
}

beforeEach(() => {
  document.title = HOST_TITLE
  removeHeadMetadata()
  resetRootAttributes()
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  __setDevToolsOverlay(undefined)
  document.body.innerHTML = ''
  document.title = HOST_TITLE
  removeHeadMetadata()
  resetRootAttributes()
})

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const expectDocumentUntouched = (): void => {
  expect(document.title).toBe(HOST_TITLE)
  expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
  expect(document.documentElement.lang).toBe(HOST_LANG)
  expect(document.documentElement.hasAttribute('dir')).toBe(false)
}

describe('makeElement', () => {
  it('mounts a registered DevTools overlay when DevTools are active', async () => {
    const mountedOverlays: Array<string> = []
    __setDevToolsOverlay(() => {
      mountedOverlays.push('registered')
      return Effect.void
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => h.div([], [model.label]),
      container,
      devTools: { show: 'Always' },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await vi.waitFor(() => {
        expect(mountedOverlays).toEqual(['registered'])
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('renders into its container without touching the document head', async () => {
    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => h.div([], [model.label]),
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('hello')
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('leaves the document head untouched across re-renders', async () => {
    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model =>
        h.div(
          [],
          [h.button([h.OnClick(Message.ClickedBump())], ['bump']), model.label],
        ),
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('hello')

      const button = document.body.querySelector('button')
      expect(button).not.toBeNull()
      button?.click()

      await awaitBodyText('world')
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('seeds the initial model from flags', async () => {
    const Flags = S.Struct({ initialLabel: S.String })

    const element = makeElement({
      Model,
      Flags,
      flags: Effect.succeed({ initialLabel: 'from-flags' }),
      init: flags => ({ model: { label: flags.initialLabel } }),
      update,
      view: model => h.div([], [model.label]),
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('from-flags')
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('renders a scoped crash view without touching the document head', async () => {
    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: () => {
        throw new Error('boom from view')
      },
      crash: {
        view: () => h.div([], ['Crashed Widget']),
      },
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('Crashed Widget')
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})

describe('makeApplication', () => {
  it('owns the document head, applying title and canonical metadata', async () => {
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(document.title).toBe('hello')
      expect(
        document.head.querySelector('link[rel="canonical"]'),
      ).not.toBeNull()
      expect(
        document.head.querySelector('meta[property="og:url"]'),
      ).not.toBeNull()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reuses metadata elements and reasserts externally changed values', async () => {
    const canonicalUrl = 'https://example.com/todos'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        canonical: canonicalUrl,
        ogUrl: canonicalUrl,
        body: h.div(
          [],
          [h.button([h.OnClick(Message.ClickedBump())], ['bump']), model.label],
        ),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')
      const canonical = document.head.querySelector('link[rel="canonical"]')
      const ogUrl = document.head.querySelector('meta[property="og:url"]')
      const button = document.body.querySelector('button')
      expect(canonical).toBeInstanceOf(HTMLLinkElement)
      expect(ogUrl).toBeInstanceOf(HTMLMetaElement)
      expect(button).not.toBeNull()
      if (
        !(canonical instanceof HTMLLinkElement) ||
        !(ogUrl instanceof HTMLMetaElement) ||
        button === null
      ) {
        throw new Error('expected application metadata and button')
      }

      const querySelectorSpy = vi.spyOn(document.head, 'querySelector')
      const canonicalSetAttributeSpy = vi.spyOn(canonical, 'setAttribute')
      const ogUrlSetAttributeSpy = vi.spyOn(ogUrl, 'setAttribute')
      try {
        button.click()
        await awaitBodyText('world')

        expect(querySelectorSpy).not.toHaveBeenCalled()
        expect(canonicalSetAttributeSpy).not.toHaveBeenCalled()
        expect(ogUrlSetAttributeSpy).not.toHaveBeenCalled()

        canonical.setAttribute('href', 'https://example.com/changed')
        ogUrl.setAttribute('content', 'https://example.com/changed')
        canonicalSetAttributeSpy.mockClear()
        ogUrlSetAttributeSpy.mockClear()

        button.click()
        await vi.waitFor(() => {
          expect(canonical.getAttribute('href')).toBe(canonicalUrl)
          expect(ogUrl.getAttribute('content')).toBe(canonicalUrl)
        })

        expect(querySelectorSpy).not.toHaveBeenCalled()
        expect(canonicalSetAttributeSpy).toHaveBeenCalledWith(
          'href',
          canonicalUrl,
        )
        expect(ogUrlSetAttributeSpy).toHaveBeenCalledWith(
          'content',
          canonicalUrl,
        )
      } finally {
        querySelectorSpy.mockRestore()
        canonicalSetAttributeSpy.mockRestore()
        ogUrlSetAttributeSpy.mockRestore()
      }
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('applies lang and dir to the html element', async () => {
    const application = makeApplication({
      Model: LocaleModel,
      init: () => ({ model: FRENCH_AUTO }),
      update: localeUpdate,
      view: model => ({
        title: 'Localized',
        lang: model.lang,
        dir: model.dir,
        body: localeH.div([], ['bonjour']),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('bonjour')

      expect(document.documentElement.lang).toBe('fr-CA')
      expect(document.documentElement.dir).toBe('auto')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('leaves lang and dir alone when the view omits them', async () => {
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(document.documentElement.lang).toBe(HOST_LANG)
      expect(document.documentElement.hasAttribute('dir')).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('applies lang without touching dir when the view sets only one', async () => {
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        lang: 'ja',
        body: h.div([], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(document.documentElement.lang).toBe('ja')
      expect(document.documentElement.hasAttribute('dir')).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('tracks lang and dir across renders, and reasserts them on a later render that leaves both unchanged', async () => {
    const application = makeApplication({
      Model: LocaleModel,
      init: () => ({ model: ENGLISH_LTR }),
      update: localeUpdate,
      view: model => ({
        title: 'Localized',
        lang: model.lang,
        dir: model.dir,
        body: localeH.div(
          [],
          [
            localeH.button(
              [localeH.OnClick(LocaleMessage.ClickedArabic())],
              ['arabic'],
            ),
            localeH.button(
              [localeH.OnClick(LocaleMessage.ClickedRerender())],
              ['rerender'],
            ),
            `${model.lang}-${model.revision}`,
          ],
        ),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('en-0')
      expect(document.documentElement.lang).toBe('en')
      expect(document.documentElement.dir).toBe('ltr')

      const buttons = document.body.querySelectorAll('button')
      const arabicButton = buttons.item(0)
      const rerenderButton = buttons.item(1)
      if (arabicButton === null || rerenderButton === null) {
        throw new Error('expected the arabic and rerender buttons')
      }

      arabicButton.click()
      await awaitBodyText('ar-0')
      expect(document.documentElement.lang).toBe('ar')
      expect(document.documentElement.dir).toBe('rtl')

      document.documentElement.lang = 'de'
      document.documentElement.dir = 'ltr'

      rerenderButton.click()
      await awaitBodyText('ar-1')
      expect(document.documentElement.lang).toBe('ar')
      expect(document.documentElement.dir).toBe('rtl')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
