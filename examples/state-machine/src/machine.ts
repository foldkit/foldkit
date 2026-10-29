import { Array, Match, Option, String, pipe } from 'effect'
import { Machine } from 'foldkit/experimental'
import { modifyFields } from 'foldkit/struct'

import { PlaceOrder } from './command'
import { Message } from './message'
import { CheckoutState, Discount, Promo } from './model'
import type { ReviewState } from './model'

const PROMO_DISCOUNTS: ReadonlyArray<Discount> = [
  { code: 'READER10', percentOff: 10 },
  { code: 'SIGNAL20', percentOff: 20 },
]

export const promoToMaybeDiscount = (promo: Promo): Option.Option<Discount> =>
  Match.value(promo).pipe(
    Match.tags({ AppliedPromo: appliedPromo => appliedPromo.discount }),
    Match.option,
  )

export const isReviewReady = (review: ReviewState): boolean =>
  review.isPaymentMethodSelected && review.isTermsAccepted

export const reviewToMaybeDiscount = (
  review: ReviewState,
): Option.Option<Discount> => {
  const normalizedCode = pipe(
    review.promoCodeInput,
    String.trim,
    String.toUpperCase,
  )

  return Array.findFirst(
    PROMO_DISCOUNTS,
    discount => discount.code === normalizedCode,
  )
}

const CheckoutDefinition = Machine.makeDefinition({
  State: CheckoutState,
  Message,
})
const {
  makeGuard,
  makeHandler,
  makeMachine,
  makeSharedTransitions,
  otherwise,
  to,
  when,
} = CheckoutDefinition

const maybeSubmittedDiscount = makeGuard(
  { from: 'Review', on: 'SubmittedPromoCode' },
  ({ state }) => reviewToMaybeDiscount(state),
)

const applySubmittedDiscount = makeHandler(
  maybeSubmittedDiscount,
  ({ state, guardValue: discount }) => ({
    model: modifyFields(state, {
      promo: () => Promo.AppliedPromo({ discount }),
    }),
  }),
)

export const checkoutMachine = makeMachine({
  initial: CheckoutState.Cart({ isShippingRequired: true }),
  shared: [
    makeSharedTransitions(['Cart', 'Shipping', 'Payment', 'Review'], {
      on: {
        ClickedCancel: to('Cancelled', ({ state }) => ({
          model: CheckoutState.Cancelled({
            isShippingRequired: state.isShippingRequired,
          }),
        })),
      },
    }),
    makeSharedTransitions(['Confirmed', 'Cancelled'], {
      on: {
        ClickedStartOver: to('Cart', ({ state }) => ({
          model: CheckoutState.Cart({
            isShippingRequired: state.isShippingRequired,
          }),
        })),
      },
    }),
  ],
  states: {
    Cart: {
      on: {
        SelectedEdition: to('Cart', ({ state, message }) => ({
          model: modifyFields(state, {
            isShippingRequired: () => message.isShippingRequired,
          }),
        })),
        ClickedContinue: [
          when(
            ({ state }) => state.isShippingRequired,
            'Shipping',
            ({ state }) => ({
              model: CheckoutState.Shipping({
                isShippingRequired: state.isShippingRequired,
              }),
            }),
          ),
          otherwise(
            to('Payment', ({ state }) => ({
              model: CheckoutState.Payment({
                isPaymentMethodSelected: false,
                isShippingRequired: state.isShippingRequired,
              }),
            })),
          ),
        ],
      },
    },
    Shipping: {
      on: {
        ClickedContinue: to('Payment', ({ state }) => ({
          model: CheckoutState.Payment({
            isPaymentMethodSelected: false,
            isShippingRequired: state.isShippingRequired,
          }),
        })),
        ClickedBack: to('Cart', ({ state }) => ({
          model: CheckoutState.Cart({
            isShippingRequired: state.isShippingRequired,
          }),
        })),
      },
    },
    Payment: {
      on: {
        ToggledPaymentMethod: to('Payment', ({ state, message }) => ({
          model: modifyFields(state, {
            isPaymentMethodSelected: () => message.isSelected,
          }),
        })),
        ClickedContinue: to('Review', ({ state }) => ({
          model: CheckoutState.Review({
            isPaymentMethodSelected: state.isPaymentMethodSelected,
            isShippingRequired: state.isShippingRequired,
            isTermsAccepted: false,
            promo: Promo.NoPromo(),
            promoCodeInput: '',
          }),
        })),
        ClickedBack: [
          when(
            ({ state }) => state.isShippingRequired,
            'Shipping',
            ({ state }) => ({
              model: CheckoutState.Shipping({
                isShippingRequired: state.isShippingRequired,
              }),
            }),
          ),
          otherwise(
            to('Cart', ({ state }) => ({
              model: CheckoutState.Cart({
                isShippingRequired: state.isShippingRequired,
              }),
            })),
          ),
        ],
      },
    },
    Review: {
      on: {
        ToggledPaymentMethod: to('Review', ({ state, message }) => ({
          model: modifyFields(state, {
            isPaymentMethodSelected: () => message.isSelected,
          }),
        })),
        ToggledTermsAccepted: to('Review', ({ state, message }) => ({
          model: modifyFields(state, {
            isTermsAccepted: () => message.isAccepted,
          }),
        })),
        UpdatedPromoCode: to('Review', ({ state, message }) => ({
          model: modifyFields(state, {
            promoCodeInput: () => message.value,
            promo: currentPromo =>
              currentPromo._tag === 'RejectedPromo'
                ? Promo.NoPromo()
                : currentPromo,
          }),
        })),
        SubmittedPromoCode: [
          when(maybeSubmittedDiscount, 'Review', applySubmittedDiscount),
          otherwise(
            to('Review', ({ state }) => ({
              model: modifyFields(state, {
                promo: () => Promo.RejectedPromo(),
              }),
            })),
          ),
        ],
        ClickedPlaceOrder: [
          when(
            ({ state }) => isReviewReady(state),
            'Placing',
            ({ state }) => ({
              model: CheckoutState.Placing({
                isShippingRequired: state.isShippingRequired,
                maybeDiscount: promoToMaybeDiscount(state.promo),
              }),
              commands: [
                PlaceOrder({ isShippingRequired: state.isShippingRequired }),
              ],
            }),
          ),
        ],
        ClickedBack: to('Payment', ({ state }) => ({
          model: CheckoutState.Payment({
            isPaymentMethodSelected: state.isPaymentMethodSelected,
            isShippingRequired: state.isShippingRequired,
          }),
        })),
      },
    },
    Placing: {
      on: {
        CompletedPlaceOrder: to('Confirmed', ({ state, message }) => ({
          model: CheckoutState.Confirmed({
            isShippingRequired: state.isShippingRequired,
            maybeDiscount: state.maybeDiscount,
            orderId: message.orderId,
          }),
        })),
      },
    },
  },
})
