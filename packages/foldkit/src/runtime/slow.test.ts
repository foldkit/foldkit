import {
  Array as Array_,
  Effect,
  Fiber,
  Match as M,
  Option,
  Schema as S,
  Stream,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { html } from '../html/index.js'
import { m } from '../message/index.js'
import {
  type SlowContext,
  type SlowSubscriptionsContext,
  type SlowUpdateContext,
  __resolveSlowConfig,
  makeElement,
} from './runtime.js'
import * as Subscription from './subscription.js'

const ClickedIncrement = m('ClickedIncrement')
const Message = S.Union([ClickedIncrement])
type Message = typeof Message.Type

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command<Message>>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedIncrement: () => [{ count: model.count + 1 }, []],
    }),
  )

const h = html<Message>()

const view = (model: Model) =>
  h.div(
    [],
    [
      h.button([h.OnClick(ClickedIncrement())], ['increment']),
      h.div([], [`count:${model.count}`]),
    ],
  )

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  count: entry(
    { count: S.Number },
    {
      modelToDependencies: model => ({ count: model.count }),
      dependenciesToStream: () => Stream.empty,
    },
  ),
}))

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const clickIncrement = (): void => {
  const button = document.body.querySelector('button')
  expect(button).not.toBeNull()
  button?.click()
}

const awaitTwoAnimationFrames = (): Promise<void> =>
  new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })

const slowTags = (
  contexts: ReadonlyArray<SlowContext<Model, Message>>,
): ReadonlyArray<SlowContext<Model, Message>['_tag']> =>
  contexts.map(context => context._tag)

describe('slow warnings', () => {
  it('enables every phase by default when development warnings are visible', () => {
    const resolved = Option.getOrThrow(
      __resolveSlowConfig<Model, Message>(undefined, () => true),
    )

    expect(Option.getOrThrow(resolved.update).thresholdMs).toBe(4)
    expect(Option.getOrThrow(resolved.view).thresholdMs).toBe(16)
    expect(Option.getOrThrow(resolved.patch).thresholdMs).toBe(8)
    expect(Option.getOrThrow(resolved.subscriptions).thresholdMs).toBe(2)
  })

  it('disables every phase when slow is false', () => {
    expect(
      Option.isNone(__resolveSlowConfig<Model, Message>(false, () => true)),
    ).toBe(true)
  })

  it('hides default warnings when development warnings are not visible', () => {
    expect(
      Option.isNone(
        __resolveSlowConfig<Model, Message>(undefined, () => false),
      ),
    ).toBe(true)
  })

  it('reports enabled phases with tagged contexts', async () => {
    const contexts: Array<SlowContext<Model, Message>> = []

    const element = makeElement({
      Model,
      init: () => [{ count: 0 }, []],
      update,
      view,
      subscriptions,
      container,
      slow: {
        show: 'Always',
        onSlow: context => {
          contexts.push(context)
        },
        update: { thresholdMs: -1 },
        view: { thresholdMs: -1 },
        patch: { thresholdMs: -1 },
        subscriptions: { thresholdMs: -1 },
      },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('count:0')
      clickIncrement()
      await awaitBodyText('count:1')

      await vi.waitFor(() => {
        expect(slowTags(contexts)).toEqual(
          expect.arrayContaining(['View', 'Patch', 'Update', 'Subscriptions']),
        )
      })

      const updateContext = contexts.find(
        (context): context is SlowUpdateContext<Model, Message> =>
          context._tag === 'Update',
      )
      expect(updateContext?.previousModel.count).toBe(0)
      expect(updateContext?.nextModel.count).toBe(1)
      expect(updateContext?.message._tag).toBe('ClickedIncrement')

      const subscriptionsContext = contexts.find(
        (context): context is SlowSubscriptionsContext<Model> =>
          context._tag === 'Subscriptions',
      )
      expect(subscriptionsContext?.subscriptionKey).toBe('count')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('uses exactly the phases named by an explicit config', async () => {
    const contexts: Array<SlowContext<Model, Message>> = []

    const element = makeElement({
      Model,
      init: () => [{ count: 0 }, []],
      update,
      view,
      subscriptions,
      container,
      slow: {
        show: 'Always',
        onSlow: context => {
          contexts.push(context)
        },
      },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('count:0')
      clickIncrement()
      await awaitBodyText('count:1')
      await awaitTwoAnimationFrames()

      expect(contexts).toEqual([])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('lets phase callbacks override the top-level callback', async () => {
    const topLevelContexts: Array<SlowContext<Model, Message>> = []
    const updateContexts: Array<SlowUpdateContext<Model, Message>> = []

    const element = makeElement({
      Model,
      init: () => [{ count: 0 }, []],
      update,
      view,
      container,
      slow: {
        show: 'Always',
        onSlow: context => {
          topLevelContexts.push(context)
        },
        update: {
          thresholdMs: -1,
          onSlow: context => {
            updateContexts.push(context)
          },
        },
        view: false,
        patch: false,
      },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('count:0')
      clickIncrement()
      await awaitBodyText('count:1')

      await vi.waitFor(() => {
        expect(updateContexts).toHaveLength(1)
      })
      expect(topLevelContexts).toEqual([])
      expect(
        Option.getOrUndefined(Array_.head(updateContexts))?.message._tag,
      ).toBe('ClickedIncrement')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
