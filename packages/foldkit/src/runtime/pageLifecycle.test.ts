import { Number, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type Document, __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { makeApplication } from './makeApplication.js'
import { run } from './start.js'

const Message = defineMessageUnion({
  ClickedIncrement: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
  })

const APP_TEXT = 'page-lifecycle-app-content'

const h = __htmlBuilder<Message>()

const view = (model: Model): Document => ({
  title: 'Page lifecycle test app',
  body: h.div(
    [h.Id('page-lifecycle-app')],
    [
      h.button([h.OnClick(Message.ClickedIncrement())], ['increment']),
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

const dispatchPageHide = (isEnteringBfcache: boolean): void => {
  const event = new Event('pagehide')
  Object.defineProperty(event, 'persisted', {
    value: isEnteringBfcache,
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

const awaitPageLifecycleHandling = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

describe('run + page lifecycle events', () => {
  let container: HTMLElement
  let reloadSpy: ReturnType<typeof vi.spyOn>

  const runApp = (): void => {
    run(
      makeApplication({
        Model,
        init: () => ({ model: { count: 0 } }),
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

  afterEach(async () => {
    dispatchPageHide(false)
    await vi.waitFor(() => {
      expect(document.body.textContent).not.toContain(APP_TEXT)
    })
    reloadSpy.mockRestore()
    document.body.innerHTML = ''
  })

  // NOTE: the browser fires `beforeunload` for navigations the document
  // survives, including a click on a download link. BrowserRuntime listens to
  // `pagehide` instead, so clicking after `beforeunload` proves the runtime is
  // still driving the app, not just that the DOM has not been emptied yet.
  it('keeps the app rendered and interactive after a beforeunload', async () => {
    runApp()

    await awaitBodyText(`${APP_TEXT}:0`)

    window.dispatchEvent(new Event('beforeunload'))
    await awaitPageLifecycleHandling()

    clickIncrement()

    await awaitBodyText(`${APP_TEXT}:1`)
  })

  it('resumes with its Model when the page is restored from the back/forward cache', async () => {
    runApp()

    await awaitBodyText(`${APP_TEXT}:0`)

    clickIncrement()
    await awaitBodyText(`${APP_TEXT}:1`)

    window.dispatchEvent(new Event('beforeunload'))
    dispatchPageHide(true)
    await awaitPageLifecycleHandling()
    dispatchPageShow(true)

    expect(reloadSpy).not.toHaveBeenCalled()

    clickIncrement()

    await awaitBodyText(`${APP_TEXT}:2`)
  })

  it('tears down when a pagehide discards the document', async () => {
    runApp()

    await awaitBodyText(`${APP_TEXT}:0`)

    dispatchPageHide(false)

    await vi.waitFor(() => {
      expect(document.body.textContent).not.toContain(APP_TEXT)
    })
  })
})
