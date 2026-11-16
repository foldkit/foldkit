import { Effect, Fiber, Number, Option, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { animationFrameEntry } from '../subscription/animationFrame.js'
import { make } from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import {
  currentAnimationFrame,
  endAnimationFrameCallbackPhase,
} from './animationFramePhase.js'
import { provideBrowserScheduler } from './browserScheduler.js'
import { makeApplication } from './makeApplication.js'

const FRAME_COUNT = 120
const FRAME_STEP_MS = 16
const MICROTASK_TURN_COUNT = 100
const READINESS_ATTEMPT_COUNT = 80

type FrameCallback = (timestamp: number) => void

type ScheduledFrame = Readonly<{
  id: number
  callback: FrameCallback
}>

const flushMicrotasks = (): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, 0)
  })

// NOTE: yields to queued microtasks only. A MessageChannel or setTimeout
// task stays queued, so the frame's callback phase is still open.
const flushMicrotaskQueue = async (): Promise<void> => {
  for (let turn = 0; turn < MICROTASK_TURN_COUNT; turn++) {
    await Promise.resolve()
  }
}

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

  const startFrame = (): void => {
    const callbacks = scheduled.splice(0)
    now += FRAME_STEP_MS
    for (const entry of callbacks) {
      if (!cancelled.has(entry.id)) {
        entry.callback(now)
      }
    }
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

  return { scheduledCount, startFrame, runFrame, restore }
}

const waitUntil = async (
  ready: () => boolean,
  failure: string,
): Promise<void> => {
  for (let attempt = 0; attempt < READINESS_ATTEMPT_COUNT; attempt++) {
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

const MixedMessage = defineMessageUnion({
  Ticked: { deltaTime: Schema.Number },
  ClickedBump: {},
})
type MixedMessage = typeof MixedMessage.Type

const MixedModel = Schema.Struct({ step: Schema.Number, label: Schema.String })
type MixedModel = typeof MixedModel.Type

const mixedH = __htmlBuilder<MixedMessage>()

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

  it('renders early once per frame and defers a later Message', async () => {
    const clock = installFrameClock()
    restoreClock = clock.restore

    const subscriptions = make<MixedModel, MixedMessage>()(() => ({
      frame: animationFrameEntry({
        isActive: () => true,
        toMessage: deltaTime => MixedMessage.Ticked({ deltaTime }),
      }),
    }))

    const application = makeApplication({
      Model: MixedModel,
      init: () => ({ model: { step: 0, label: 'idle' } }),
      update: (model: MixedModel, message: MixedMessage) =>
        MixedMessage.match<Update.Return<MixedModel, MixedMessage>>(message, {
          Ticked: () => ({
            model: modifyFields(model, { step: Number.increment }),
          }),
          ClickedBump: () => ({
            model: modifyFields(model, { label: () => 'bumped' }),
          }),
        }),
      view: model => ({
        title: 'frames',
        body: mixedH.button(
          [mixedH.OnClick(MixedMessage.ClickedBump())],
          [`${model.step} ${model.label}`],
        ),
      }),
      subscriptions,
      container,
    })

    const fiber = Effect.runFork(provideBrowserScheduler(application.start()))

    try {
      await waitUntil(
        () => clock.scheduledCount() === 1,
        'animation frame was not scheduled',
      )
      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected a button')
      }

      clock.startFrame()
      await flushMicrotaskQueue()

      expect(button.textContent).toBe('1 idle')

      button.click()
      await flushMicrotaskQueue()

      expect(button.textContent).toBe('1 idle')

      await clock.runFrame()

      expect(button.textContent).toBe('2 bumped')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it.each([
    { lifecycle: 'Inactive', subscriptionCount: 1, pendingFrameCount: 1 },
    { lifecycle: 'Disposed', subscriptionCount: 1, pendingFrameCount: 1 },
    { lifecycle: 'Inactive', subscriptionCount: 2, pendingFrameCount: 3 },
    { lifecycle: 'Disposed', subscriptionCount: 2, pendingFrameCount: 3 },
    {
      lifecycle: 'InactiveWithSibling',
      subscriptionCount: 2,
      pendingFrameCount: 1,
    },
  ])(
    'defers another application after $subscriptionCount frame Subscriptions become $lifecycle',
    async ({ lifecycle, subscriptionCount, pendingFrameCount }) => {
      const clock = installFrameClock()
      restoreClock = clock.restore
      const deliveries: Array<() => void> = []

      vi.stubGlobal(
        'MessageChannel',
        class {
          isClosed = false
          port1 = {
            postMessage: () =>
              deliveries.push(() => {
                if (!this.isClosed) {
                  this.port2.onmessage?.()
                }
              }),
            close: () => {
              this.isClosed = true
            },
          }
          port2: { onmessage?: () => void; close: () => void } = {
            close: () => {
              this.isClosed = true
            },
          }
        },
      )

      const frameApplication = makeApplication({
        Model: FrameModel,
        init: () => ({ model: { step: 0 } }),
        update: (model: FrameModel, message: FrameMessage) =>
          FrameMessage.match<Update.Return<FrameModel, FrameMessage>>(message, {
            Ticked: () => ({
              model: modifyFields(model, { step: Number.increment }),
            }),
          }),
        view: model => ({
          title: 'frames',
          body: frameH.div([], [globalThis.String(model.step)]),
        }),
        subscriptions: make<FrameModel, FrameMessage>()(() => ({
          frame: animationFrameEntry({
            isActive: model => lifecycle === 'Disposed' || model.step === 0,
            toMessage: deltaTime => FrameMessage.Ticked({ deltaTime }),
          }),
          ...(subscriptionCount === 2
            ? {
                secondFrame: animationFrameEntry({
                  isActive: model =>
                    lifecycle === 'Disposed' ||
                    lifecycle === 'InactiveWithSibling' ||
                    model.step === 0,
                  toMessage: deltaTime => FrameMessage.Ticked({ deltaTime }),
                }),
              }
            : {}),
        })),
        container,
      })

      const clickContainer = document.createElement('div')
      clickContainer.id = 'click-app'
      const clickHost = document.createElement('section')
      clickHost.appendChild(clickContainer)
      document.body.appendChild(clickHost)
      const clickApplication = makeApplication({
        Model: ClickModel,
        init: () => ({ model: { label: 'idle' } }),
        update: (model: ClickModel, message: ClickMessage) =>
          ClickMessage.match<Update.Return<ClickModel, ClickMessage>>(message, {
            ClickedBump: () => ({
              model: modifyFields(model, { label: () => 'bumped' }),
            }),
          }),
        view: model => ({
          title: 'clicks',
          body: clickH.button(
            [clickH.OnClick(ClickMessage.ClickedBump())],
            [model.label],
          ),
        }),
        container: clickContainer,
      })

      const frameFiber = Effect.runFork(
        provideBrowserScheduler(frameApplication.start()),
      )
      const clickFiber = Effect.runFork(
        provideBrowserScheduler(clickApplication.start()),
      )

      try {
        await waitUntil(
          () => clock.scheduledCount() === subscriptionCount,
          'animation frames were not scheduled',
        )
        for (let frame = 0; frame < pendingFrameCount; frame++) {
          clock.startFrame()
        }
        await flushMicrotaskQueue()
        if (lifecycle === 'Disposed') {
          await Effect.runPromise(Fiber.interrupt(frameFiber))
        } else {
          await flushMicrotasks()
        }
        if (lifecycle === 'InactiveWithSibling') {
          expect(currentAnimationFrame()).toEqual(Option.some(FRAME_STEP_MS))
        }
        for (const delivery of deliveries.splice(0)) {
          delivery()
        }
        expect(currentAnimationFrame()).toEqual(Option.none())

        const button = clickHost.querySelector('button')
        if (button === null) {
          throw new Error('expected a button')
        }

        button.click()
        await flushMicrotaskQueue()
        expect(button.textContent).toBe('idle')
        await clock.runFrame()
        expect(button.textContent).toBe('bumped')
      } finally {
        await Effect.runPromise(Fiber.interrupt(frameFiber))
        await Effect.runPromise(Fiber.interrupt(clickFiber))
        while (Option.isSome(currentAnimationFrame())) {
          endAnimationFrameCallbackPhase()
        }
        vi.unstubAllGlobals()
        clickHost.remove()
      }
    },
  )
})
