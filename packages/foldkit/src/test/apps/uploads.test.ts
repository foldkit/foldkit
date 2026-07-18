import { Array, Effect, Fiber, Option } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { makeApplication } from '../../runtime/index.js'
import * as App from './uploads.js'

let maybeRunningFiber = Option.none<Fiber.Fiber<void>>()

const boot = (): void => {
  const container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)

  const application = makeApplication<App.Model, App.Message>({
    Model: App.Model,
    init: () => [App.initialModel, []],
    update: App.update,
    view: App.view,
    container,
    devTools: false,
  })

  maybeRunningFiber = Option.some(Effect.runFork(application.start()))
}

const WAIT_TIMEOUT_MS = 2000
const POLL_INTERVAL_MS = 10

const waitForBodyText = async (
  text: string,
  timeoutMs = WAIT_TIMEOUT_MS,
): Promise<void> => {
  const start = Date.now()
  while (!(document.body.textContent ?? '').includes(text)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Timed out waiting for "${text}". Last content: ${document.body.textContent}`,
      )
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

const clickButton = (text: string): void => {
  const maybeButton = Array.findFirst(
    Array.fromIterable(document.querySelectorAll('button')),
    candidate => (candidate.textContent ?? '').includes(text),
  )
  Option.match(maybeButton, {
    onNone: () => {
      throw new Error(
        `No button labelled "${text}". Body: ${document.body.innerHTML}`,
      )
    },
    onSome: button => {
      button.click()
    },
  })
}

describe('interruptible Commands through the runtime', () => {
  afterEach(async () => {
    if (Option.isSome(maybeRunningFiber)) {
      await Effect.runPromise(Fiber.interrupt(maybeRunningFiber.value))
      maybeRunningFiber = Option.none()
    }
    document.body.innerHTML = ''
  })

  it('interrupts an in-flight Command and dispatches the Interrupt result Message', async () => {
    boot()
    await waitForBodyText('Start upload')

    clickButton('Start upload')
    await waitForBodyText('upload 0: Uploading')

    clickButton('Cancel upload 0')
    await waitForBodyText('upload 0: Cancelled')
  })

  it('only interrupts the Command holding the targeted key', async () => {
    boot()
    await waitForBodyText('Start upload')

    clickButton('Start upload')
    clickButton('Start upload')
    await waitForBodyText('upload 1: Uploading')

    clickButton('Cancel upload 1')
    await waitForBodyText('upload 1: Cancelled')

    expect(document.body.textContent).toContain('upload 0: Uploading')

    clickButton('Cancel upload 0')
    await waitForBodyText('upload 0: Cancelled')
  })

  it('cancelling an upload that is no longer in flight reports NotFound and changes nothing', async () => {
    boot()
    await waitForBodyText('Start upload')

    clickButton('Start upload')
    await waitForBodyText('upload 0: Uploading')

    clickButton('Cancel upload 0')
    await waitForBodyText('upload 0: Cancelled')

    clickButton('Cancel upload 0')
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(document.body.textContent).toContain('upload 0: Cancelled')
  })
})
