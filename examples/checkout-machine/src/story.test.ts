import { Effect, Fiber, Option, Ref } from 'effect'
import { TestClock } from 'effect/testing'
import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  AppliedPromo,
  Cart,
  ClickedBack,
  ClickedCancel,
  ClickedContinue,
  ClickedPlaceOrder,
  ClickedStartOver,
  PlaceOrder,
  RejectedPromo,
  SelectedEdition,
  SubmittedPromoCode,
  SucceededPlaceOrder,
  ToggledPaymentMethod,
  ToggledTermsAccepted,
  UpdatedPromoCode,
  initialModel,
  update,
} from './main'

describe('update', () => {
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
          SucceededPlaceOrder({ orderId: 'DIGI-1001' }),
        )
      }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
    ))

  test('physical carts visit Shipping before Payment', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedContinue()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Shipping')
        expect(model.maybeLastTransitionSummary).toEqual(
          Option.some('Cart -> Shipping on ClickedContinue'),
        )
      }),
      Story.message(ClickedContinue()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Payment')
      }),
    )
  })

  test('digital carts skip Shipping through the otherwise branch', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(SelectedEdition({ isShippingRequired: false })),
      Story.message(ClickedContinue()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Payment')
      }),
      Story.message(ClickedBack()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Cart')
      }),
    )
  })

  test('starting over after cancelling keeps the selected edition', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(SelectedEdition({ isShippingRequired: false })),
      Story.message(ClickedCancel()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Cancelled')
      }),
      Story.message(ClickedStartOver()),
      Story.model(model => {
        expect(model.checkout).toStrictEqual(
          Cart({ isShippingRequired: false }),
        )
      }),
    )
  })

  test('a known promo code resolves to a discount and an unknown one clears it', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(SelectedEdition({ isShippingRequired: false })),
      Story.message(ClickedContinue()),
      Story.message(ToggledPaymentMethod({ isSelected: true })),
      Story.message(ClickedContinue()),
      Story.message(UpdatedPromoCode({ value: ' reader10 ' })),
      Story.message(SubmittedPromoCode()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Review')
        if (model.checkout._tag === 'Review') {
          expect(model.checkout.promo).toEqual(
            AppliedPromo({ discount: { code: 'READER10', percentOff: 10 } }),
          )
        }
      }),
      Story.message(UpdatedPromoCode({ value: 'BOGUS' })),
      Story.message(SubmittedPromoCode()),
      Story.model(model => {
        if (model.checkout._tag === 'Review') {
          expect(model.checkout.promo).toEqual(RejectedPromo())
        }
        expect(model.maybeLastTransitionSummary).toEqual(
          Option.some('Review -> Review on SubmittedPromoCode'),
        )
      }),
    )
  })

  test('unaccepted review ignores place order without a Command', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(SelectedEdition({ isShippingRequired: false })),
      Story.message(ClickedContinue()),
      Story.message(ToggledPaymentMethod({ isSelected: true })),
      Story.message(ClickedContinue()),
      Story.message(ClickedPlaceOrder()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Review')
        expect(model.maybeLastTransitionSummary).toEqual(
          Option.some('ClickedPlaceOrder ignored in Review'),
        )
      }),
    )
  })

  test('ready review emits PlaceOrder after its guard passes', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(SelectedEdition({ isShippingRequired: false })),
      Story.message(ClickedContinue()),
      Story.message(ToggledPaymentMethod({ isSelected: true })),
      Story.message(ClickedContinue()),
      Story.message(ToggledTermsAccepted({ isAccepted: true })),
      Story.message(ClickedPlaceOrder()),
      Story.Command.expectExact(PlaceOrder({ isShippingRequired: false })),
      Story.Command.resolve(
        PlaceOrder,
        SucceededPlaceOrder({ orderId: 'DIGI-1001' }),
      ),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Confirmed')
        if (model.checkout._tag === 'Confirmed') {
          expect(model.checkout.orderId).toBe('DIGI-1001')
        }
      }),
    )
  })
})
