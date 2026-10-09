import { Effect, Fiber, Number, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { animationFrameEntry } from '../subscription/animationFrame.js'
import { make } from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import { provideBrowserScheduler } from './browserScheduler.js'
import { makeApplication } from './makeApplication.js'

const FRAME_COUNT = 120
const FRAME_STEP_MS = 16

type FrameCallback = (timestamp: number) => void

type ScheduledFrame = Readonly<{
  id: number
  callback: FrameCallback
}>

const flushMicrotasks = (): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, 0)
  })

const installFrameClock = () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
  let nextId = 1
  let now = 0
  const scheduled: Array<ScheduledFrame> = []
  const cancelled = new Set<number>()

  const requestFrame = (callback: FrameCallback): number => {
    const id = nextId
    nextId += 1
    scheduled.push({ id, callback })
    return id
  }

  const cancelFrame = (id: number): void => {
    cancelled.add(id)
  }

  const scheduledCount = (): number => {
    let count = 0
    for (const entry of scheduled) {
      if (!cancelled.has(entry.id)) {
        count += 1
      }
    }
    return count
  }

  const runFrame = async (): Promise<void> => {
    const callbacks = scheduled.splice(0)
    now += FRAME_STEP_MS
    for (const entry of callbacks) {
      if (cancelled.has(entry.id)) {
        continue
      }
      entry.callback(now)
      await flushMicrotasks()
    }
    await flushMicrotasks()
  }

  globalThis.requestAnimationFrame = requestFrame
  globalThis.cancelAnimationFrame = cancelFrame
  window.requestAnimationFrame = requestFrame
  window.cancelAnimationFrame = cancelFrame

  const restore = (): void => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame
    window.requestAnimationFrame = originalRequestAnimationFrame
    window.cancelAnimationFrame = originalCancelAnimationFrame
  }

  return { scheduledCount, runFrame, restore }
}

const waitUntil = async (
  ready: () => boolean,
  failure: string,
): Promise<void> => {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (ready()) {
      return
    }
    await flushMicrotasks()
  }
  throw new Error(failure)
}

const FrameMessage = defineMessageUnion({
  Ticked: { deltaTime: Schema.Number },
})
type FrameMessage = typeof FrameMessage.Type

const FrameModel = Schema.Struct({ step: Schema.Number })
type FrameModel = typeof FrameModel.Type

const frameH = __htmlBuilder<FrameMessage>()

const ClickMessage = defineMessageUnion({
  ClickedBump: {},
})
type ClickMessage = typeof ClickMessage.Type

const ClickModel = Schema.Struct({ label: Schema.String })
type ClickModel = typeof ClickModel.Type

const clickH = __htmlBuilder<ClickMessage>()

describe('animation frame rendering', () => {
  let container: HTMLDivElement
  let restoreClock: (() => void) | undefined

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    restoreClock?.()
    container.remove()
  })

  it('renders one view for every animation frame', async () => {
    const clock = installFrameClock()
    restoreClock = clock.restore

    let tickCount = 0
    let viewCount = 0

    const subscriptions = make<FrameModel, FrameMessage>()(() => ({
      frame: animationFrameEntry({
        isActive: () => true,
        toMessage: deltaTime => FrameMessage.Ticked({ deltaTime }),
      }),
    }))

    const application = makeApplication({
      Model: FrameModel,
      init: () => ({ model: { step: 0 } }),
      update: (model: FrameModel, message: FrameMessage) =>
        FrameMessage.match<Update.Return<FrameModel, FrameMessage>>(message, {
          Ticked: () => {
            tickCount += 1
            return { model: modifyFields(model, { step: Number.increment }) }
          },
        }),
      view: model => {
        viewCount += 1
        return {
          title: 'frames',
          body: frameH.div([], [String(model.step)]),
        }
      },
      subscriptions,
      container,
    })

    const fiber = Effect.runFork(provideBrowserScheduler(application.start()))

    try {
      await waitUntil(
        () => clock.scheduledCount() === 1,
        'animation frame was not scheduled',
      )
      viewCount = 0
      tickCount = 0

      for (let frame = 0; frame < FRAME_COUNT; frame++) {
        await clock.runFrame()
      }

      expect(tickCount).toBe(FRAME_COUNT)
      expect(viewCount).toBe(tickCount)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('keeps an ordinary Message on the next animation frame', async () => {
    const clock = installFrameClock()
    restoreClock = clock.restore

    const application = makeApplication({
      Model: ClickModel,
      init: () => ({ model: { label: 'idle' } }),
      update: (model: ClickModel, message: ClickMessage) =>
        ClickMessage.match<Update.Return<ClickModel, ClickMessage>>(message, {
          ClickedBump: () => ({
            model: modifyFields(model, { label: () => 'bumped' }),
          }),
        }),
      view: model => ({
        title: 'frames',
        body: clickH.button(
          [clickH.OnClick(ClickMessage.ClickedBump())],
          [model.label],
        ),
      }),
      container,
    })

    const fiber = Effect.runFork(provideBrowserScheduler(application.start()))

    try {
      await waitUntil(
        () => document.body.textContent?.includes('idle') === true,
        'application did not render',
      )
      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected a button')
      }

      button.click()
      await flushMicrotasks()

      expect(document.body.textContent).toContain('idle')
      expect(document.body.textContent).not.toContain('bumped')
      expect(clock.scheduledCount()).toBe(1)

      await clock.runFrame()

      expect(document.body.textContent).toContain('bumped')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
