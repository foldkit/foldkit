import { Match, Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Discount = Schema.Struct({
  code: Schema.String,
  percentOff: Schema.Number,
})
export type Discount = typeof Discount.Type

export const Promo = defineTaggedUnion({
  NoPromo: {},
  AppliedPromo: { discount: Discount },
  RejectedPromo: {},
})
export type Promo = typeof Promo.Type

export const CheckoutState = defineTaggedUnion({
  Cart: { isShippingRequired: Schema.Boolean },
  Shipping: { isShippingRequired: Schema.Boolean },
  Payment: {
    isPaymentMethodSelected: Schema.Boolean,
    isShippingRequired: Schema.Boolean,
  },
  Review: {
    isPaymentMethodSelected: Schema.Boolean,
    isShippingRequired: Schema.Boolean,
    isTermsAccepted: Schema.Boolean,
    promo: Promo,
    promoCodeInput: Schema.String,
  },
  Placing: {
    isShippingRequired: Schema.Boolean,
    maybeDiscount: Schema.Option(Discount),
  },
  Confirmed: {
    isShippingRequired: Schema.Boolean,
    maybeDiscount: Schema.Option(Discount),
    orderId: Schema.String,
  },
  Cancelled: { isShippingRequired: Schema.Boolean },
})
export type CheckoutState = typeof CheckoutState.Type
export type CartState = typeof CheckoutState.Cart.Type
export type PaymentState = typeof CheckoutState.Payment.Type
export type ReviewState = typeof CheckoutState.Review.Type
export type PlacingState = typeof CheckoutState.Placing.Type
export type ConfirmedState = typeof CheckoutState.Confirmed.Type
export type CancelledState = typeof CheckoutState.Cancelled.Type

export const TransitionLogEntry = Schema.Struct({
  id: Schema.Number,
  summary: Schema.String,
})
export type TransitionLogEntry = typeof TransitionLogEntry.Type

export const HARDCOVER_EDITION = 'Hardcover'
export const EBOOK_EDITION = 'E-book'

export const PHYSICAL_PRICE = 52
export const DIGITAL_PRICE = 28
export const SALES_TAX_RATE = 0.0825

export const editionName = (isShippingRequired: boolean): string =>
  isShippingRequired ? HARDCOVER_EDITION : EBOOK_EDITION

export const promoToMaybeDiscount = (promo: Promo): Option.Option<Discount> =>
  Match.value(promo).pipe(
    Match.tags({ AppliedPromo: appliedPromo => appliedPromo.discount }),
    Match.option,
  )

export const isReviewReady = (review: ReviewState): boolean =>
  review.isPaymentMethodSelected && review.isTermsAccepted

export const formatMoney = (amount: number): string => `$${amount.toFixed(2)}`

export const roundToCents = (amount: number): number =>
  Math.round(amount * 100) / 100

export const orderPricing = (
  isShippingRequired: boolean,
  maybeDiscount: Option.Option<Discount>,
) => {
  const subtotal = isShippingRequired ? PHYSICAL_PRICE : DIGITAL_PRICE
  const maybeAppliedDiscount = Option.map(maybeDiscount, discount => ({
    code: discount.code,
    amount: roundToCents((subtotal * discount.percentOff) / 100),
  }))
  const discountedSubtotal =
    subtotal -
    Option.match(maybeAppliedDiscount, {
      onNone: () => 0,
      onSome: appliedDiscount => appliedDiscount.amount,
    })
  const tax = roundToCents(discountedSubtotal * SALES_TAX_RATE)

  return {
    subtotal,
    maybeAppliedDiscount,
    tax,
    total: discountedSubtotal + tax,
  }
}
