import { Match as M, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type Document, html } from '../html/index.js'
import { m } from '../message/index.js'
import { evo } from '../struct/index.js'
import { makeApplication, run } from './runtime.js'

const Incremented = m('Incremented')
const Message = S.Union([Incremented])
type Message = typeof Message.Type

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tag('Incremented', () => [evo(model, { count: count => count + 1 }), []]),
    M.exhaustive,
  )

const APP_TEXT = 'bfcache-app-content'

const h = html<Message>()

const view = (model: Model): Document => ({
  title: 'Bfcache test app',
  body: h.div([h.Id('bfcache-app')], [`${APP_TEXT}:${model.count}`]),
})

const dispatchPageShow = (isRestoredFromBfcache: boolean): void => {
  const event = new Event('pageshow')
  Object.defineProperty(event, 'persisted', {
    value: isRestoredFromBfcache,
    configurable: true,
  })
  window.dispatchEvent(event)
}

describe('run + back/forward cache restore', () => {
  let container: HTMLElement
  let reloadSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'bfcache-root'
    document.body.appendChild(container)
    reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
  })

  afterEach(() => {
    reloadSpy.mockRestore()
    document.body.innerHTML = ''
  })

  // NOTE: `BrowserRuntime.runMain` interrupts the runtime on `beforeunload`,
  // which is when the browser freezes the page into the back/forward cache.
  // The interrupt empties the container, so the restore listener must outlive
  // the runtime scope for the `pageshow` restore to reload the page. Waiting
  // for the container to blank confirms the interrupt finalizers have run
  // before the restore is dispatched.
  it('reloads when restored after the beforeunload interrupt blanks the page', async () => {
    run(
      makeApplication({
        Model,
        init: () => [{ count: 0 }, []],
        update,
        view,
        container,
      }),
    )

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain(`${APP_TEXT}:0`)
    })

    window.dispatchEvent(new Event('beforeunload'))

    await vi.waitFor(() => {
      expect(document.body.textContent).not.toContain(`${APP_TEXT}:0`)
    })

    dispatchPageShow(true)

    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })
})
