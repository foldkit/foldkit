import { Effect, Fiber } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import type { Command } from '../../command/index.js'
import { makeApplication } from '../../runtime/index.js'
import * as App from './crashOnRender.js'

let runningFiber: Fiber.Fiber<void> | null = null

const boot = (
  initialModel: App.Model,
  commands: ReadonlyArray<Command<App.Message>> = [],
): void => {
  const container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)

  const application = makeApplication<App.Model, App.Message>({
    Model: App.Model,
    init: () => [initialModel, commands],
    update: App.update,
    view: App.view,
    container,
    devTools: false,
  })

  runningFiber = Effect.runFork(application.start())
}

const waitForBodyText = async (
  text: string,
  timeoutMs = 2000,
): Promise<void> => {
  const start = Date.now()
  while (!(document.body.textContent ?? '').includes(text)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Timed out waiting for "${text}". Last content: ${document.body.textContent}`,
      )
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

const clickButton = (text: string): void => {
  const button = Array.from(document.querySelectorAll('button')).find(
    candidate => (candidate.textContent ?? '').includes(text),
  )
  if (button === undefined) {
    throw new Error(
      `No button labelled "${text}". Body: ${document.body.innerHTML}`,
    )
  }
  button.click()
}

describe('crash view on unrecoverable errors', () => {
  afterEach(async () => {
    if (runningFiber !== null) {
      await Effect.runPromise(Fiber.interrupt(runningFiber))
      runningFiber = null
    }
    document.body.innerHTML = ''
  })

  it('shows the crash view when a later render throws instead of freezing on the last frame', async () => {
    boot(App.initialModel)
    await waitForBodyText('Select 1')

    // NOTE: Reload loads a malformed source; the empty id throws on the next
    // frame, when the view rebuilds its SelectedSource handler.
    clickButton('Reload')

    await waitForBodyText('Application Crash')
    expect(document.body.textContent).not.toContain('Select 1')
  })

  it('shows the crash view when the initial render throws', async () => {
    boot({ sources: App.malformedSources })

    await waitForBodyText('Application Crash')
  })

  it('shows the crash view when update throws', async () => {
    boot(App.initialModel)
    await waitForBodyText('Select 1')

    // NOTE: an empty id makes update construct a Source, which throws.
    clickButton('Add source')

    await waitForBodyText('Application Crash')
  })
})
