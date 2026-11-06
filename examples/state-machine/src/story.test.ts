import { Array, Option, pipe } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { PlaceOrder } from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { CheckoutState, type Model, Promo } from './model'
import { TRANSITION_LOG_LIMIT } from './transition'

const maybeLatestTransitionSummary = (model: Model): Option.Option<string> =>
  pipe(
    Array.head(model.transitionLog),
    Option.map(entry => entry.summary),
  )

describe('update', () => {
  it.effect('physical carts visit Shipping before Payment', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.init(),
      Story.message(Message.ClickedContinue()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Shipping')
        expect(maybeLatestTransitionSummary(model)).toEqual(
          Option.some('Cart -> Shipping on ClickedContinue'),
        )
      }),
      Story.message(Message.ClickedContinue()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Payment')
        expect(Array.map(model.transitionLog, entry => entry.summary)).toEqual([
          'Shipping -> Payment on ClickedContinue',
          'Cart -> Shipping on ClickedContinue',
        ])
      }),
    ),
  )

  it.effect('digital carts skip Shipping through the otherwise branch', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.init(),
      Story.message(Message.SelectedEdition({ isShippingRequired: false })),
      Story.message(Message.ClickedContinue()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Payment')
      }),
      Story.message(Message.ClickedBack()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Cart')
      }),
    ),
  )

  it.effect('starting over after cancelling keeps the selected edition', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.init(),
      Story.message(Message.SelectedEdition({ isShippingRequired: false })),
      Story.message(Message.ClickedCancel()),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Cancelled')
      }),
      Story.message(Message.ClickedStartOver()),
      Story.model(model => {
        expect(model.checkout).toStrictEqual(
          CheckoutState.Cart({ isShippingRequired: false }),
        )
      }),
    ),
  )

  it.effect(
    'a known promo code resolves to a discount and an unknown one clears it',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(),
        Story.message(Message.SelectedEdition({ isShippingRequired: false })),
        Story.message(Message.ClickedContinue()),
        Story.message(Message.ToggledPaymentMethod({ isSelected: true })),
        Story.message(Message.ClickedContinue()),
        Story.message(Message.UpdatedPromoCode({ value: ' reader10 ' })),
        Story.message(Message.SubmittedPromoCode()),
        Story.model(model => {
          expect(model.checkout._tag).toBe('Review')
          if (model.checkout._tag === 'Review') {
            expect(model.checkout.promo).toEqual(
              Promo.AppliedPromo({
                discount: { code: 'READER10', percentOff: 10 },
              }),
            )
          }
        }),
        Story.message(Message.UpdatedPromoCode({ value: 'BOGUS' })),
        Story.message(Message.SubmittedPromoCode()),
        Story.model(model => {
          expect(model.checkout._tag).toBe('Review')
          if (model.checkout._tag === 'Review') {
            expect(model.checkout.promo).toEqual(Promo.RejectedPromo())
          }
          expect(maybeLatestTransitionSummary(model)).toEqual(
            Option.some('Review -> Review on SubmittedPromoCode'),
          )
        }),
      ),
  )

  it.effect('unaccepted review ignores place order without a Command', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.init(),
      Story.message(Message.SelectedEdition({ isShippingRequired: false })),
      Story.message(Message.ClickedContinue()),
      Story.message(Message.ToggledPaymentMethod({ isSelected: true })),
      Story.message(Message.ClickedContinue()),
      Story.message(Message.ClickedPlaceOrder()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Review')
        expect(maybeLatestTransitionSummary(model)).toEqual(
          Option.some('ClickedPlaceOrder ignored in Review'),
        )
      }),
    ),
  )

  it.effect('ready review emits PlaceOrder after its guard passes', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.init(),
      Story.message(Message.SelectedEdition({ isShippingRequired: false })),
      Story.message(Message.ClickedContinue()),
      Story.message(Message.ToggledPaymentMethod({ isSelected: true })),
      Story.message(Message.ClickedContinue()),
      Story.message(Message.ToggledTermsAccepted({ isAccepted: true })),
      Story.message(Message.ClickedPlaceOrder()),
      Story.Command.expectExact(PlaceOrder({ isShippingRequired: false })),
      Story.Command.resolve(
        PlaceOrder,
        Message.CompletedPlaceOrder({ orderId: 'DIGI-1001' }),
      ),
      Story.model(model => {
        expect(model.checkout._tag).toBe('Confirmed')
        if (model.checkout._tag === 'Confirmed') {
          expect(model.checkout.orderId).toBe('DIGI-1001')
        }
      }),
    ),
  )

  it.effect('the transition log truncates to the newest twenty entries', () => {
    const messageCount = TRANSITION_LOG_LIMIT + 5

    return Story.story(
      { block: ApplicationBlock, layer },
      Story.init(),
      ...Array.map(
        Array.makeBy(messageCount, index =>
          Message.SelectedEdition({ isShippingRequired: index % 2 === 0 }),
        ),
        Story.message,
      ),
      Story.model(finalModel => {
        expect(finalModel.transitionLog).toHaveLength(TRANSITION_LOG_LIMIT)
        expect(
          Option.map(Array.head(finalModel.transitionLog), entry => entry.id),
        ).toEqual(Option.some(messageCount - 1))
        expect(
          Option.map(Array.last(finalModel.transitionLog), entry => entry.id),
        ).toEqual(Option.some(messageCount - TRANSITION_LOG_LIMIT))
      }),
    )
  })
})
