import { Array, Effect, Fiber, Number, Option, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ColorScheme,
  type Document,
  TextDirection,
  __htmlBuilder,
} from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { __setDevToolsOverlay } from './devToolsConfig.js'
import { makeApplication } from './makeApplication.js'
import { makeElement } from './makeElement.js'

const Message = defineMessageUnion({
  Rendered: {},
  ClickedBump: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({ label: Schema.String })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    Rendered: () => ({ model }),
    ClickedBump: () => ({ model: { label: 'world' } }),
  })

const LocaleModel = Schema.Struct({
  lang: Schema.String,
  dir: TextDirection,
  revision: Schema.Number,
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

const localeUpdate = (model: LocaleModel, message: LocaleMessage) =>
  LocaleMessage.match<Update.Return<LocaleModel, LocaleMessage>>(message, {
    ClickedArabic: () => ({
      model: modifyFields(model, { lang: () => 'ar', dir: () => 'Rtl' }),
    }),
    ClickedRerender: () => ({
      model: modifyFields(model, { revision: Number.increment }),
    }),
  })

const COLOR_SCHEME_CONTENTS: ReadonlyArray<
  Readonly<{ colorScheme: ColorScheme; content: string }>
> = [
  { colorScheme: 'Normal', content: 'normal' },
  { colorScheme: 'Light', content: 'light' },
  { colorScheme: 'Dark', content: 'dark' },
  { colorScheme: 'LightDark', content: 'light dark' },
  { colorScheme: 'DarkLight', content: 'dark light' },
  { colorScheme: 'OnlyLight', content: 'only light' },
  { colorScheme: 'OnlyDark', content: 'only dark' },
]

const ColorSchemeModel = Schema.Struct({
  maybeColorScheme: Schema.Option(ColorScheme),
  revision: Schema.Number,
})
type ColorSchemeModel = typeof ColorSchemeModel.Type

const ColorSchemeMessage = defineMessageUnion({
  ClickedColorScheme: { colorScheme: ColorScheme },
  ClickedClearColorScheme: {},
  ClickedRerender: {},
})
type ColorSchemeMessage = typeof ColorSchemeMessage.Type

const colorSchemeH = __htmlBuilder<ColorSchemeMessage>()

const colorSchemeUpdate = (
  model: ColorSchemeModel,
  message: ColorSchemeMessage,
) =>
  ColorSchemeMessage.match<Update.Return<ColorSchemeModel, ColorSchemeMessage>>(
    message,
    {
      ClickedColorScheme: ({ colorScheme }) => ({
        model: modifyFields(model, {
          maybeColorScheme: () => Option.some(colorScheme),
        }),
      }),
      ClickedClearColorScheme: () => ({
        model: modifyFields(model, { maybeColorScheme: () => Option.none() }),
      }),
      ClickedRerender: () => ({
        model: modifyFields(model, { revision: Number.increment }),
      }),
    },
  )

const colorSchemeView = (model: ColorSchemeModel): Document => ({
  title: 'Color scheme',
  ...Option.match(model.maybeColorScheme, {
    onNone: () => ({}),
    onSome: colorScheme => ({ colorScheme }),
  }),
  body: colorSchemeH.div(
    [],
    [
      ...Array.map(COLOR_SCHEME_CONTENTS, ({ colorScheme }) =>
        colorSchemeH.button(
          [
            colorSchemeH.Id(colorScheme),
            colorSchemeH.OnClick(
              ColorSchemeMessage.ClickedColorScheme({ colorScheme }),
            ),
          ],
          [colorScheme],
        ),
      ),
      colorSchemeH.button(
        [
          colorSchemeH.Id('clear'),
          colorSchemeH.OnClick(ColorSchemeMessage.ClickedClearColorScheme()),
        ],
        ['clear'],
      ),
      colorSchemeH.button(
        [
          colorSchemeH.Id('rerender'),
          colorSchemeH.OnClick(ColorSchemeMessage.ClickedRerender()),
        ],
        ['rerender'],
      ),
      `state:${Option.getOrElse(model.maybeColorScheme, () => 'None')}-${model.revision}`,
    ],
  ),
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
  document.head.querySelectorAll('meta[name="color-scheme"]').forEach(node => {
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

const clickButton = (id: string): void => {
  const button = document.getElementById(id)
  if (button === null) {
    throw new Error(`expected the ${id} button`)
  }
  button.click()
}

const startColorSchemeApplication = (
  maybeColorScheme: Option.Option<ColorScheme>,
) =>
  Effect.runFork(
    makeApplication({
      Model: ColorSchemeModel,
      init: () => ({
        model: ColorSchemeModel.make({ maybeColorScheme, revision: 0 }),
      }),
      update: colorSchemeUpdate,
      view: colorSchemeView,
      container,
    }).start(),
  )

const colorSchemeMetas = (): ReadonlyArray<Element> =>
  Array.fromIterable(
    document.head.querySelectorAll('meta[name="color-scheme"]'),
  )

const headColorSchemeContents = (): ReadonlyArray<string | null> =>
  Array.map(colorSchemeMetas(), meta => meta.getAttribute('content'))

const appendServedColorScheme = (
  name: string,
  content: string,
): HTMLMetaElement => {
  const served = document.createElement('meta')
  served.setAttribute('name', name)
  served.setAttribute('content', content)
  return document.head.appendChild(served)
}

const expectDocumentUntouched = (): void => {
  expect(document.title).toBe(HOST_TITLE)
  expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
  expect(document.head.querySelector('meta[name="color-scheme"]')).toBeNull()
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
    const Flags = Schema.Struct({ initialLabel: Schema.String })

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
  it('sets the title without creating omitted head metadata', async () => {
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
      expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
      expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
      expect(
        document.head.querySelector('meta[name="color-scheme"]'),
      ).toBeNull()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('preserves served canonical metadata when omitted after a location change', async () => {
    const servedUrl = 'https://example.com/served'
    const canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    canonical.setAttribute('href', servedUrl)
    const ogUrl = document.createElement('meta')
    ogUrl.setAttribute('property', 'og:url')
    ogUrl.setAttribute('content', servedUrl)
    document.head.append(canonical, ogUrl)
    const originalHref = window.location.href
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        body: h.button([h.OnClick(Message.ClickedBump())], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')
      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected application button')
      }

      history.pushState(null, '', new URL('/next?utm_source=x', originalHref))
      button.click()
      await awaitBodyText('world')

      expect(canonical.getAttribute('href')).toBe(servedUrl)
      expect(ogUrl.getAttribute('content')).toBe(servedUrl)
      expect(
        document.head.querySelectorAll('link[rel="canonical"]'),
      ).toHaveLength(1)
      expect(
        document.head.querySelectorAll('meta[property="og:url"]'),
      ).toHaveLength(1)
    } finally {
      history.replaceState(null, '', originalHref)
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('uses canonical as og:url when ogUrl is omitted', async () => {
    const canonicalUrl = 'https://example.com/todos'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        canonical: canonicalUrl,
        body: h.div([], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(
        document.head
          .querySelector('link[rel="canonical"]')
          ?.getAttribute('href'),
      ).toBe(canonicalUrl)
      expect(
        document.head
          .querySelector('meta[property="og:url"]')
          ?.getAttribute('content'),
      ).toBe(canonicalUrl)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('sets og:url independently without changing an omitted canonical', async () => {
    const servedUrl = 'https://example.com/served'
    const canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    canonical.setAttribute('href', servedUrl)
    document.head.append(canonical)
    const shareUrl = 'https://example.com/share/todos'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        ogUrl: shareUrl,
        body: h.div([], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(
        document.head
          .querySelector('meta[property="og:url"]')
          ?.getAttribute('content'),
      ).toBe(shareUrl)
      expect(canonical.getAttribute('href')).toBe(servedUrl)
      expect(
        document.head.querySelectorAll('link[rel="canonical"]'),
      ).toHaveLength(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('restores served canonical metadata after a later omission', async () => {
    const servedUrl = 'https://example.com/served'
    const canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    canonical.setAttribute('href', servedUrl)
    const ogUrl = document.createElement('meta')
    ogUrl.setAttribute('property', 'og:url')
    ogUrl.setAttribute('content', servedUrl)
    document.head.append(canonical, ogUrl)
    const projectUrl = 'https://example.com/projects/hello'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        ...(model.label === 'hello' ? { canonical: projectUrl } : {}),
        body: h.button([h.OnClick(Message.ClickedBump())], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')
      expect(canonical.getAttribute('href')).toBe(projectUrl)
      expect(ogUrl.getAttribute('content')).toBe(projectUrl)

      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected application button')
      }
      button.click()
      await awaitBodyText('world')

      expect(canonical.getAttribute('href')).toBe(servedUrl)
      expect(ogUrl.getAttribute('content')).toBe(servedUrl)
      expect(
        document.head.querySelectorAll('link[rel="canonical"]'),
      ).toHaveLength(1)
      expect(
        document.head.querySelectorAll('meta[property="og:url"]'),
      ).toHaveLength(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('removes runtime-created canonical metadata after a later omission', async () => {
    const projectUrl = 'https://example.com/projects/hello'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        ...(model.label === 'hello' ? { canonical: projectUrl } : {}),
        body: h.button([h.OnClick(Message.ClickedBump())], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')
      expect(
        document.head
          .querySelector('link[rel="canonical"]')
          ?.getAttribute('href'),
      ).toBe(projectUrl)
      expect(
        document.head
          .querySelector('meta[property="og:url"]')
          ?.getAttribute('content'),
      ).toBe(projectUrl)

      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected application button')
      }
      button.click()
      await awaitBodyText('world')

      expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
      expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('removes a runtime-written href that was absent from the served canonical', async () => {
    const canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.append(canonical)
    const projectUrl = 'https://example.com/projects/hello'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        ...(model.label === 'hello' ? { canonical: projectUrl } : {}),
        body: h.button([h.OnClick(Message.ClickedBump())], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')
      expect(canonical.getAttribute('href')).toBe(projectUrl)

      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected application button')
      }
      button.click()
      await awaitBodyText('world')

      expect(canonical.hasAttribute('href')).toBe(false)
      expect(
        document.head.querySelectorAll('link[rel="canonical"]'),
      ).toHaveLength(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('does not recreate an externally removed canonical after omission', async () => {
    const projectUrl = 'https://example.com/projects/hello'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        ...(model.label === 'hello' ? { canonical: projectUrl } : {}),
        body: h.button([h.OnClick(Message.ClickedBump())], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')
      const canonical = document.head.querySelector('link[rel="canonical"]')
      if (canonical === null) {
        throw new Error('expected the canonical the runtime created')
      }
      canonical.remove()

      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected application button')
      }
      button.click()
      await awaitBodyText('world')

      expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
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
        title: 'Metadata test',
        colorScheme: 'Dark',
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
      const colorScheme = document.head.querySelector(
        'meta[name="color-scheme"]',
      )
      const button = document.body.querySelector('button')
      expect(canonical).toBeInstanceOf(HTMLLinkElement)
      expect(ogUrl).toBeInstanceOf(HTMLMetaElement)
      expect(colorScheme).toBeInstanceOf(HTMLMetaElement)
      expect(button).not.toBeNull()
      if (
        !(canonical instanceof HTMLLinkElement) ||
        !(ogUrl instanceof HTMLMetaElement) ||
        !(colorScheme instanceof HTMLMetaElement) ||
        button === null
      ) {
        throw new Error('expected application metadata and button')
      }

      const querySelectorSpy = vi.spyOn(document.head, 'querySelector')
      const querySelectorAllSpy = vi.spyOn(document.head, 'querySelectorAll')
      const canonicalGetAttributeSpy = vi.spyOn(canonical, 'getAttribute')
      const ogUrlGetAttributeSpy = vi.spyOn(ogUrl, 'getAttribute')
      const colorSchemeGetAttributeSpy = vi.spyOn(colorScheme, 'getAttribute')
      const canonicalSetAttributeSpy = vi.spyOn(canonical, 'setAttribute')
      const ogUrlSetAttributeSpy = vi.spyOn(ogUrl, 'setAttribute')
      const colorSchemeSetAttributeSpy = vi.spyOn(colorScheme, 'setAttribute')
      try {
        button.click()
        await awaitBodyText('world')

        expect(querySelectorSpy).not.toHaveBeenCalled()
        expect(querySelectorAllSpy).not.toHaveBeenCalled()
        expect(canonicalGetAttributeSpy).not.toHaveBeenCalled()
        expect(ogUrlGetAttributeSpy).not.toHaveBeenCalled()
        expect(colorSchemeGetAttributeSpy).not.toHaveBeenCalled()
        expect(canonicalSetAttributeSpy).not.toHaveBeenCalled()
        expect(ogUrlSetAttributeSpy).not.toHaveBeenCalled()
        expect(colorSchemeSetAttributeSpy).not.toHaveBeenCalled()

        canonical.setAttribute('href', 'https://example.com/changed')
        ogUrl.setAttribute('content', 'https://example.com/changed')
        colorScheme.setAttribute('content', 'light')
        canonicalSetAttributeSpy.mockClear()
        ogUrlSetAttributeSpy.mockClear()
        colorSchemeSetAttributeSpy.mockClear()

        button.click()
        await vi.waitFor(() => {
          expect(canonical.getAttribute('href')).toBe(canonicalUrl)
          expect(ogUrl.getAttribute('content')).toBe(canonicalUrl)
          expect(colorScheme.getAttribute('content')).toBe('dark')
        })

        expect(querySelectorSpy).not.toHaveBeenCalled()
        expect(querySelectorAllSpy).not.toHaveBeenCalled()
        expect(canonicalSetAttributeSpy).toHaveBeenCalledWith(
          'href',
          canonicalUrl,
        )
        expect(ogUrlSetAttributeSpy).toHaveBeenCalledWith(
          'content',
          canonicalUrl,
        )
        expect(colorSchemeSetAttributeSpy).toHaveBeenCalledWith(
          'content',
          'dark',
        )
      } finally {
        querySelectorSpy.mockRestore()
        querySelectorAllSpy.mockRestore()
        canonicalGetAttributeSpy.mockRestore()
        ogUrlGetAttributeSpy.mockRestore()
        colorSchemeGetAttributeSpy.mockRestore()
        canonicalSetAttributeSpy.mockRestore()
        ogUrlSetAttributeSpy.mockRestore()
        colorSchemeSetAttributeSpy.mockRestore()
      }
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('rebuilds document metadata after the head is replaced', async () => {
    const canonicalUrl = 'https://example.com/replaced-head'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: 'Metadata test',
        colorScheme: 'Dark',
        canonical: canonicalUrl,
        ogUrl: canonicalUrl,
        body: h.button([h.OnClick(Message.ClickedBump())], [model.label]),
      }),
      container,
    })
    const fiber = Effect.runFork(application.start())
    const originalHead = document.head

    try {
      await awaitBodyText('hello')
      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected application button')
      }

      originalHead.replaceWith(document.createElement('head'))
      button.click()

      await vi.waitFor(() => {
        expect(document.title).toBe('Metadata test')
        expect(
          document.head
            .querySelector('link[rel="canonical"]')
            ?.getAttribute('href'),
        ).toBe(canonicalUrl)
        expect(
          document.head
            .querySelector('meta[property="og:url"]')
            ?.getAttribute('content'),
        ).toBe(canonicalUrl)
        expect(headColorSchemeContents()).toEqual(['dark'])
      })
    } finally {
      if (document.head !== originalHead) {
        document.head.replaceWith(originalHead)
      }
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

  it('writes the color scheme to a color-scheme meta and follows the Model', async () => {
    const fiber = startColorSchemeApplication(Option.some('Dark'))

    try {
      await awaitBodyText('state:Dark-0')
      expect(headColorSchemeContents()).toEqual(['dark'])

      clickButton('Light')
      await awaitBodyText('state:Light-0')
      expect(headColorSchemeContents()).toEqual(['light'])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('writes every color scheme as its content value', async () => {
    const fiber = startColorSchemeApplication(Option.none())

    try {
      await awaitBodyText('state:None-0')

      for (const { colorScheme, content } of COLOR_SCHEME_CONTENTS) {
        clickButton(colorScheme)
        await awaitBodyText(`state:${colorScheme}-0`)
        expect(headColorSchemeContents()).toEqual([content])
      }
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('updates a served color-scheme meta in place', async () => {
    const served = appendServedColorScheme('color-scheme', 'light dark')
    const fiber = startColorSchemeApplication(Option.some('Dark'))

    try {
      await awaitBodyText('state:Dark-0')
      expect(colorSchemeMetas()).toEqual([served])
      expect(served.getAttribute('content')).toBe('dark')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('restores the served color scheme after a later omission', async () => {
    const served = appendServedColorScheme('color-scheme', 'light dark')
    const fiber = startColorSchemeApplication(Option.some('Dark'))

    try {
      await awaitBodyText('state:Dark-0')
      expect(served.getAttribute('content')).toBe('dark')

      clickButton('clear')
      await awaitBodyText('state:None-0')
      expect(colorSchemeMetas()).toEqual([served])
      expect(served.getAttribute('content')).toBe('light dark')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('removes a runtime-created color-scheme meta after a later omission', async () => {
    const fiber = startColorSchemeApplication(Option.some('Dark'))

    try {
      await awaitBodyText('state:Dark-0')
      expect(headColorSchemeContents()).toEqual(['dark'])

      clickButton('clear')
      await awaitBodyText('state:None-0')
      expect(colorSchemeMetas()).toEqual([])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('leaves a served color-scheme meta untouched when the view never supplies it', async () => {
    const served = appendServedColorScheme('color-scheme', 'light dark')
    const fiber = startColorSchemeApplication(Option.none())

    try {
      await awaitBodyText('state:None-0')
      clickButton('rerender')
      await awaitBodyText('state:None-1')

      expect(colorSchemeMetas()).toEqual([served])
      expect(served.getAttribute('content')).toBe('light dark')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reuses a served color-scheme meta whose name differs in case', async () => {
    const served = appendServedColorScheme('Color-Scheme', 'light')
    const fiber = startColorSchemeApplication(Option.some('Dark'))

    try {
      await awaitBodyText('state:Dark-0')
      expect(document.head.querySelectorAll('meta')).toHaveLength(1)
      expect(served.getAttribute('name')).toBe('color-scheme')
      expect(served.getAttribute('content')).toBe('dark')
    } finally {
      served.remove()
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reuses served canonical metadata whose identity differs in case', async () => {
    const servedUrl = 'https://example.com/served'
    const canonical = document.createElement('link')
    canonical.setAttribute('rel', 'Canonical')
    canonical.setAttribute('href', servedUrl)
    const ogUrl = document.createElement('meta')
    ogUrl.setAttribute('property', 'OG:URL')
    ogUrl.setAttribute('content', servedUrl)
    document.head.append(canonical, ogUrl)
    const projectUrl = 'https://example.com/projects/hello'
    const application = makeApplication({
      Model,
      init: () => ({ model: { label: 'hello' } }),
      update,
      view: model => ({
        title: model.label,
        canonical: projectUrl,
        body: h.div([], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(document.head.querySelectorAll('link')).toHaveLength(1)
      expect(document.head.querySelectorAll('meta')).toHaveLength(1)
      expect(canonical.getAttribute('rel')).toBe('canonical')
      expect(canonical.getAttribute('href')).toBe(projectUrl)
      expect(ogUrl.getAttribute('property')).toBe('og:url')
      expect(ogUrl.getAttribute('content')).toBe(projectUrl)
    } finally {
      canonical.remove()
      ogUrl.remove()
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reasserts the color scheme after another script changes its content or name', async () => {
    const fiber = startColorSchemeApplication(Option.some('Dark'))

    try {
      await awaitBodyText('state:Dark-0')
      const colorScheme = Option.getOrThrowWith(
        Array.head(colorSchemeMetas()),
        () => new Error('expected the color-scheme meta the runtime created'),
      )

      colorScheme.setAttribute('content', 'light')
      clickButton('rerender')
      await awaitBodyText('state:Dark-1')
      expect(colorSchemeMetas()).toEqual([colorScheme])
      expect(colorScheme.getAttribute('content')).toBe('dark')

      colorScheme.setAttribute('name', 'theme-color')
      clickButton('rerender')
      await awaitBodyText('state:Dark-2')
      expect(colorSchemeMetas()).toEqual([colorScheme])
      expect(colorScheme.getAttribute('content')).toBe('dark')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
