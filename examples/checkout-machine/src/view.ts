import { clsx } from 'clsx'
import { Array, Match as M, Option, pipe } from 'effect'
import { Document, Html, html } from 'foldkit/html'

import { Button, Checkbox, Input, RadioGroup } from '@foldkit/ui'

import * as Icon from './icon'
import {
  ClickedBack,
  ClickedCancel,
  ClickedContinue,
  ClickedPlaceOrder,
  ClickedStartOver,
  SelectedEdition,
  SubmittedPromoCode,
  ToggledPaymentMethod,
  ToggledTermsAccepted,
  UpdatedPromoCode,
  checkoutMachine,
  isReviewReady,
  promoToMaybeDiscount,
} from './main'
import type {
  Cart,
  CheckoutState,
  Confirmed,
  Discount,
  Message,
  Model,
  Payment,
  Review,
} from './main'

// VIEW

const PHYSICAL_PRICE = 52
const DIGITAL_PRICE = 28
const SALES_TAX_RATE = 0.0825

const primaryButtonClassName =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500'

const secondaryButtonClassName =
  'inline-flex min-h-12 cursor-pointer items-center justify-center whitespace-nowrap rounded-sm border border-stone-400 bg-transparent px-5 py-3 text-sm font-semibold text-stone-900 transition-colors hover:border-stone-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900'

const promoFeedbackClassName =
  'min-h-4 text-xs font-bold uppercase tracking-wider'

const cancelButtonClassName =
  'cursor-pointer text-sm font-medium text-stone-600 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900'

const stateEyebrow = (state: typeof CheckoutState.Type): string =>
  M.value(state).pipe(
    M.tagsExhaustive({
      Cart: () => 'Bag',
      Shipping: () => 'Delivery',
      Payment: () => 'Payment',
      Review: () => 'Review',
      Placing: () => 'Order',
      Confirmed: () => 'Order',
      Cancelled: () => 'Checkout',
    }),
  )

const stateTitle = (state: typeof CheckoutState.Type): string =>
  M.value(state).pipe(
    M.tagsExhaustive({
      Cart: () => 'Your order',
      Shipping: () => 'Delivery details',
      Payment: () => 'Payment',
      Review: () => 'Review and place order',
      Placing: () => 'Processing your order',
      Confirmed: () => 'Thank you',
      Cancelled: () => 'Checkout cancelled',
    }),
  )

const stateDescription = (state: typeof CheckoutState.Type): string =>
  M.value(state).pipe(
    M.tagsExhaustive({
      Cart: () => 'Choose your edition before continuing to checkout.',
      Shipping: () => 'Confirm where we should send your hardcover.',
      Payment: () => 'Select a saved payment method for this order.',
      Review: () => 'Check the details below before placing your order.',
      Placing: () => 'Please keep this page open for a moment.',
      Confirmed: () => 'Your order is confirmed and a receipt is on its way.',
      Cancelled: () => 'Nothing was charged. Your selection has been saved.',
    }),
  )

const progressSteps: ReadonlyArray<string> = [
  'Bag',
  'Delivery',
  'Payment',
  'Review',
]

const stateToMaybeProgressStep = (
  state: typeof CheckoutState.Type,
): Option.Option<string> =>
  M.value(state).pipe(
    M.tags({
      Cart: () => 'Bag',
      Shipping: () => 'Delivery',
      Payment: () => 'Payment',
      Review: () => 'Review',
      Cancelled: () => 'Bag',
    }),
    M.option,
  )

const currentProgressIndex = (state: typeof CheckoutState.Type): number =>
  pipe(
    stateToMaybeProgressStep(state),
    Option.flatMap(progressStep =>
      Array.findFirstIndex(progressSteps, step => step === progressStep),
    ),
    Option.getOrElse(() => progressSteps.length),
  )

const EDITIONS: ReadonlyArray<string> = ['Hardcover', 'E-book']

const editionName = (isShippingRequired: boolean): string =>
  isShippingRequired ? 'Hardcover' : 'E-book'

const editionPrice = (edition: string): number =>
  edition === 'Hardcover' ? PHYSICAL_PRICE : DIGITAL_PRICE

const editionDescription = (edition: string): string =>
  edition === 'Hardcover'
    ? 'Clothbound, 248 pages. Ships in 1–2 business days.'
    : 'PDF and EPUB files delivered by email after purchase.'

const formatMoney = (amount: number): string => `$${amount.toFixed(2)}`

const roundToCents = (amount: number): number => Math.round(amount * 100) / 100

const orderPricing = (
  isShippingRequired: boolean,
  maybeDiscount: Option.Option<typeof Discount.Type>,
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

const stateToMaybeDiscount = (
  state: typeof CheckoutState.Type,
): Option.Option<typeof Discount.Type> =>
  M.value(state).pipe(
    M.tags({
      Review: reviewState => promoToMaybeDiscount(reviewState.promo),
      Placing: placingState => placingState.maybeDiscount,
      Confirmed: confirmedState => confirmedState.maybeDiscount,
    }),
    M.option,
    Option.flatten,
  )

const bookCoverView = (className: string, isCompact: boolean): Html => {
  const h = html()
  const coverClassName = clsx(
    'relative grid content-start overflow-hidden bg-orange-800 text-orange-50',
    className,
    {
      'h-24 w-16 pt-2.5 pr-2 pb-2 pl-3 shadow-lg': isCompact,
      'h-40 w-30 p-4 pl-6 shadow-xl': !isCompact,
    },
  )
  const ruleClassName = clsx('w-1/4 bg-current', {
    'mb-1.5 h-px': isCompact,
    'mb-3 h-0.5': !isCompact,
  })
  const eyebrowClassName = clsx('font-extrabold uppercase tracking-widest', {
    hidden: isCompact,
    'origin-left scale-75 text-xs': !isCompact,
  })
  const titleClassName = clsx('font-serif leading-none tracking-tighter', {
    'mt-1 text-xs': isCompact,
    'mt-2 text-base': !isCompact,
  })
  const authorClassName = clsx('mt-auto font-bold uppercase tracking-wider', {
    hidden: isCompact,
    'origin-left scale-75 text-xs': !isCompact,
  })

  return h.div(
    [h.AriaHidden(true), h.Class(coverClassName)],
    [
      h.div([h.Class('absolute inset-y-0 left-3 w-px bg-orange-100/30')], []),
      h.div(
        [
          h.Class(
            'absolute inset-x-0 bottom-0 h-1 border-t border-stone-900/25 bg-orange-50',
          ),
        ],
        [],
      ),
      h.div([h.Class(ruleClassName)], []),
      h.div([h.Class(eyebrowClassName)], ['Signal Press']),
      h.div(
        [h.Class(titleClassName)],
        ['Designing', h.br([]), 'Durable', h.br([]), 'Interfaces'],
      ),
      h.div([h.Class(authorClassName)], ['Mira Chen']),
    ],
  )
}

const pageHeaderView = (): Html => {
  const h = html<Message>()

  return h.header(
    [h.Class('border-b border-stone-300 bg-stone-50')],
    [
      h.div(
        [
          h.Class(
            'mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8',
          ),
        ],
        [
          h.div(
            [h.Class('flex items-center gap-3')],
            [
              h.div(
                [
                  h.AriaHidden(true),
                  h.Class(
                    'grid h-9 w-9 place-items-center bg-stone-900 text-xs font-bold tracking-widest text-white',
                  ),
                ],
                ['SP'],
              ),
              h.div(
                [],
                [
                  h.div(
                    [
                      h.Class(
                        'text-sm font-bold uppercase tracking-widest text-stone-900',
                      ),
                    ],
                    ['Signal Press'],
                  ),
                  h.div(
                    [h.Class('hidden text-xs text-stone-600 sm:block')],
                    ['Independent books on design and technology'],
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                'flex items-center gap-2 text-xs font-medium text-stone-600',
              ),
            ],
            [Icon.lockClosed(), 'Secure checkout'],
          ),
        ],
      ),
    ],
  )
}

const progressIndicatorClassName = (
  isActive: boolean,
  isComplete: boolean,
  isSkipped: boolean,
): string => {
  const isCompleteOrSkipped = isComplete || isSkipped

  return clsx(
    'grid h-6 w-6 place-items-center rounded-full border-2 sm:h-7 sm:w-7',
    {
      'border-stone-900 bg-stone-900 text-white': isCompleteOrSkipped,
      'border-stone-900 bg-stone-50 text-stone-900':
        !isCompleteOrSkipped && isActive,
      'border-stone-300 bg-stone-50 text-stone-600':
        !isCompleteOrSkipped && !isActive,
    },
  )
}

const progressView = (state: typeof CheckoutState.Type): Html => {
  const h = html<Message>()
  const progressIndex = currentProgressIndex(state)

  return h.nav(
    [h.AriaLabel('Checkout progress'), h.Class('w-full pt-7 sm:pt-9')],
    [
      h.ol(
        [h.Class('grid grid-cols-4 gap-2 sm:gap-5')],
        Array.map(progressSteps, (stepLabel, index) => {
          const isActive = progressIndex === index
          const isComplete = progressIndex > index
          const isSkipped =
            stepLabel === 'Delivery' &&
            !state.isShippingRequired &&
            progressIndex > index
          const indicatorClassName = progressIndicatorClassName(
            isActive,
            isComplete,
            isSkipped,
          )

          return h.keyed('li')(
            stepLabel,
            [h.Class('min-w-0 border-t border-stone-300 pt-3')],
            [
              h.div(
                [h.Class('flex items-center gap-1 sm:gap-2')],
                [
                  h.span(
                    [h.Class(indicatorClassName)],
                    [
                      isComplete || isSkipped
                        ? Icon.check('h-3.5 w-3.5')
                        : String(index + 1),
                    ],
                  ),
                  h.span(
                    [
                      h.Class(
                        clsx('truncate text-xs sm:text-sm', {
                          'font-bold uppercase tracking-wider text-stone-900':
                            isActive,
                          'font-medium text-stone-600': !isActive,
                        }),
                      ),
                    ],
                    [isSkipped ? `${stepLabel} skipped` : stepLabel],
                  ),
                ],
              ),
            ],
          )
        }),
      ),
    ],
  )
}

const editionOptionView = (
  option: RadioGroup.OptionInfo<string, Message>,
): Html => {
  const h = html<Message>()
  const selectionBadgeClassName =
    'mt-2 inline-flex text-xs font-bold uppercase tracking-wider'

  return h.keyed('button')(
    option.value,
    [
      ...option.option,
      h.Class(
        clsx(
          'relative cursor-pointer border-2 p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900',
          {
            'border-stone-900 bg-white': option.isSelected,
            'border-stone-300 bg-stone-50 hover:border-stone-500 hover:bg-white':
              !option.isSelected,
          },
        ),
      ),
    ],
    [
      h.div(
        [h.Class('flex items-start justify-between gap-4')],
        [
          h.div(
            [],
            [
              h.div(
                [...option.label, h.Class('text-sm font-bold text-stone-900')],
                [option.value],
              ),
              h.p(
                [
                  ...option.description,
                  h.Class('mt-1 text-xs leading-5 text-stone-600'),
                ],
                [editionDescription(option.value)],
              ),
            ],
          ),
          h.div(
            [h.Class('text-right')],
            [
              h.div(
                [h.Class('text-sm font-bold text-stone-900')],
                [formatMoney(editionPrice(option.value))],
              ),
              option.isSelected
                ? h.keyed('span')(
                    'selected',
                    [
                      h.Class(
                        clsx(
                          selectionBadgeClassName,
                          'items-center gap-1 text-orange-800',
                        ),
                      ),
                    ],
                    [Icon.check('h-3 w-3'), 'Selected'],
                  )
                : h.keyed('span')(
                    'choose',
                    [h.Class(clsx(selectionBadgeClassName, 'text-stone-600'))],
                    ['Choose'],
                  ),
            ],
          ),
        ],
      ),
    ],
  )
}

const cancelCheckoutButton = (): Html => {
  const h = html<Message>()

  return Button.view<Message>({
    onClick: ClickedCancel(),
    toView: attributes =>
      h.button(
        [...attributes.button, h.Class(cancelButtonClassName)],
        ['Cancel checkout'],
      ),
  })
}

const cartView = (state: typeof Cart.Type): Html => {
  const h = html<Message>()
  const continueLabel = state.isShippingRequired
    ? 'Continue to delivery'
    : 'Continue to payment'

  return h.div(
    [h.Class('grid gap-8')],
    [
      h.div(
        [
          h.Class(
            'grid gap-6 border-y border-stone-300 py-6 sm:grid-cols-4 sm:items-center',
          ),
        ],
        [
          bookCoverView('mx-auto sm:mx-0', false),
          h.div(
            [h.Class('sm:col-span-3')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-orange-800',
                  ),
                ],
                ['New release'],
              ),
              h.h2(
                [h.Class('mt-2 font-serif text-2xl text-stone-900')],
                ['Designing Durable Interfaces'],
              ),
              h.p([h.Class('mt-1 text-sm text-stone-600')], ['By Mira Chen']),
              h.p(
                [h.Class('mt-4 max-w-lg text-sm leading-6 text-stone-600')],
                [
                  'A practical field guide to state, feedback, and resilient interaction design.',
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-3')],
        [
          h.div(
            [h.Class('mb-3 text-sm font-bold text-stone-900')],
            ['Choose an edition'],
          ),
          RadioGroup.view<string, Message>({
            id: 'edition',
            selectedValue: Option.some(editionName(state.isShippingRequired)),
            options: EDITIONS,
            ariaLabel: 'Choose an edition',
            orientation: 'Horizontal',
            onSelect: edition =>
              SelectedEdition({ isShippingRequired: edition === 'Hardcover' }),
            toView: ({ group, options }) =>
              h.div(
                [...group, h.Class('grid gap-3 sm:grid-cols-2')],
                Array.map(options, editionOptionView),
              ),
          }),
        ],
      ),
      h.div(
        [
          h.Class(
            'flex flex-col gap-4 border-t border-stone-300 pt-6 sm:flex-row sm:items-center sm:justify-between',
          ),
        ],
        [
          cancelCheckoutButton(),
          Button.view<Message>({
            onClick: ClickedContinue(),
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class(primaryButtonClassName)],
                [continueLabel, Icon.arrowRight()],
              ),
          }),
        ],
      ),
    ],
  )
}

const shippingView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('grid gap-7')],
    [
      h.section(
        [h.AriaLabel('Contact information')],
        [
          h.div(
            [h.Class('border-b border-stone-300 pb-5')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-600',
                  ),
                ],
                ['Contact'],
              ),
              h.div(
                [h.Class('mt-2 text-sm font-medium text-stone-900')],
                ['alex.morgan@example.com'],
              ),
            ],
          ),
        ],
      ),
      h.section(
        [h.AriaLabel('Delivery address')],
        [
          h.div(
            [
              h.Class(
                'grid gap-4 border-2 border-stone-900 bg-white p-5 sm:grid-cols-4',
              ),
            ],
            [
              h.div(
                [h.Class('sm:col-span-3')],
                [
                  h.div(
                    [h.Class('flex items-center gap-2')],
                    [
                      h.span(
                        [
                          h.Class(
                            'grid h-5 w-5 place-items-center rounded-full bg-stone-900 text-white',
                          ),
                        ],
                        [Icon.check('h-3 w-3')],
                      ),
                      h.h2(
                        [h.Class('text-sm font-bold text-stone-900')],
                        ['Saved address'],
                      ),
                    ],
                  ),
                  h.address(
                    [
                      h.Class(
                        'mt-3 text-sm not-italic leading-6 text-stone-600',
                      ),
                    ],
                    [
                      'Alex Morgan',
                      h.br([]),
                      '42 Market Street',
                      h.br([]),
                      'Brooklyn, NY 11201',
                      h.br([]),
                      'United States',
                    ],
                  ),
                ],
              ),
              h.div(
                [
                  h.Class(
                    'self-start text-xs font-bold uppercase tracking-wider text-orange-800',
                  ),
                ],
                ['Selected'],
              ),
            ],
          ),
        ],
      ),
      h.section(
        [h.AriaLabel('Delivery method')],
        [
          h.h2(
            [h.Class('text-sm font-bold text-stone-900')],
            ['Delivery method'],
          ),
          h.div(
            [
              h.Class(
                'mt-3 flex items-center justify-between gap-4 border border-stone-300 bg-stone-50 p-4',
              ),
            ],
            [
              h.div(
                [h.Class('flex items-center gap-3')],
                [
                  Icon.truck('h-6 w-6 text-stone-600'),
                  h.div(
                    [],
                    [
                      h.div(
                        [h.Class('text-sm font-bold text-stone-900')],
                        ['Standard tracked delivery'],
                      ),
                      h.div(
                        [h.Class('mt-1 text-xs text-stone-600')],
                        ['Estimated arrival: 4–6 business days'],
                      ),
                    ],
                  ),
                ],
              ),
              h.div([h.Class('text-sm font-bold text-stone-900')], ['Free']),
            ],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'grid gap-4 border-t border-stone-300 pt-6 sm:grid-cols-3 sm:items-center',
          ),
        ],
        [
          Button.view<Message>({
            onClick: ClickedBack(),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    clsx(secondaryButtonClassName, 'sm:justify-self-start'),
                  ),
                ],
                ['Back to bag'],
              ),
          }),
          h.div([h.Class('sm:justify-self-center')], [cancelCheckoutButton()]),
          Button.view<Message>({
            onClick: ClickedContinue(),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(clsx(primaryButtonClassName, 'sm:justify-self-end')),
                ],
                ['Continue to payment', Icon.arrowRight()],
              ),
          }),
        ],
      ),
    ],
  )
}

const paymentView = (state: typeof Payment.Type): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('grid gap-7')],
    [
      h.div(
        [
          h.Class(
            'flex items-start gap-3 border border-stone-300 bg-stone-50 p-4 text-sm leading-6 text-stone-600',
          ),
        ],
        [
          Icon.lockClosed('mt-0.5 h-5 w-5 shrink-0'),
          h.p(
            [],
            [
              'Payments are encrypted. Signal Press never stores your full card number.',
            ],
          ),
        ],
      ),
      h.section(
        [h.AriaLabel('Saved payment methods')],
        [
          h.h2(
            [h.Class('text-sm font-bold text-stone-900')],
            ['Saved payment method'],
          ),
          Checkbox.view<Message>({
            id: 'saved-card',
            isChecked: state.isPaymentMethodSelected,
            onToggle: isSelected => ToggledPaymentMethod({ isSelected }),
            toView: attributes =>
              h.div(
                [
                  ...attributes.checkbox,
                  h.Class(
                    clsx(
                      'mt-3 flex w-full cursor-pointer items-center justify-between gap-4 border-2 p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900',
                      {
                        'border-stone-900 bg-white':
                          state.isPaymentMethodSelected,
                        'border-stone-300 bg-stone-50 transition-colors hover:border-stone-500 hover:bg-white':
                          !state.isPaymentMethodSelected,
                      },
                    ),
                  ),
                ],
                [
                  h.div(
                    [h.Class('flex items-center gap-4')],
                    [
                      h.div(
                        [
                          h.Class(
                            'grid h-10 w-14 place-items-center border border-stone-300 bg-stone-50 text-xs font-bold tracking-widest text-stone-900',
                          ),
                        ],
                        ['MC'],
                      ),
                      h.div(
                        [],
                        [
                          h.div(
                            [
                              ...attributes.label,
                              h.Class('text-sm font-bold text-stone-900'),
                            ],
                            ['Mastercard •••• 4242'],
                          ),
                          h.div(
                            [
                              ...attributes.description,
                              h.Class('mt-1 text-xs text-stone-600'),
                            ],
                            ['Expires 08/29'],
                          ),
                        ],
                      ),
                    ],
                  ),
                  h.span(
                    [
                      h.Class(
                        clsx('h-6 w-6 rounded-full border', {
                          'grid place-items-center border-stone-900 bg-stone-900 text-white':
                            state.isPaymentMethodSelected,
                          'border-stone-500': !state.isPaymentMethodSelected,
                        }),
                      ),
                    ],
                    [
                      state.isPaymentMethodSelected
                        ? Icon.check('h-3.5 w-3.5')
                        : h.empty,
                    ],
                  ),
                ],
              ),
          }),
          h.p(
            [h.Class('mt-3 text-xs leading-5 text-stone-600')],
            [
              'Select the card above to continue. No charge is made until you place the order.',
            ],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'grid gap-4 border-t border-stone-300 pt-6 sm:grid-cols-3 sm:items-center',
          ),
        ],
        [
          Button.view<Message>({
            onClick: ClickedBack(),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    clsx(secondaryButtonClassName, 'sm:justify-self-start'),
                  ),
                ],
                [state.isShippingRequired ? 'Back to delivery' : 'Back to bag'],
              ),
          }),
          h.div([h.Class('sm:justify-self-center')], [cancelCheckoutButton()]),
          Button.view<Message>({
            onClick: ClickedContinue(),
            isDisabled: !state.isPaymentMethodSelected,
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(clsx(primaryButtonClassName, 'sm:justify-self-end')),
                ],
                ['Review order', Icon.arrowRight()],
              ),
          }),
        ],
      ),
    ],
  )
}

const reviewView = (state: typeof Review.Type): Html => {
  const h = html<Message>()
  const isReadyToPlace = isReviewReady(state)
  const pricing = orderPricing(
    state.isShippingRequired,
    promoToMaybeDiscount(state.promo),
  )

  return h.div(
    [h.Class('grid gap-7')],
    [
      h.div(
        [h.Class('divide-y divide-stone-300 border-y border-stone-300')],
        [
          h.div(
            [h.Class('grid gap-2 py-5 sm:grid-cols-4 sm:items-start')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-600',
                  ),
                ],
                ['Edition'],
              ),
              h.div(
                [h.Class('sm:col-span-2')],
                [
                  h.div(
                    [h.Class('text-sm font-bold text-stone-900')],
                    [editionName(state.isShippingRequired)],
                  ),
                  h.div(
                    [h.Class('mt-1 text-xs text-stone-600')],
                    ['Designing Durable Interfaces'],
                  ),
                ],
              ),
              h.div(
                [h.Class('text-sm font-bold text-stone-900')],
                [formatMoney(pricing.subtotal)],
              ),
            ],
          ),
          h.div(
            [h.Class('grid gap-2 py-5 sm:grid-cols-4 sm:items-start')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-600',
                  ),
                ],
                [state.isShippingRequired ? 'Delivery' : 'Fulfillment'],
              ),
              h.div(
                [h.Class('sm:col-span-2')],
                [
                  h.div(
                    [h.Class('text-sm font-bold text-stone-900')],
                    [
                      state.isShippingRequired
                        ? 'Standard tracked delivery'
                        : 'Email delivery',
                    ],
                  ),
                  h.div(
                    [h.Class('mt-1 text-xs leading-5 text-stone-600')],
                    [
                      state.isShippingRequired
                        ? 'Alex Morgan · 42 Market Street · Brooklyn, NY 11201'
                        : 'PDF and EPUB files sent to alex.morgan@example.com',
                    ],
                  ),
                ],
              ),
              h.div([h.Class('text-sm font-bold text-stone-900')], ['Free']),
            ],
          ),
          h.div(
            [h.Class('grid gap-2 py-5 sm:grid-cols-4 sm:items-center')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-600',
                  ),
                ],
                ['Payment'],
              ),
              h.div(
                [
                  h.Class(
                    'flex items-center gap-2 text-sm text-stone-900 sm:col-span-2',
                  ),
                ],
                [
                  Icon.creditCard(),
                  state.isPaymentMethodSelected
                    ? 'Mastercard •••• 4242'
                    : 'Payment method required',
                ],
              ),
              Button.view<Message>({
                onClick: ToggledPaymentMethod({
                  isSelected: !state.isPaymentMethodSelected,
                }),
                toView: attributes =>
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'cursor-pointer text-xs font-bold uppercase tracking-wider text-orange-800 underline underline-offset-4',
                      ),
                    ],
                    [
                      state.isPaymentMethodSelected
                        ? 'Change'
                        : 'Use saved card',
                    ],
                  ),
              }),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-2')],
        [
          h.form(
            [h.Class('flex items-end gap-3'), h.OnSubmit(SubmittedPromoCode())],
            [
              Input.view<Message>({
                id: 'promo-code',
                value: state.promoCodeInput,
                onInput: value => UpdatedPromoCode({ value }),
                toView: attributes =>
                  h.div(
                    [h.Class('grid flex-1 gap-2 sm:max-w-xs')],
                    [
                      h.label(
                        [
                          ...attributes.label,
                          h.Class(
                            'text-xs font-bold uppercase tracking-widest text-stone-600',
                          ),
                        ],
                        ['Promo code'],
                      ),
                      h.input([
                        ...attributes.input,
                        h.Class(
                          'min-h-12 border border-stone-500 bg-white px-3 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900',
                        ),
                      ]),
                    ],
                  ),
              }),
              Button.view<Message>({
                type: 'submit',
                toView: attributes =>
                  h.button(
                    [...attributes.button, h.Class(secondaryButtonClassName)],
                    ['Apply'],
                  ),
              }),
            ],
          ),
          h.keyed('div')(
            state.promo._tag,
            [],
            [
              M.value(state.promo).pipe(
                M.tagsExhaustive({
                  NoPromo: () => h.p([h.Class(promoFeedbackClassName)], ['']),
                  AppliedPromo: ({ discount }) =>
                    h.p(
                      [
                        h.Class(
                          clsx(promoFeedbackClassName, 'text-orange-800'),
                        ),
                      ],
                      [
                        `${discount.code} applied · ${discount.percentOff}% off`,
                      ],
                    ),
                  RejectedPromo: () =>
                    h.p(
                      [h.Class(clsx(promoFeedbackClassName, 'text-red-700'))],
                      ["That code isn't recognized."],
                    ),
                }),
              ),
            ],
          ),
        ],
      ),
      Checkbox.view<Message>({
        id: 'accept-terms',
        isChecked: state.isTermsAccepted,
        onToggle: isAccepted => ToggledTermsAccepted({ isAccepted }),
        toView: attributes =>
          h.div(
            [
              h.Class(
                'flex items-start gap-3 text-sm leading-6 text-stone-600',
              ),
            ],
            [
              h.span(
                [
                  ...attributes.checkbox,
                  h.Class(
                    clsx(
                      'mt-0.5 h-5 w-5 shrink-0 cursor-pointer border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900',
                      {
                        'grid place-items-center border-stone-900 bg-stone-900 text-white':
                          state.isTermsAccepted,
                        'border-stone-500 bg-white': !state.isTermsAccepted,
                      },
                    ),
                  ),
                ],
                [state.isTermsAccepted ? Icon.check('h-3.5 w-3.5') : h.empty],
              ),
              h.span(
                [],
                [
                  h.span(
                    [...attributes.label, h.Class('sr-only')],
                    ['Accept terms of sale'],
                  ),
                  h.span(
                    [
                      ...attributes.description,
                      h.OnClick(
                        ToggledTermsAccepted({
                          isAccepted: !state.isTermsAccepted,
                        }),
                      ),
                      h.Class('cursor-pointer'),
                    ],
                    [
                      state.isShippingRequired
                        ? 'I agree to the terms of sale and return policy.'
                        : 'I agree to the terms of sale and understand that digital purchases are delivered immediately.',
                    ],
                  ),
                ],
              ),
            ],
          ),
      }),
      h.div(
        [
          h.Class(
            'grid gap-4 border-t border-stone-300 pt-6 sm:grid-cols-3 sm:items-center',
          ),
        ],
        [
          Button.view<Message>({
            onClick: ClickedBack(),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(
                    clsx(secondaryButtonClassName, 'sm:justify-self-start'),
                  ),
                ],
                ['Back to payment'],
              ),
          }),
          h.div([h.Class('sm:justify-self-center')], [cancelCheckoutButton()]),
          Button.view<Message>({
            onClick: ClickedPlaceOrder(),
            isDisabled: !isReadyToPlace,
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.Class(clsx(primaryButtonClassName, 'sm:justify-self-end')),
                ],
                [`Place order · ${formatMoney(pricing.total)}`],
              ),
          }),
        ],
      ),
    ],
  )
}

const placingView = (): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Role('status'),
      h.AriaLive('polite'),
      h.Class('grid min-h-72 place-items-center text-center'),
    ],
    [
      h.div(
        [],
        [
          h.div(
            [
              h.Class(
                'mx-auto h-12 w-12 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 motion-reduce:animate-none',
              ),
            ],
            [],
          ),
          h.p(
            [h.Class('mt-6 text-sm leading-6 text-stone-600')],
            ['Authorizing payment and reserving your copy…'],
          ),
        ],
      ),
    ],
  )
}

const confirmedView = (state: typeof Confirmed.Type): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'grid min-h-80 content-center justify-items-center py-8 text-center',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'grid h-14 w-14 place-items-center rounded-full bg-stone-900 text-white',
          ),
        ],
        [Icon.check('h-7 w-7')],
      ),
      h.h2(
        [h.Class('mt-6 font-serif text-3xl text-stone-900')],
        [`Order ${state.orderId} confirmed`],
      ),
      h.p(
        [h.Class('mt-3 max-w-md text-sm leading-6 text-stone-600')],
        [
          state.isShippingRequired
            ? 'We’ll email tracking details when your hardcover leaves the press.'
            : 'Your PDF and EPUB download links are on their way to alex.morgan@example.com.',
        ],
      ),
      h.div(
        [
          h.Class(
            'mt-7 border-y border-stone-300 px-8 py-4 text-xs font-bold uppercase tracking-widest text-stone-600',
          ),
        ],
        [`Order reference · ${state.orderId}`],
      ),
      Button.view<Message>({
        onClick: ClickedStartOver(),
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.Class(clsx(primaryButtonClassName, 'mt-7')),
            ],
            ['Return to checkout'],
          ),
      }),
    ],
  )
}

const cancelledView = (): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'grid min-h-72 content-center justify-items-center py-8 text-center',
      ),
    ],
    [
      h.div(
        [
          h.AriaHidden(true),
          h.Class(
            'grid h-14 w-14 place-items-center rounded-full border border-stone-400 font-serif text-2xl text-stone-500',
          ),
        ],
        ['×'],
      ),
      h.p(
        [h.Class('mt-6 max-w-md text-sm leading-6 text-stone-600')],
        [
          'Your checkout was cancelled before payment. You can begin again whenever you’re ready.',
        ],
      ),
      Button.view<Message>({
        onClick: ClickedStartOver(),
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.Class(clsx(primaryButtonClassName, 'mt-7')),
            ],
            ['Start checkout again'],
          ),
      }),
    ],
  )
}

const checkoutContentView = (state: typeof CheckoutState.Type): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    state._tag,
    [],
    [
      M.value(state).pipe(
        M.tagsExhaustive({
          Cart: cartView,
          Shipping: shippingView,
          Payment: paymentView,
          Review: reviewView,
          Placing: placingView,
          Confirmed: confirmedView,
          Cancelled: cancelledView,
        }),
      ),
    ],
  )
}

const checkoutPanelView = (state: typeof CheckoutState.Type): Html => {
  const h = html<Message>()

  return h.section(
    [
      h.Class(
        'border border-stone-300 bg-stone-50 px-5 py-7 sm:px-8 sm:py-9 lg:col-span-2',
      ),
    ],
    [
      h.div(
        [h.Class('mb-8 max-w-2xl')],
        [
          h.div(
            [
              h.Class(
                'text-xs font-bold uppercase tracking-widest text-orange-800',
              ),
            ],
            [stateEyebrow(state)],
          ),
          h.h1(
            [h.Class('mt-3 font-serif text-3xl text-stone-900 sm:text-4xl')],
            [stateTitle(state)],
          ),
          h.p(
            [h.Class('mt-3 text-sm leading-6 text-stone-600')],
            [stateDescription(state)],
          ),
        ],
      ),
      checkoutContentView(state),
    ],
  )
}

const orderSummaryView = (state: typeof CheckoutState.Type): Html => {
  const h = html<Message>()
  const pricing = orderPricing(
    state.isShippingRequired,
    stateToMaybeDiscount(state),
  )
  const summaryRowClassName = 'flex items-center justify-between gap-4'
  const orderNoteClassName =
    'mt-5 flex items-start gap-2 text-xs leading-5 text-stone-600'

  return h.aside(
    [
      h.AriaLabel('Order summary'),
      h.Class(
        'h-fit border border-stone-300 bg-stone-200 p-5 lg:sticky lg:top-6 sm:p-6',
      ),
    ],
    [
      h.h2(
        [h.Class('text-sm font-bold uppercase tracking-widest text-stone-900')],
        ['Order summary'],
      ),
      h.div(
        [h.Class('mt-5 grid grid-cols-4 gap-4 border-b border-stone-300 pb-5')],
        [
          bookCoverView('', true),
          h.div(
            [h.Class('col-span-3')],
            [
              h.div(
                [h.Class('font-serif text-base leading-5 text-stone-900')],
                ['Designing Durable Interfaces'],
              ),
              h.div(
                [h.Class('mt-2 text-xs text-stone-600')],
                [`${editionName(state.isShippingRequired)} · Qty 1`],
              ),
              h.div(
                [h.Class('mt-3 text-sm font-bold text-stone-900')],
                [formatMoney(pricing.subtotal)],
              ),
            ],
          ),
        ],
      ),
      h.dl(
        [h.Class('grid gap-3 border-b border-stone-300 py-5 text-sm')],
        [
          h.keyed('div')(
            'subtotal',
            [h.Class(summaryRowClassName)],
            [
              h.dt([h.Class('text-stone-600')], ['Subtotal']),
              h.dd(
                [h.Class('font-medium text-stone-900')],
                [formatMoney(pricing.subtotal)],
              ),
            ],
          ),
          ...Option.match(pricing.maybeAppliedDiscount, {
            onNone: () => [],
            onSome: appliedDiscount => [
              h.keyed('div')(
                'discount',
                [h.Class(summaryRowClassName)],
                [
                  h.dt(
                    [h.Class('text-stone-600')],
                    [`Discount · ${appliedDiscount.code}`],
                  ),
                  h.dd(
                    [h.Class('font-medium text-orange-800')],
                    [`-${formatMoney(appliedDiscount.amount)}`],
                  ),
                ],
              ),
            ],
          }),
          h.keyed('div')(
            'delivery',
            [h.Class(summaryRowClassName)],
            [
              h.dt(
                [h.Class('text-stone-600')],
                [state.isShippingRequired ? 'Shipping' : 'Email delivery'],
              ),
              h.dd([h.Class('font-medium text-stone-900')], ['Free']),
            ],
          ),
          h.keyed('div')(
            'tax',
            [h.Class(summaryRowClassName)],
            [
              h.dt([h.Class('text-stone-600')], ['Estimated tax']),
              h.dd(
                [h.Class('font-medium text-stone-900')],
                [formatMoney(pricing.tax)],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex items-baseline justify-between gap-4 pt-5')],
        [
          h.div([h.Class('text-sm font-bold text-stone-900')], ['Total']),
          h.div(
            [h.Class('font-serif text-2xl text-stone-900')],
            [formatMoney(pricing.total)],
          ),
        ],
      ),
      state.isShippingRequired
        ? h.keyed('div')(
            'shipping-note',
            [h.Class(orderNoteClassName)],
            [
              Icon.truck('mt-0.5 h-4 w-4 shrink-0'),
              'Free tracked shipping in the United States.',
            ],
          )
        : h.keyed('div')(
            'download-note',
            [h.Class(orderNoteClassName)],
            [
              Icon.download('mt-0.5 h-4 w-4 shrink-0'),
              'Download links arrive immediately after purchase.',
            ],
          ),
    ],
  )
}

const formatTags = (tags: ReadonlyArray<string>): string =>
  Array.match(tags, {
    onEmpty: () => 'None',
    onNonEmpty: Array.join(', '),
  })

const transitionStatusView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Role('status'),
      h.Class(
        'border-l-2 border-orange-700 pl-3 font-mono text-xs leading-5 text-stone-300 lg:col-span-3',
      ),
    ],
    [
      Option.getOrElse(
        model.maybeLastTransitionSummary,
        () => 'Waiting for the first checkout event',
      ),
    ],
  )
}

const analysisView = (model: Model): Html => {
  const h = html<Message>()
  const deadTransitions = checkoutMachine.deadTransitions()

  return h.section(
    [
      h.AriaLabel('State machine inspector'),
      h.Class('border border-stone-800 bg-stone-900 text-stone-100'),
    ],
    [
      h.div(
        [h.Class('grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-3 lg:items-start')],
        [
          h.div(
            [h.Class('lg:col-span-2')],
            [
              h.div(
                [h.Class('flex items-center gap-2 text-orange-300')],
                [
                  Icon.codeBracket(),
                  h.div(
                    [h.Class('text-xs font-bold uppercase tracking-widest')],
                    ['Developer view'],
                  ),
                ],
              ),
              h.h2(
                [h.Class('mt-3 font-serif text-2xl')],
                ['State machine inspector'],
              ),
              h.p(
                [h.Class('mt-2 max-w-2xl text-sm leading-6 text-stone-400')],
                [
                  'The storefront below is driven by the same explicit machine shown here. Every interaction produces a Message and a deterministic transition.',
                ],
              ),
            ],
          ),
          h.dl(
            [h.Class('grid grid-cols-2 gap-x-6 gap-y-2 text-xs')],
            [
              h.div(
                [],
                [
                  h.dt([h.Class('text-stone-400')], ['Unreachable']),
                  h.dd(
                    [h.Class('mt-1 font-mono text-stone-100')],
                    [formatTags(checkoutMachine.unreachableStates())],
                  ),
                ],
              ),
              h.div(
                [],
                [
                  h.dt([h.Class('text-stone-400')], ['Dead transitions']),
                  h.dd(
                    [h.Class('mt-1 font-mono text-stone-100')],
                    [String(deadTransitions.length)],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-5 border-t border-stone-700 px-5 py-5 sm:px-7')],
        [
          h.div(
            [h.Class('grid gap-3 lg:grid-cols-4 lg:items-center')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-400',
                  ),
                ],
                ['Last transition'],
              ),
              transitionStatusView(model),
            ],
          ),
          h.ol(
            [h.AriaLabel('Machine states'), h.Class('flex flex-wrap gap-2')],
            Array.map(checkoutMachine.stateTags, stateTag => {
              const isActive = model.checkout._tag === stateTag

              return h.keyed('li')(
                stateTag,
                [
                  h.Class(
                    clsx('border px-2.5 py-1.5 font-mono text-xs', {
                      'border-orange-300 bg-orange-950 text-stone-100':
                        isActive,
                      'border-stone-700 text-stone-400': !isActive,
                    }),
                  ),
                ],
                [stateTag],
              )
            }),
          ),
        ],
      ),
      h.div(
        [h.Class('border-t border-stone-700')],
        [
          h.h3(
            [
              h.Class(
                'px-5 py-4 text-xs font-bold uppercase tracking-widest text-stone-400 sm:px-7',
              ),
            ],
            ['Mermaid definition'],
          ),
          h.pre(
            [
              h.Class(
                'max-h-96 overflow-auto border-t border-stone-700 bg-stone-950 p-5 font-mono text-xs leading-5 text-stone-300 sm:p-7',
              ),
            ],
            [checkoutMachine.toMermaid()],
          ),
        ],
      ),
    ],
  )
}

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: `${stateTitle(model.checkout)} | Signal Press`,
    body: h.div(
      [h.Class('min-h-screen bg-stone-100 text-stone-900')],
      [
        pageHeaderView(),
        h.main(
          [
            h.Class(
              'mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8',
            ),
          ],
          [
            analysisView(model),
            progressView(model.checkout),
            h.div(
              [
                h.Class(
                  'mt-6 grid gap-6 sm:mt-8 lg:grid-cols-3 lg:items-start',
                ),
              ],
              [
                checkoutPanelView(model.checkout),
                orderSummaryView(model.checkout),
              ],
            ),
          ],
        ),
        h.footer(
          [h.Class('border-t border-stone-300 bg-stone-50')],
          [
            h.div(
              [
                h.Class(
                  'mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-stone-600 sm:flex-row sm:items-center sm:justify-between sm:px-8',
                ),
              ],
              [
                h.div([], ['© Signal Press · Brooklyn, New York']),
                h.div([], ['Questions? support@signalpress.example']),
              ],
            ),
          ],
        ),
      ],
    ),
  }
}
