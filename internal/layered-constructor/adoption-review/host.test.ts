import { Effect, Fiber, Layer } from 'effect'
import type * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'
import { expect, expectTypeOf, it, vi } from 'vitest'

import { HostReviewBlock, makeHostProgram } from './host.js'
import {
  ConstructorSource,
  InvocationSource,
  Message,
  ProviderFailure,
} from './hostContract.js'
import { ReadEffectsLayer } from './hostProvider.js'

it('retains exact provider channels before ordinary completion', () => {
  expectTypeOf<
    Layer.Error<typeof ReadEffectsLayer>
  >().toEqualTypeOf<ProviderFailure>()
  expectTypeOf<Layer.Services<typeof ReadEffectsLayer>>().toEqualTypeOf<
    ConstructorSource | InvocationSource
  >()
  expectTypeOf<
    Block.FactsOf<typeof HostReviewBlock>['effectsLayerError']
  >().toEqualTypeOf<ProviderFailure>()
  expectTypeOf<
    Block.FactsOf<typeof HostReviewBlock>['programRequirements']
  >().toEqualTypeOf<ConstructorSource | InvocationSource>()
})

it('keeps pure Story setup independent of handler Services', () =>
  Effect.runPromise(
    Story.withBlock(HostReviewBlock, host => {
      const initialized = host.init()
      expect(initialized.model.count).toBe(0)
      const clickedRead = host.update(initialized.model, Message.ClickedRead())
      expect(clickedRead.commands).toHaveLength(1)
    }),
  ))

it('runs the original separately supplied provider through public Program startup', async () => {
  const container = document.createElement('div')
  container.id = 'host-review-runtime'
  const wrapper = document.createElement('div')
  wrapper.append(container)
  document.body.append(wrapper)
  const sources = Layer.mergeAll(
    Layer.succeed(ConstructorSource, 2),
    Layer.succeed(InvocationSource, 3),
  )
  const fiber = Effect.runFork(
    makeHostProgram(container).provide(sources).start(),
  )

  try {
    await vi.waitFor(() =>
      expect(wrapper.querySelector('#host-review-count')?.textContent).toBe(
        '0',
      ),
    )
    wrapper.querySelector<HTMLButtonElement>('#host-review-read')?.click()
    await vi.waitFor(() =>
      expect(wrapper.querySelector('#host-review-count')?.textContent).toBe(
        '5',
      ),
    )
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
    wrapper.remove()
  }
})

it('retains typed provider failure when the selected handler Layer builds', async () => {
  const failure = await Effect.runPromise(
    Story.withBlock(HostReviewBlock, host =>
      Layer.build(host.EffectsLayer).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.succeed(ConstructorSource, -1),
            Layer.succeed(InvocationSource, 3),
          ),
        ),
        Effect.flip,
      ),
    ),
  )
  expect(failure).toEqual(new ProviderFailure({ reason: 'Unavailable' }))
})
