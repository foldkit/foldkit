import { Effect, Fiber, Match as M, Option, Schema as S, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { html } from '../html/index.js'
import { m } from '../message/index.js'
import * as Subscription from '../subscription/subscription.js'
import {
  type SlowContext,
  type SlowSubscriptionDependenciesContext,
  type SlowUpdateContext,
  __resolveSlowConfig,
  makeElement,
} from './runtime.js'

const ClickedIncrement = m('ClickedIncrement')
const ClickedKeptModel = m('ClickedKeptModel')
const Message = S.Union([ClickedIncrement, ClickedKeptModel])
type Message = typeof Message.Type

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command<Message>>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedIncrement: () => [{ count: model.count + 1 }, []],
      ClickedKeptModel: () => [model, []],
    }),
  )

const view = (model: Model) => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.button([h.OnClick(ClickedIncrement())], ['increment']),
      h.div([], [`count:${model.count}`]),
    ],
  )
}

const sameModelReferenceView = (model: Model) => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.button([h.OnClick(ClickedKeptModel())], ['keep']),
      h.div([], [`count:${model.count}`]),
    ],
  )
}

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
const FORCE_SLOW_WARNING_THRESHOLD_MS = -1

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
    expect(
      Option.getOrThrow(resolved.subscriptionDependencies).thresholdMs,
    ).toBe(2)
  })

  it('measures every phase for an explicit object unless measuredPhases is provided', () => {
    const resolved = Option.getOrThrow(
      __resolveSlowConfig<Model, Message>(
        { onSlow: () => undefined },
        () => true,
      ),
    )

    expect(Option.isSome(resolved.update)).toBe(true)
    expect(Option.isSome(resolved.view)).toBe(true)
    expect(Option.isSome(resolved.patch)).toBe(true)
    expect(Option.isSome(resolved.subscriptionDependencies)).toBe(true)
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

  it('shows when show is Always even when development warnings are not visible', () => {
    const resolved = __resolveSlowConfig<Model, Message>(
      { show: 'Always' },
      show => show === 'Always',
    )

    expect(Option.isSome(resolved)).toBe(true)
  })

  it('uses measuredPhases to select phases and thresholdOverrides to tune budgets', () => {
    const resolved = Option.getOrThrow(
      __resolveSlowConfig<Model, Message>(
        {
          measuredPhases: ['View'],
          thresholdOverrides: {
            View: 5,
          },
        },
        () => true,
      ),
    )

    expect(Option.isNone(resolved.update)).toBe(true)
    expect(Option.getOrThrow(resolved.view).thresholdMs).toBe(5)
    expect(Option.isNone(resolved.patch)).toBe(true)
    expect(Option.isNone(resolved.subscriptionDependencies)).toBe(true)
  })

  it('reports measured phases with tagged contexts', async () => {
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
        thresholdOverrides: {
          Update: FORCE_SLOW_WARNING_THRESHOLD_MS,
          View: FORCE_SLOW_WARNING_THRESHOLD_MS,
          Patch: FORCE_SLOW_WARNING_THRESHOLD_MS,
          SubscriptionDependencies: FORCE_SLOW_WARNING_THRESHOLD_MS,
        },
      },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('count:0')
      clickIncrement()
      await awaitBodyText('count:1')

      await vi.waitFor(() => {
        expect(slowTags(contexts)).toEqual(
          expect.arrayContaining([
            'View',
            'Patch',
            'Update',
            'SubscriptionDependencies',
          ]),
        )
      })

      const updateContext = contexts.find(
        (context): context is SlowUpdateContext<Model, Message> =>
          context._tag === 'Update',
      )
      expect(updateContext?.previousModel.count).toBe(0)
      expect(updateContext?.nextModel.count).toBe(1)
      expect(updateContext?.message._tag).toBe('ClickedIncrement')

      const subscriptionDependenciesContext = contexts.find(
        (context): context is SlowSubscriptionDependenciesContext<Model> =>
          context._tag === 'SubscriptionDependencies',
      )
      expect(subscriptionDependenciesContext?.subscriptionKey).toBe('count')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reports only phases selected by measuredPhases', async () => {
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
        measuredPhases: ['Update'],
        thresholdOverrides: {
          Update: FORCE_SLOW_WARNING_THRESHOLD_MS,
        },
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

      await vi.waitFor(() => {
        expect(contexts).toHaveLength(1)
      })
      expect(slowTags(contexts)).toEqual(['Update'])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reports update work when update returns the same Model reference', async () => {
    const contexts: Array<SlowContext<Model, Message>> = []

    const element = makeElement({
      Model,
      init: () => [{ count: 0 }, []],
      update,
      view: sameModelReferenceView,
      subscriptions,
      container,
      slow: {
        show: 'Always',
        measuredPhases: ['Update'],
        thresholdOverrides: {
          Update: FORCE_SLOW_WARNING_THRESHOLD_MS,
        },
        onSlow: context => {
          contexts.push(context)
        },
      },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('count:0')
      const button = document.body.querySelector('button')
      expect(button).not.toBeNull()
      button?.click()

      await vi.waitFor(() => {
        expect(slowTags(contexts)).toEqual(['Update'])
      })

      const updateContext = contexts.find(
        (context): context is SlowUpdateContext<Model, Message> =>
          context._tag === 'Update',
      )
      expect(updateContext?.previousModel).toBe(updateContext?.nextModel)
      expect(updateContext?.message._tag).toBe('ClickedKeptModel')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
