import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { RadioGroup } from '@foldkit/ui'

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
export type ReviewState = typeof CheckoutState.Review.Type
export type CartState = typeof CheckoutState.Cart.Type
export type PaymentState = typeof CheckoutState.Payment.Type
export type ConfirmedState = typeof CheckoutState.Confirmed.Type

export const TransitionLogEntry = Schema.Struct({
  id: Schema.Number,
  summary: Schema.String,
})
export type TransitionLogEntry = typeof TransitionLogEntry.Type

export const EDITION_RADIO_GROUP_ID = 'edition'

export const HARDCOVER_EDITION = 'Hardcover'
export const EBOOK_EDITION = 'E-book'

export const EDITIONS: ReadonlyArray<string> = [
  HARDCOVER_EDITION,
  EBOOK_EDITION,
]

export const editionName = (isShippingRequired: boolean): string =>
  isShippingRequired ? HARDCOVER_EDITION : EBOOK_EDITION

export const EditionRadioGroupBlock = RadioGroup.makeBlock()

export const Model = Schema.Struct({
  checkout: CheckoutState,
  editionRadioGroup: EditionRadioGroupBlock.Model,
  transitionLog: Schema.Array(TransitionLogEntry),
  nextTransitionLogId: Schema.Number,
})
export type Model = typeof Model.Type
