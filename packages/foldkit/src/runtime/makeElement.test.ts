import { Effect, Fiber, Match as M, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { html } from '../html/index.js'
import { m } from '../message/index.js'
import { makeApplication, makeElement } from './runtime.js'

const Rendered = m('Rendered')
const ClickedBump = m('ClickedBump')
const Message = S.Union([Rendered, ClickedBump])
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

const h = html<Message>()

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      Rendered: () => [model, []],
      ClickedBump: () => [{ label: 'world' }, []],
    }),
  )

const HOST_TITLE = 'Host Page Title'

let container: HTMLElement

const removeHeadMetadata = (): void => {
  document.head.querySelectorAll('link[rel="canonical"]').forEach(node => {
    node.remove()
  })
  document.head.querySelectorAll('meta[property="og:url"]').forEach(node => {
    node.remove()
  })
}

beforeEach(() => {
  document.title = HOST_TITLE
  removeHeadMetadata()
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
  document.title = HOST_TITLE
  removeHeadMetadata()
})

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const expectHeadUntouched = (): void => {
  expect(document.title).toBe(HOST_TITLE)
  expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
}

describe('makeElement', () => {
  it('renders into its container without touching the document head', async () => {
    const element = makeElement({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model => h.div([], [model.label]),
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('hello')
      expectHeadUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('leaves the document head untouched across re-renders', async () => {
    const element = makeElement({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model =>
        h.div(
          [],
          [h.button([h.OnClick(ClickedBump())], ['bump']), model.label],
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
      expectHeadUntouched()
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
      init: flags => [{ label: flags.initialLabel }, []],
      update,
      view: model => h.div([], [model.label]),
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('from-flags')
      expectHeadUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('renders a scoped crash view without touching the document head', async () => {
    const element = makeElement({
      Model,
      init: () => [{ label: 'hello' }, []],
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
      expectHeadUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})

describe('makeApplication', () => {
  it('owns the document head, applying title and canonical metadata', async () => {
    const application = makeApplication({
      Model,
      init: () => [{ label: 'hello' }, []],
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
})
