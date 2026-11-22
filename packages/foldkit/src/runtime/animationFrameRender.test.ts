import { Effect, Fiber, Number, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

// NOTE: yields to microtasks while MessageChannel and timer tasks stay queued.
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
    {
      lifecycle: 'Inactive',
      subscriptionCount: 1,
      pendingFrameCount: 1,
      scenario: 'one frame Subscription becomes inactive',
    },
    {
      lifecycle: 'Disposed',
      subscriptionCount: 1,
      pendingFrameCount: 1,
      scenario: 'one frame Subscription is disposed',
    },
    {
      lifecycle: 'Inactive',
      subscriptionCount: 2,
      pendingFrameCount: 3,
      scenario: 'two frame Subscriptions become inactive with queued ticks',
    },
    {
      lifecycle: 'Disposed',
      subscriptionCount: 2,
      pendingFrameCount: 3,
      scenario: 'two frame Subscriptions are disposed with queued ticks',
    },
    {
      lifecycle: 'Active',
      subscriptionCount: 1,
      pendingFrameCount: 1,
      scenario: 'another app has an active frame Subscription',
    },
    {
      lifecycle: 'InactiveWithSibling',
      subscriptionCount: 2,
      pendingFrameCount: 1,
      scenario: 'one frame Subscription stops while its sibling is active',
    },
  ])(
    'defers ordinary Messages when $scenario',
    async ({ lifecycle, subscriptionCount, pendingFrameCount }) => {
      const clock = installFrameClock()
      restoreClock = clock.restore
      if (lifecycle === 'Active') {
        vi.stubGlobal(
          'MessageChannel',
          class {
            port1 = { postMessage: () => {}, close: () => {} }
            port2 = { onmessage: undefined, close: () => {} }
          },
        )
      }

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
          body: frameH.div(
            [frameH.Id('frame-value')],
            [globalThis.String(model.step)],
          ),
        }),
        subscriptions: make<FrameModel, FrameMessage>()(() => ({
          frame: animationFrameEntry({
            isActive: model =>
              lifecycle === 'Active' ||
              lifecycle === 'Disposed' ||
              model.step === 0,
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
        } else if (lifecycle !== 'Active') {
          await flushMicrotasks()
        }

        const expectedFrameCount =
          lifecycle === 'Active' || lifecycle === 'InactiveWithSibling' ? 1 : 0
        if (clock.scheduledCount() > expectedFrameCount) {
          await clock.runFrame()
        }
        expect(clock.scheduledCount()).toBe(expectedFrameCount)

        const button = clickHost.querySelector('button')
        if (button === null) {
          throw new Error('expected a button')
        }

        expect(button.textContent).toBe('idle')
        const frameValue =
          lifecycle === 'InactiveWithSibling'
            ? document.getElementById('frame-value')
            : undefined
        if (lifecycle === 'InactiveWithSibling') {
          expect(frameValue).not.toBeNull()
        }
        const previousFrameValue = frameValue?.textContent
        button.click()
        await flushMicrotaskQueue()
        expect(button.textContent).toBe('idle')
        await clock.runFrame()
        expect(button.textContent).toBe('bumped')
        if (lifecycle === 'InactiveWithSibling') {
          expect(frameValue?.textContent).not.toBe(previousFrameValue)
        }
      } finally {
        await Effect.runPromise(Fiber.interrupt(frameFiber))
        await Effect.runPromise(Fiber.interrupt(clickFiber))
        vi.unstubAllGlobals()
        clickHost.remove()
      }
    },
  )

  it('keeps a same-runtime Message in a later task on the next frame', async () => {
    const clock = installFrameClock()
    restoreClock = clock.restore

    vi.stubGlobal(
      'MessageChannel',
      class {
        port1 = { postMessage: () => {}, close: () => {} }
        port2 = { onmessage: undefined, close: () => {} }
      },
    )

    const application = makeApplication({
      Model: MixedModel,
      init: () => ({ model: { step: 0, label: 'idle' } }),
      update: (model: MixedModel, message: MixedMessage) =>
        MixedMessage.match<Update.Return<MixedModel, MixedMessage>>(message, {
          Ticked: () => ({ model }),
          ClickedBump: () => ({
            model: modifyFields(model, { label: () => 'bumped' }),
          }),
        }),
      view: model => ({
        title: 'frames',
        body: mixedH.button(
          [mixedH.OnClick(MixedMessage.ClickedBump())],
          [model.label],
        ),
      }),
      subscriptions: make<MixedModel, MixedMessage>()(() => ({
        frame: animationFrameEntry({
          isActive: () => true,
          toMessage: deltaTime => MixedMessage.Ticked({ deltaTime }),
        }),
      })),
      container,
    })
    const fiber = Effect.runFork(provideBrowserScheduler(application.start()))

    try {
      await waitUntil(
        () => clock.scheduledCount() === 1,
        'animation frame was not scheduled',
      )
      clock.startFrame()
      await flushMicrotaskQueue()
      await flushMicrotasks()

      const button = document.body.querySelector('button')
      if (button === null) {
        throw new Error('expected a button')
      }

      button.click()
      await flushMicrotaskQueue()
      expect(button.textContent).toBe('idle')
      await clock.runFrame()
      expect(button.textContent).toBe('bumped')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      vi.unstubAllGlobals()
    }
  })

  it('keeps animation-frame entries usable without runtime services', async () => {
    const clock = installFrameClock()
    restoreClock = clock.restore
    const messages: Array<FrameMessage> = []
    const entry = animationFrameEntry<FrameModel, FrameMessage>({
      isActive: () => true,
      toMessage: deltaTime => FrameMessage.Ticked({ deltaTime }),
    })
    const stream: Stream.Stream<FrameMessage> = entry.dependenciesToStream({
      isActive: true,
    })
    const fiber = Effect.runFork(
      Stream.runForEach(stream, message =>
        Effect.sync(() => {
          messages.push(message)
        }),
      ),
    )

    try {
      await waitUntil(
        () => clock.scheduledCount() === 1,
        'standalone frame was not scheduled',
      )
      clock.startFrame()
      await waitUntil(
        () => messages.length === 1,
        'standalone stream did not emit',
      )
      expect(messages).toHaveLength(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(clock.scheduledCount()).toBe(0)
  })
})
