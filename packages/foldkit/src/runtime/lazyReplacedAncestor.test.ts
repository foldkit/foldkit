import { Effect, Fiber, PubSub, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
} from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import { makeElement } from './makeElement.js'

const Message = defineMessageUnion({
  ClickedAdvance: {},
  Ticked: {},
  FlippedRootKey: {},
  CompletedMountDevice: {},
  UnmountedDevice: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  advanceCount: Schema.Number,
  tickCount: Schema.Number,
  unmountCount: Schema.Number,
  rootKey: Schema.String,
})
type Model = typeof Model.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedAdvance: () => ({
      model: modifyFields(model, { advanceCount: count => count + 1 }),
    }),
    Ticked: () => ({
      model: modifyFields(model, { tickCount: count => count + 1 }),
    }),
    FlippedRootKey: () => ({
      model: modifyFields(model, {
        rootKey: key => (key === 'a' ? 'b' : 'a'),
      }),
    }),
    CompletedMountDevice: () => ({ model }),
    UnmountedDevice: () => ({
      model: modifyFields(model, { unmountCount: count => count + 1 }),
    }),
  })

const liveMountElements = new Set<Element>()

const MountDevice = Mount.define('MountDevice', {
  messages: [Message.CompletedMountDevice],
  execute: ({ element }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => liveMountElements.add(element)),
        () => Effect.sync(() => liveMountElements.delete(element)),
      )
      return yield* Effect.never
    }),
})

const makeDeviceView = () =>
  vi.fn((h: HtmlBuilder<Message>): Html =>
    h.section(
      [
        h.Class('device'),
        h.OnMount(MountDevice()),
        h.OnUnmount(Message.UnmountedDevice()),
      ],
      [h.button([h.OnClick(Message.ClickedAdvance())], ['advance'])],
    ),
  )

type DeviceRenderer = (model: Model, h: HtmlBuilder<Message>) => Html

const makeView =
  (renderDevice: DeviceRenderer) =>
  (model: Model, h: HtmlBuilder<Message>): Html =>
    h.keyed('div')(
      model.rootKey,
      [],
      [
        h.p([h.Id('root-key')], [model.rootKey]),
        h.p([h.Id('advance-count')], [`${model.advanceCount}`]),
        h.p([h.Id('tick-count')], [`${model.tickCount}`]),
        h.p([h.Id('unmount-count')], [`${model.unmountCount}`]),
        renderDevice(model, h),
      ],
    )

const requireElement = (selector: string): HTMLElement => {
  const element = document.querySelector(selector)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected ${selector} to exist`)
  }
  return element
}

const waitForText = (selector: string, text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.querySelector(selector)?.textContent).toBe(text)
  })

const waitForOneMountOnRenderedDevice = (): Promise<void> =>
  vi.waitFor(() => {
    expect(liveMountElements.size).toBe(1)
    expect(liveMountElements.has(requireElement('.device'))).toBe(true)
  })

type Publish = (message: Message) => void

const runApp = async (
  renderDevice: DeviceRenderer,
  scenario: (publish: Publish) => Promise<void>,
): Promise<void> => {
  const messages = await Effect.runPromise(
    PubSub.unbounded<Message>({ replay: 1 }),
  )
  const runtime = makeElement({
    Model,
    init: () => ({
      model: { advanceCount: 0, tickCount: 0, unmountCount: 0, rootKey: 'a' },
    }),
    update,
    view: makeView(renderDevice),
    container: requireElement('#app'),
    subscriptions: Subscription.make<Model, Message>()(() => ({
      messages: Subscription.persistent(Stream.fromPubSub(messages)),
    })),
  })
  const runtimeFiber = Effect.runFork(runtime.start())

  try {
    await waitForOneMountOnRenderedDevice()
    await scenario(message => PubSub.publishUnsafe(messages, message))
  } finally {
    await Effect.runPromise(Fiber.interrupt(runtimeFiber))
  }
}

const flipRootKeyTwiceWithRenders = async (publish: Publish): Promise<void> => {
  publish(Message.FlippedRootKey())
  await waitForText('#root-key', 'b')
  publish(Message.Ticked())
  await waitForText('#tick-count', '1')

  publish(Message.FlippedRootKey())
  await waitForText('#root-key', 'a')
  publish(Message.Ticked())
  await waitForText('#tick-count', '2')
}

beforeEach(() => {
  liveMountElements.clear()
  const container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createLazy under a replaced keyed ancestor', () => {
  it('keeps one Mount, on the rendered element, after the root key flips', async () => {
    const lazyDevice = createLazy()
    const deviceView = makeDeviceView()

    await runApp(
      (_model, h) => lazyDevice(deviceView, [h]),
      async publish => {
        publish(Message.FlippedRootKey())
        await waitForText('#root-key', 'b')

        await waitForOneMountOnRenderedDevice()
      },
    )
  })

  it('dispatches from the cached subtree after the root key flips', async () => {
    const lazyDevice = createLazy()
    const deviceView = makeDeviceView()

    await runApp(
      (_model, h) => lazyDevice(deviceView, [h]),
      async publish => {
        publish(Message.FlippedRootKey())
        await waitForText('#root-key', 'b')

        requireElement('.device button').click()

        await waitForText('#advance-count', '1')
      },
    )
  })

  it('stays live across repeated root key flips without rebuilding the view', async () => {
    const lazyDevice = createLazy()
    const deviceView = makeDeviceView()

    await runApp(
      (_model, h) => lazyDevice(deviceView, [h]),
      async publish => {
        await flipRootKeyTwiceWithRenders(publish)

        await waitForOneMountOnRenderedDevice()

        requireElement('.device button').click()

        await waitForText('#advance-count', '1')
      },
    )

    expect(deviceView).toHaveBeenCalledTimes(1)
  })

  it('dispatches OnUnmount once per root key flip, for the replaced element only', async () => {
    const lazyDevice = createLazy()
    const deviceView = makeDeviceView()

    await runApp(
      (_model, h) => lazyDevice(deviceView, [h]),
      async publish => {
        await flipRootKeyTwiceWithRenders(publish)

        expect(requireElement('#unmount-count').textContent).toBe('2')

        publish(Message.Ticked())
        await waitForText('#tick-count', '3')

        expect(requireElement('#unmount-count').textContent).toBe('2')
      },
    )
  })
})

describe.each([
  {
    rendering: 'createKeyedLazy keyed on the root key',
    makeRenderDevice: (): DeviceRenderer => {
      const keyedLazyDevice = createKeyedLazy()
      const deviceView = makeDeviceView()
      return (model, h) => keyedLazyDevice(model.rootKey, deviceView, [h])
    },
  },
  {
    rendering: 'direct rendering',
    makeRenderDevice: (): DeviceRenderer => {
      const deviceView = makeDeviceView()
      return (_model, h) => deviceView(h)
    },
  },
])('$rendering under a replaced keyed ancestor', ({ makeRenderDevice }) => {
  it('keeps one Mount on the rendered element and live handlers across root key flips', async () => {
    await runApp(makeRenderDevice(), async publish => {
      publish(Message.FlippedRootKey())
      await waitForText('#root-key', 'b')

      await waitForOneMountOnRenderedDevice()

      publish(Message.Ticked())
      await waitForText('#tick-count', '1')

      publish(Message.FlippedRootKey())
      await waitForText('#root-key', 'a')

      await waitForOneMountOnRenderedDevice()

      requireElement('.device button').click()

      await waitForText('#advance-count', '1')
    })
  })
})
