import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { RadioGroup } from '@foldkit/ui'

export const Discount = Schema.Struct({
  code: Schema.String,
  percentOff: Schema.Number,
})

export const Promo = defineTaggedUnion({
  NoPromo: {},
  AppliedPromo: { discount: Discount },
  RejectedPromo: {},
})

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

export const EditionRadioGroup = RadioGroup.create()

export const Model = Schema.Struct({
  checkout: CheckoutState,
  editionRadioGroup: RadioGroup.Model,
  transitionLog: Schema.Array(TransitionLogEntry),
  nextTransitionLogId: Schema.Number,
})
export type Model = typeof Model.Type
