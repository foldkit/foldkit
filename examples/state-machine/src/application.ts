import { clsx } from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Layer,
  Match,
  Number,
  Option,
  Schema,
  String,
  flow,
  pipe,
} from 'effect'
import { Block, Command } from 'foldkit'
import { Machine } from 'foldkit/experimental'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Checkbox, Input } from '@foldkit/ui'

import { CartStep, CartStepLive } from './cartStep'
import {
  CheckoutState,
  type ConfirmedState,
  type Discount,
  type PaymentState,
  Promo,
  type ReviewState,
  TransitionLogEntry,
  editionName,
  formatMoney,
  isReviewReady,
  orderPricing,
  promoToMaybeDiscount,
} from './domain/checkout'
import * as Icon from './domain/icon'
import {
  bookCoverView,
  cancelCheckoutButtonView,
  primaryButtonClassName,
  secondaryButtonClassName,
} from './domain/view'

// MODEL

export const Model = Schema.Struct({
  checkout: CheckoutState,
  transitionLog: Schema.Array(TransitionLogEntry),
  nextTransitionLogId: Schema.Number,
  cartStep: CartStep,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedContinue: {},
  ClickedBack: {},
  ClickedCancel: {},
  ClickedPlaceOrder: {},
  ClickedStartOver: {},
  ToggledPaymentMethod: { isSelected: Schema.Boolean },
  SelectedEdition: { isShippingRequired: Schema.Boolean },
  ToggledTermsAccepted: { isAccepted: Schema.Boolean },
  UpdatedPromoCode: { value: Schema.String },
  SubmittedPromoCode: {},
  CompletedPlaceOrder: { orderId: Schema.String },
})
export type Message = typeof Message.Type

// COMMAND

export const PlaceOrder = Command.define('PlaceOrder', {
  args: { isShippingRequired: Schema.Boolean },
  messages: [Message.CompletedPlaceOrder],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [PlaceOrder],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const cartStep = yield* new CartStep('cartStep')

    return {
      model: {
        checkout: checkoutMachine.initial,
        transitionLog: [],
        nextTransitionLogId: 0,
        cartStep,
      },

      update: {
        ClickedContinue: handleMachineMessage,
        ClickedBack: handleMachineMessage,
        ClickedCancel: handleMachineMessage,
        ClickedPlaceOrder: handleMachineMessage,
        ClickedStartOver: handleMachineMessage,
        ToggledPaymentMethod: handleMachineMessage,
        SelectedEdition: handleMachineMessage,
        ToggledTermsAccepted: handleMachineMessage,
        UpdatedPromoCode: handleMachineMessage,
        SubmittedPromoCode: handleMachineMessage,
        CompletedPlaceOrder: handleMachineMessage,
        ...cartStep.on<Model>({
          RequestedCancel: stepMachine(Message.ClickedCancel()),
          RequestedContinue: stepMachine(Message.ClickedContinue()),
          SelectedEdition: (model, { isShippingRequired }) =>
            stepMachine(Message.SelectedEdition({ isShippingRequired }))(model),
        }),
      },

      commands: {
        PlaceOrder: ({ isShippingRequired }) =>
          Effect.sleep(PLACE_ORDER_DELAY).pipe(
            Effect.as(
              Message.CompletedPlaceOrder({
                orderId: isShippingRequired ? 'SHIP-1001' : 'DIGI-1001',
              }),
            ),
          ),
      },

      view,
    }
  }),
).pipe(Layer.provide(CartStepLive))

// MACHINE

const PROMO_DISCOUNTS: ReadonlyArray<Discount> = [
  { code: 'READER10', percentOff: 10 },
  { code: 'SIGNAL20', percentOff: 20 },
]

const reviewToMaybeDiscount = (
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

const checkoutMachine = makeMachine({
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

export const TRANSITION_LOG_LIMIT = 20

const resultToTransitionSummary = (
  result: ReturnType<typeof checkoutMachine.step>,
): string =>
  Match.value(result).pipe(
    Match.tagsExhaustive({
      Transitioned: ({ from, messageTag, target }) =>
        `${from} -> ${target} on ${messageTag}`,
      Ignored: ({ messageTag, stateTag }) =>
        `${messageTag} ignored in ${stateTag}`,
    }),
  )

const stepMachine = (message: Message) => (model: Model) => {
  const result = checkoutMachine.step(model.checkout, message)

  const { state: nextCheckout } = result

  const transitionCommands = Match.value(result).pipe(
    Match.tagsExhaustive({
      Transitioned: ({ commands }) => commands,
      Ignored: () => [],
    }),
  )

  const transitionLogEntry: TransitionLogEntry = {
    id: model.nextTransitionLogId,
    summary: resultToTransitionSummary(result),
  }

  return {
    model: modifyFields(model, {
      checkout: () => nextCheckout,
      transitionLog: flow(
        Array.prepend(transitionLogEntry),
        Array.take(TRANSITION_LOG_LIMIT),
      ),
      nextTransitionLogId: Number.increment,
    }),
    commands: transitionCommands,
  }
}

const MACHINE_DESCRIPTION = {
  stateTags: checkoutMachine.stateTags,
  unreachableStateTags: checkoutMachine.unreachableStates(),
  deadTransitionCount: checkoutMachine.deadTransitions().length,
  mermaidDefinition: checkoutMachine.toMermaid(),
}

// VIEW

type ApplicationViewBuilder = HtmlBuilder<Message>

const stateEyebrow = (state: CheckoutState): string =>
  CheckoutState.match(state, {
    Cart: () => 'Bag',
    Shipping: () => 'Delivery',
    Payment: () => 'Payment',
    Review: () => 'Review',
    Placing: () => 'Order',
    Confirmed: () => 'Order',
    Cancelled: () => 'Checkout',
  })

const stateTitle = (state: CheckoutState): string =>
  CheckoutState.match(state, {
    Cart: () => 'Your order',
    Shipping: () => 'Delivery details',
    Payment: () => 'Payment',
    Review: () => 'Review and place order',
    Placing: () => 'Processing your order',
    Confirmed: () => 'Thank you',
    Cancelled: () => 'Checkout cancelled',
  })

const stateDescription = (state: CheckoutState): string =>
  CheckoutState.match(state, {
    Cart: () => 'Choose your edition before continuing to checkout.',
    Shipping: () => 'Confirm where we should send your hardcover.',
    Payment: () => 'Select a saved payment method for this order.',
    Review: () => 'Check the details below before placing your order.',
    Placing: () => 'Please keep this page open for a moment.',
    Confirmed: () => 'Your order is confirmed and a receipt is on its way.',
    Cancelled: () => 'Nothing was charged. Your selection has been saved.',
  })

const progressSteps: ReadonlyArray<string> = [
  'Bag',
  'Delivery',
  'Payment',
  'Review',
]

const stateToMaybeProgressStep = (
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

const currentProgressIndex = (state: CheckoutState): number =>
  pipe(
    stateToMaybeProgressStep(state),
    Option.flatMap(progressStep =>
      Array.findFirstIndex(progressSteps, step => step === progressStep),
    ),
    Option.getOrElse(() => progressSteps.length),
  )

const pageHeaderView = (h: ApplicationViewBuilder): Html =>
  h.header(
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

const progressView = (
  state: CheckoutState,
  h: ApplicationViewBuilder,
): Html => {
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
                        : globalThis.String(index + 1),
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

// SHIPPING VIEW

const shippingView = (h: ApplicationViewBuilder): Html =>
  h.div(
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
          Button.view(
            {
              onClick: Message.ClickedBack(),
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
            },
            h,
          ),
          h.div(
            [h.Class('sm:justify-self-center')],
            [cancelCheckoutButtonView(Message.ClickedCancel(), h)],
          ),
          Button.view(
            {
              onClick: Message.ClickedContinue(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(primaryButtonClassName, 'sm:justify-self-end'),
                    ),
                  ],
                  ['Continue to payment', Icon.arrowRight()],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )

// PAYMENT VIEW

const paymentView = (state: PaymentState, h: ApplicationViewBuilder): Html =>
  h.div(
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
          Checkbox.view(
            {
              id: 'saved-card',
              isChecked: state.isPaymentMethodSelected,
              hasDescription: true,
              onToggle: isSelected =>
                Message.ToggledPaymentMethod({ isSelected }),
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
            },
            h,
          ),
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
          Button.view(
            {
              onClick: Message.ClickedBack(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(secondaryButtonClassName, 'sm:justify-self-start'),
                    ),
                  ],
                  [
                    state.isShippingRequired
                      ? 'Back to delivery'
                      : 'Back to bag',
                  ],
                ),
            },
            h,
          ),
          h.div(
            [h.Class('sm:justify-self-center')],
            [cancelCheckoutButtonView(Message.ClickedCancel(), h)],
          ),
          Button.view(
            {
              onClick: Message.ClickedContinue(),
              isDisabled: !state.isPaymentMethodSelected,
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(primaryButtonClassName, 'sm:justify-self-end'),
                    ),
                  ],
                  ['Review order', Icon.arrowRight()],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )

// REVIEW VIEW

const promoFeedbackClassName =
  'min-h-4 text-xs font-bold uppercase tracking-wider'

const reviewView = (state: ReviewState, h: ApplicationViewBuilder): Html => {
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
              Button.view(
                {
                  onClick: Message.ToggledPaymentMethod({
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
                },
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-2')],
        [
          h.form(
            [
              h.Class('flex items-end gap-3'),
              h.OnSubmit(Message.SubmittedPromoCode()),
            ],
            [
              Input.view(
                {
                  id: 'promo-code',
                  value: state.promoCodeInput,
                  onInput: value => Message.UpdatedPromoCode({ value }),
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
                },
                h,
              ),
              Button.view(
                {
                  type: 'submit',
                  toView: attributes =>
                    h.button(
                      [...attributes.button, h.Class(secondaryButtonClassName)],
                      ['Apply'],
                    ),
                },
                h,
              ),
            ],
          ),
          Promo.match(state.promo, {
            NoPromo: () => h.p([h.Class(promoFeedbackClassName)], ['']),
            AppliedPromo: ({ discount }) =>
              h.p(
                [h.Class(clsx(promoFeedbackClassName, 'text-orange-800'))],
                [`${discount.code} applied · ${discount.percentOff}% off`],
              ),
            RejectedPromo: () =>
              h.p(
                [h.Class(clsx(promoFeedbackClassName, 'text-red-700'))],
                ["That code isn't recognized."],
              ),
          }),
        ],
      ),
      Checkbox.view(
        {
          id: 'accept-terms',
          isChecked: state.isTermsAccepted,
          hasDescription: true,
          onToggle: isAccepted => Message.ToggledTermsAccepted({ isAccepted }),
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
                          Message.ToggledTermsAccepted({
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
        },
        h,
      ),
      h.div(
        [
          h.Class(
            'grid gap-4 border-t border-stone-300 pt-6 sm:grid-cols-3 sm:items-center',
          ),
        ],
        [
          Button.view(
            {
              onClick: Message.ClickedBack(),
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
            },
            h,
          ),
          h.div(
            [h.Class('sm:justify-self-center')],
            [cancelCheckoutButtonView(Message.ClickedCancel(), h)],
          ),
          Button.view(
            {
              onClick: Message.ClickedPlaceOrder(),
              isDisabled: !isReadyToPlace,
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(primaryButtonClassName, 'sm:justify-self-end'),
                    ),
                  ],
                  [`Place order · ${formatMoney(pricing.total)}`],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
}

// ORDER STATUS VIEW

const placingView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [
      h.Role('status'),
      h.AriaLive('polite'),
      h.Class('grid min-h-72 place-items-center text-center'),
    ],
    [
      h.div(
        [],
        [
          h.div([
            h.Class(
              'mx-auto h-12 w-12 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 motion-reduce:animate-none',
            ),
          ]),
          h.p(
            [h.Class('mt-6 text-sm leading-6 text-stone-600')],
            ['Authorizing payment and reserving your copy…'],
          ),
        ],
      ),
    ],
  )

const confirmedView = (
  state: ConfirmedState,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
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
      Button.view(
        {
          onClick: Message.ClickedStartOver(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(clsx(primaryButtonClassName, 'mt-7')),
              ],
              ['Return to checkout'],
            ),
        },
        h,
      ),
    ],
  )

const cancelledView = (h: ApplicationViewBuilder): Html =>
  h.div(
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
      Button.view(
        {
          onClick: Message.ClickedStartOver(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(clsx(primaryButtonClassName, 'mt-7')),
              ],
              ['Start checkout again'],
            ),
        },
        h,
      ),
    ],
  )

// ORDER SUMMARY VIEW

const stateToMaybeDiscount = (state: CheckoutState): Option.Option<Discount> =>
  Match.value(state).pipe(
    Match.tags({
      Review: reviewState => promoToMaybeDiscount(reviewState.promo),
      Placing: placingState => placingState.maybeDiscount,
      Confirmed: confirmedState => confirmedState.maybeDiscount,
    }),
    Match.option,
    Option.flatten,
  )

const orderSummaryView = (
  state: CheckoutState,
  h: ApplicationViewBuilder,
): Html => {
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
          bookCoverView('', true, h),
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
          h.div(
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
              h.div(
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
          h.div(
            [h.Class(summaryRowClassName)],
            [
              h.dt(
                [h.Class('text-stone-600')],
                [state.isShippingRequired ? 'Shipping' : 'Email delivery'],
              ),
              h.dd([h.Class('font-medium text-stone-900')], ['Free']),
            ],
          ),
          h.div(
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
        ? h.div(
            [h.Class(orderNoteClassName)],
            [
              Icon.truck('mt-0.5 h-4 w-4 shrink-0'),
              'Free tracked shipping in the United States.',
            ],
          )
        : h.div(
            [h.Class(orderNoteClassName)],
            [
              Icon.download('mt-0.5 h-4 w-4 shrink-0'),
              'Download links arrive immediately after purchase.',
            ],
          ),
    ],
  )
}

// INSPECTOR VIEW

const formatTags = (tags: ReadonlyArray<string>): string =>
  Array.match(tags, {
    onEmpty: () => 'None',
    onNonEmpty: Array.join(', '),
  })

const transitionLogView = (
  transitionLog: ReadonlyArray<TransitionLogEntry>,
  h: ApplicationViewBuilder,
): Html => {
  const transitionLogClassName =
    'border-l-2 border-orange-700 pl-3 font-mono text-xs leading-5 text-stone-300 lg:col-span-3'

  return Array.match(transitionLog, {
    onEmpty: () =>
      h.div(
        [h.Role('status'), h.Class(transitionLogClassName)],
        ['Waiting for the first checkout event'],
      ),
    onNonEmpty: nonEmptyTransitionLog =>
      h.ol(
        [
          h.Role('log'),
          h.Class(clsx(transitionLogClassName, 'max-h-40 overflow-y-auto')),
        ],
        Array.map(nonEmptyTransitionLog, entry =>
          h.keyed('li')(globalThis.String(entry.id), [], [entry.summary]),
        ),
      ),
  })
}

const inspectorView = (
  activeStateTag: string,
  transitionLog: ReadonlyArray<TransitionLogEntry>,
  h: ApplicationViewBuilder,
): Html =>
  h.section(
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
                    [formatTags(MACHINE_DESCRIPTION.unreachableStateTags)],
                  ),
                ],
              ),
              h.div(
                [],
                [
                  h.dt([h.Class('text-stone-400')], ['Dead transitions']),
                  h.dd(
                    [h.Class('mt-1 font-mono text-stone-100')],
                    [
                      globalThis.String(
                        MACHINE_DESCRIPTION.deadTransitionCount,
                      ),
                    ],
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
            [h.Class('grid gap-3 lg:grid-cols-4 lg:items-start')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-400',
                  ),
                ],
                ['Recent transitions'],
              ),
              transitionLogView(transitionLog, h),
            ],
          ),
          h.ol(
            [h.AriaLabel('Machine states'), h.Class('flex flex-wrap gap-2')],
            Array.map(MACHINE_DESCRIPTION.stateTags, stateTag => {
              const isActive = activeStateTag === stateTag

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
            [MACHINE_DESCRIPTION.mermaidDefinition],
          ),
        ],
      ),
    ],
  )

// CHECKOUT VIEW

const checkoutContentView = (model: Model, h: ApplicationViewBuilder): Html =>
  CheckoutState.match(model.checkout, {
    Cart: state => model.cartStep.view({ state }),
    Shipping: () => shippingView(h),
    Payment: state => paymentView(state, h),
    Review: state => reviewView(state, h),
    Placing: () => placingView(h),
    Confirmed: state => confirmedView(state, h),
    Cancelled: () => cancelledView(h),
  })

const checkoutPanelView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.section(
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
            [stateEyebrow(model.checkout)],
          ),
          h.h1(
            [h.Class('mt-3 font-serif text-3xl text-stone-900 sm:text-4xl')],
            [stateTitle(model.checkout)],
          ),
          h.p(
            [h.Class('mt-3 text-sm leading-6 text-stone-600')],
            [stateDescription(model.checkout)],
          ),
        ],
      ),
      checkoutContentView(model, h),
    ],
  )

const view = (model: Model, h: ApplicationViewBuilder): Document => ({
  title: `${stateTitle(model.checkout)} | Signal Press`,
  body: h.div(
    [h.Class('min-h-screen bg-stone-100 text-stone-900')],
    [
      pageHeaderView(h),
      h.main(
        [
          h.Class(
            'mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8',
          ),
        ],
        [
          inspectorView(model.checkout._tag, model.transitionLog, h),
          progressView(model.checkout, h),
          h.div(
            [h.Class('mt-6 grid gap-6 sm:mt-8 lg:grid-cols-3 lg:items-start')],
            [checkoutPanelView(model, h), orderSummaryView(model.checkout, h)],
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
})

// UPDATE

const PLACE_ORDER_DELAY = Duration.seconds(1)

const handleMachineMessage = (model: Model, message: Message) =>
  stepMachine(message)(model)
