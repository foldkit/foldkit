import { Match as M, Number, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type Document, __htmlBuilder } from '../html/index.js'
import { m } from '../message/index.js'
import { evo } from '../struct/index.js'
import { makeApplication, run } from './runtime.js'

const ClickedIncrement = m('ClickedIncrement')
const Message = S.Union([ClickedIncrement])
type Message = typeof Message.Type

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ClickedIncrement: () => [evo(model, { count: Number.increment }), []],
    }),
  )

const APP_TEXT = 'page-lifecycle-app-content'

const h = __htmlBuilder<Message>()

const view = (model: Model): Document => ({
  title: 'Page lifecycle test app',
  body: h.div(
    [h.Id('page-lifecycle-app')],
    [
      h.button([h.OnClick(ClickedIncrement())], ['increment']),
      `${APP_TEXT}:${model.count}`,
    ],
  ),
})

// NOTE: happy-dom has no `PageTransitionEvent` constructor, so the restore
// flag goes onto a plain `pageshow` Event. Spreading the Event into an object
// literal loses it: the fields are prototype accessors rather than own
// properties, and `dispatchEvent` rejects anything that is not an Event.
// Defining the property keeps the Event and needs no type assertion for a
// field `Event` does not declare.
const dispatchPageShow = (isRestoredFromBfcache: boolean): void => {
  const event = new Event('pageshow')
  Object.defineProperty(event, 'persisted', {
    value: isRestoredFromBfcache,
    configurable: true,
  })
  window.dispatchEvent(event)
}

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const clickIncrement = (): void => {
  const button = document.body.querySelector('button')
  expect(button).not.toBeNull()
  button?.click()
}

describe('run + page lifecycle events', () => {
  let container: HTMLElement
  let reloadSpy: ReturnType<typeof vi.spyOn>

  const runApp = (): void => {
    run(
      makeApplication({
        Model,
        init: () => [{ count: 0 }, []],
        update,
        view,
        container,
      }),
    )
  }

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'page-lifecycle-root'
    document.body.appendChild(container)
    reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
  })

  afterEach(() => {
    reloadSpy.mockRestore()
    document.body.innerHTML = ''
  })

  // NOTE: the browser fires `beforeunload` for navigations the document
  // survives, including a click on a download link. Tearing the runtime down
  // there would leave a live page with an empty container, so the runtime
  // starts with no page-lifecycle interrupt. Clicking after the event proves
  // the runtime is still driving the app, not just that the DOM has not been
  // emptied yet. Each `run` here outlives its test, since nothing interrupts a
  // page-owning runtime.
  it('keeps the app rendered and interactive after a beforeunload', async () => {
    runApp()

    await awaitBodyText(`${APP_TEXT}:0`)

    window.dispatchEvent(new Event('beforeunload'))

    clickIncrement()

    await awaitBodyText(`${APP_TEXT}:1`)
  })

  it('resumes with its Model when the page is restored from the back/forward cache', async () => {
    runApp()

    await awaitBodyText(`${APP_TEXT}:0`)

    clickIncrement()
    await awaitBodyText(`${APP_TEXT}:1`)

    window.dispatchEvent(new Event('beforeunload'))
    dispatchPageShow(true)

    expect(reloadSpy).not.toHaveBeenCalled()

    clickIncrement()

    await awaitBodyText(`${APP_TEXT}:2`)
  })
})
