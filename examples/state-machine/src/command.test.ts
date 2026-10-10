import { Effect, Fiber, Layer, Ref } from 'effect'
import { TestClock } from 'effect/testing'
import { expect, test } from 'vitest'

import { Message, PlaceOrder, PlaceOrderLayer } from './main'

test('PlaceOrder waits before succeeding', () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const didComplete = yield* Ref.make(false)
      const fiber = yield* Effect.forkChild(
        PlaceOrder({ isShippingRequired: false }).effect.pipe(
          Effect.tap(() => Ref.set(didComplete, true)),
        ),
        { startImmediately: true },
      )

      yield* TestClock.adjust('999 millis')
      expect(yield* Ref.get(didComplete)).toBe(false)

      yield* TestClock.adjust('1 millis')
      expect(yield* Fiber.join(fiber)).toStrictEqual(
        Message.CompletedPlaceOrder({ orderId: 'DIGI-1001' }),
      )
    }).pipe(
      Effect.scoped,
      Effect.provide(
        PlaceOrderLayer.pipe(Layer.provideMerge(TestClock.layer())),
      ),
    ),
  ))
