import { Effect, Fiber } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVTOOLS_OVERLAY_RUNTIME_ID } from '../html/index.js'
import { OUTLINE_CUSTOM_EVENT, type OutlineRect } from '../outline/public.js'
import * as App from '../test/apps/outline.js'
import * as LazyListApp from '../test/apps/outlineLazyList.js'
import { makeApplication } from './runtime.js'

declare global {
  interface Window {
    __foldkitOutlinesEnabled?: boolean
  }
}

let runningFiber: Fiber.Fiber<void> | null = null
let previousGetBoundingClientRect: typeof Element.prototype.getBoundingClientRect

const stubLayoutGeometry = (): void => {
  previousGetBoundingClientRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      top: 0,
      left: 0,
      right: 120,
      bottom: 40,
      toJSON: () => ({}),
    }
  }
}

const boot = (
  container: HTMLDivElement,
  model: App.Model = App.initialModel,
): void => {
  const application = makeApplication<App.Model, App.Message>({
    Model: App.Model,
    init: () => ({ model }),
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

const isOutlineBatch = (
  detail: unknown,
): detail is ReadonlyArray<OutlineRect> =>
  Array.isArray(detail) &&
  detail.every(
    item =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'label' in item &&
      'x' in item &&
      'y' in item &&
      'width' in item &&
      'height' in item,
  )

const collectOutlineEvents = (): Array<ReadonlyArray<OutlineRect>> => {
  const batches: Array<ReadonlyArray<OutlineRect>> = []
  window.addEventListener(OUTLINE_CUSTOM_EVENT, event => {
    if (event instanceof CustomEvent && isOutlineBatch(event.detail)) {
      batches.push(event.detail)
    }
  })
  return batches
}

describe('re-render outlines', () => {
  beforeEach(() => {
    stubLayoutGeometry()
  })

  afterEach(async () => {
    Element.prototype.getBoundingClientRect = previousGetBoundingClientRect
    window.__foldkitOutlinesEnabled = false
    if (runningFiber !== null) {
      await Effect.runPromise(Fiber.interrupt(runningFiber))
      runningFiber = null
    }
    document.body.replaceChildren()
  })

  it('emits an outline for a Submodel whose child model changed', async () => {
    window.__foldkitOutlinesEnabled = true
    const batches = collectOutlineEvents()

    const container = document.createElement('div')
    container.id = 'outline-test-app'
    document.body.appendChild(container)
    boot(container)

    await waitForBodyText('tick 0')
    batches.length = 0

    clickButton('Increment tick')
    await waitForBodyText('tick 1')

    await vi.waitFor(() => {
      expect(batches.length).toBeGreaterThan(0)
    })

    const ids = batches.flatMap(batch => batch.map(rect => rect.id))
    expect(ids).toContain('counter')
    expect(ids).not.toContain('list')
    expect(
      batches.some(batch =>
        batch.some(rect => rect.cause === 'IncrementedTick'),
      ),
    ).toBe(true)
  })

  it('does not emit outlines from the DevTools overlay runtime', async () => {
    window.__foldkitOutlinesEnabled = true
    const batches = collectOutlineEvents()

    const container = document.createElement('div')
    container.id = DEVTOOLS_OVERLAY_RUNTIME_ID
    document.body.appendChild(container)
    boot(container)

    await waitForBodyText('tick 0')
    batches.length = 0

    clickButton('Increment tick')
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(batches).toEqual([])
  })

  it('emits only the keyed lazy row outline when one list item changes', async () => {
    window.__foldkitOutlinesEnabled = true
    const batches = collectOutlineEvents()

    const container = document.createElement('div')
    container.id = 'outline-lazy-list-app'
    document.body.appendChild(container)

    const application = makeApplication<LazyListApp.Model, LazyListApp.Message>(
      {
        Model: LazyListApp.Model,
        init: () => ({ model: LazyListApp.initialModel }),
        update: LazyListApp.update,
        view: LazyListApp.view,
        container,
        devTools: false,
      },
    )
    runningFiber = Effect.runFork(application.start())

    await waitForBodyText('item-1:0')
    batches.length = 0

    clickButton('Increment item 1')
    await waitForBodyText('item-1:1')

    await vi.waitFor(() => {
      expect(batches.length).toBeGreaterThan(0)
    })

    const ids = batches.flatMap(batch => batch.map(rect => rect.id))
    expect(ids.some(id => id.startsWith('lazy:'))).toBe(true)
    expect(ids).not.toContain('list')
  })
})
