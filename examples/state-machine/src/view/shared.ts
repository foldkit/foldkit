import { Array, Match, Option, pipe } from 'effect'

import { promoToMaybeDiscount } from '../machine'
import { CheckoutState, Discount } from '../model'

export const PHYSICAL_PRICE = 52
export const DIGITAL_PRICE = 28
export const SALES_TAX_RATE = 0.0825

export const primaryButtonClassName =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500'

export const secondaryButtonClassName =
  'inline-flex min-h-12 cursor-pointer items-center justify-center whitespace-nowrap rounded-sm border border-stone-400 bg-transparent px-5 py-3 text-sm font-semibold text-stone-900 transition-colors hover:border-stone-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900'

export const promoFeedbackClassName =
  'min-h-4 text-xs font-bold uppercase tracking-wider'

export const cancelButtonClassName =
  'cursor-pointer text-sm font-medium text-stone-600 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900'

export const stateEyebrow = (state: CheckoutState): string =>
  CheckoutState.match(state, {
    Cart: () => 'Bag',
    Shipping: () => 'Delivery',
    Payment: () => 'Payment',
    Review: () => 'Review',
    Placing: () => 'Order',
    Confirmed: () => 'Order',
    Cancelled: () => 'Checkout',
  })

export const stateTitle = (state: CheckoutState): string =>
  CheckoutState.match(state, {
    Cart: () => 'Your order',
    Shipping: () => 'Delivery details',
    Payment: () => 'Payment',
    Review: () => 'Review and place order',
    Placing: () => 'Processing your order',
    Confirmed: () => 'Thank you',
    Cancelled: () => 'Checkout cancelled',
  })

export const stateDescription = (state: CheckoutState): string =>
  CheckoutState.match(state, {
    Cart: () => 'Choose your edition before continuing to checkout.',
    Shipping: () => 'Confirm where we should send your hardcover.',
    Payment: () => 'Select a saved payment method for this order.',
    Review: () => 'Check the details below before placing your order.',
    Placing: () => 'Please keep this page open for a moment.',
    Confirmed: () => 'Your order is confirmed and a receipt is on its way.',
    Cancelled: () => 'Nothing was charged. Your selection has been saved.',
  })

export const progressSteps: ReadonlyArray<string> = [
  'Bag',
  'Delivery',
  'Payment',
  'Review',
]

export const stateToMaybeProgressStep = (
  state: CheckoutState,
): Option.Option<string> =>
  Match.value(state).pipe(
    Match.tags({
      Cart: () => 'Bag',
      Shipping: () => 'Delivery',
      Payment: () => 'Payment',
      Review: () => 'Review',
      Cancelled: () => 'Bag',
    }),
    Match.option,
  )

export const currentProgressIndex = (state: CheckoutState): number =>
  pipe(
    stateToMaybeProgressStep(state),
    Option.flatMap(progressStep =>
      Array.findFirstIndex(progressSteps, step => step === progressStep),
    ),
    Option.getOrElse(() => progressSteps.length),
  )

export const editionPrice = (edition: string): number =>
  edition === 'Hardcover' ? PHYSICAL_PRICE : DIGITAL_PRICE

export const editionDescription = (edition: string): string =>
  edition === 'Hardcover'
    ? 'Clothbound, 248 pages. Ships in 1–2 business days.'
    : 'PDF and EPUB files delivered by email after purchase.'

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

export const stateToMaybeDiscount = (
  state: CheckoutState,
): Option.Option<Discount> =>
  Match.value(state).pipe(
    Match.tags({
      Review: reviewState => promoToMaybeDiscount(reviewState.promo),
      Placing: placingState => placingState.maybeDiscount,
      Confirmed: confirmedState => confirmedState.maybeDiscount,
    }),
    Match.option,
    Option.flatten,
  )
