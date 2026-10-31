import { Array, Option, pipe } from 'effect'
import type { Resolved } from 'foldkit/block'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationLive,
  Message,
  type Model,
  PlaceOrder,
  TRANSITION_LOG_LIMIT,
} from './application'
import { CheckoutState, Promo } from './domain/checkout'

const maybeLatestTransitionSummary = (
  model: Resolved<Model>,
): Option.Option<string> =>
  pipe(
    Array.head(model.transitionLog),
    Option.map(entry => entry.summary),
  )

describe('update', () => {
  it.effect('physical carts visit Shipping before Payment', () =>
    story(
      ApplicationLive,
      message(Message.ClickedContinue()),
      Command.expectNone(),
      model(model => {
        expect(model.checkout._tag).toBe('Shipping')
        expect(maybeLatestTransitionSummary(model)).toEqual(
          Option.some('Cart -> Shipping on ClickedContinue'),
        )
      }),
      message(Message.ClickedContinue()),
      model(model => {
        expect(model.checkout._tag).toBe('Payment')
        expect(Array.map(model.transitionLog, entry => entry.summary)).toEqual([
          'Shipping -> Payment on ClickedContinue',
          'Cart -> Shipping on ClickedContinue',
        ])
      }),
    ),
  )

  it.effect('digital carts skip Shipping through the otherwise branch', () =>
    story(
      ApplicationLive,
      message(Message.SelectedEdition({ isShippingRequired: false })),
      message(Message.ClickedContinue()),
      model(model => {
        expect(model.checkout._tag).toBe('Payment')
      }),
      message(Message.ClickedBack()),
      model(model => {
        expect(model.checkout._tag).toBe('Cart')
      }),
    ),
  )

  it.effect('starting over after cancelling keeps the selected edition', () =>
    story(
      ApplicationLive,
      message(Message.SelectedEdition({ isShippingRequired: false })),
      message(Message.ClickedCancel()),
      model(model => {
        expect(model.checkout._tag).toBe('Cancelled')
      }),
      message(Message.ClickedStartOver()),
      model(model => {
        expect(model.checkout).toStrictEqual(
          CheckoutState.Cart({ isShippingRequired: false }),
        )
      }),
    ),
  )

  it.effect(
    'a known promo code resolves to a discount and an unknown one clears it',
    () =>
      story(
        ApplicationLive,
        message(Message.SelectedEdition({ isShippingRequired: false })),
        message(Message.ClickedContinue()),
        message(Message.ToggledPaymentMethod({ isSelected: true })),
        message(Message.ClickedContinue()),
        message(Message.UpdatedPromoCode({ value: ' reader10 ' })),
        message(Message.SubmittedPromoCode()),
        model(model => {
          expect(model.checkout._tag).toBe('Review')
          if (model.checkout._tag === 'Review') {
            expect(model.checkout.promo).toEqual(
              Promo.AppliedPromo({
                discount: { code: 'READER10', percentOff: 10 },
              }),
            )
          }
        }),
        message(Message.UpdatedPromoCode({ value: 'BOGUS' })),
        message(Message.SubmittedPromoCode()),
        model(model => {
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
    story(
      ApplicationLive,
      message(Message.SelectedEdition({ isShippingRequired: false })),
      message(Message.ClickedContinue()),
      message(Message.ToggledPaymentMethod({ isSelected: true })),
      message(Message.ClickedContinue()),
      message(Message.ClickedPlaceOrder()),
      Command.expectNone(),
      model(model => {
        expect(model.checkout._tag).toBe('Review')
        expect(maybeLatestTransitionSummary(model)).toEqual(
          Option.some('ClickedPlaceOrder ignored in Review'),
        )
      }),
    ),
  )

  it.effect('ready review emits PlaceOrder after its guard passes', () =>
    story(
      ApplicationLive,
      message(Message.SelectedEdition({ isShippingRequired: false })),
      message(Message.ClickedContinue()),
      message(Message.ToggledPaymentMethod({ isSelected: true })),
      message(Message.ClickedContinue()),
      message(Message.ToggledTermsAccepted({ isAccepted: true })),
      message(Message.ClickedPlaceOrder()),
      Command.expectExact(PlaceOrder({ isShippingRequired: false })),
      Command.resolve(
        PlaceOrder,
        Message.CompletedPlaceOrder({ orderId: 'DIGI-1001' }),
      ),
      model(model => {
        expect(model.checkout._tag).toBe('Confirmed')
        if (model.checkout._tag === 'Confirmed') {
          expect(model.checkout.orderId).toBe('DIGI-1001')
        }
      }),
    ),
  )

  it.effect('the transition log truncates to the newest twenty entries', () => {
    const messageCount = TRANSITION_LOG_LIMIT + 5

    return story(
      ApplicationLive,
      ...Array.makeBy(messageCount, index =>
        message(
          Message.SelectedEdition({ isShippingRequired: index % 2 === 0 }),
        ),
      ),
      model(model => {
        expect(model.transitionLog).toHaveLength(TRANSITION_LOG_LIMIT)
        expect(
          Option.map(Array.head(model.transitionLog), entry => entry.id),
        ).toEqual(Option.some(messageCount - 1))
        expect(
          Option.map(Array.last(model.transitionLog), entry => entry.id),
        ).toEqual(Option.some(messageCount - TRANSITION_LOG_LIMIT))
      }),
    )
  })
})
