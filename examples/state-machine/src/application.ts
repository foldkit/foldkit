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

import { CartStep, CartStepLive } from './cartStep'
import {
  CheckoutState,
  type Discount,
  Promo,
  type ReviewState,
  TransitionLogEntry,
  isReviewReady,
  promoToMaybeDiscount,
} from './domain/checkout'
import * as Icon from './domain/icon'
import { Inspector, InspectorLive } from './inspector'
import { OrderStatus, OrderStatusLive } from './orderStatus'
import { OrderSummary, OrderSummaryLive } from './orderSummary'
import { PaymentStep, PaymentStepLive } from './paymentStep'
import { ReviewStep, ReviewStepLive } from './reviewStep'
import { ShippingStep, ShippingStepLive } from './shippingStep'

// MODEL

export const Model = Schema.Struct({
  checkout: CheckoutState,
  transitionLog: Schema.Array(TransitionLogEntry),
  nextTransitionLogId: Schema.Number,
  cartStep: CartStep,
  shippingStep: ShippingStep,
  paymentStep: PaymentStep,
  reviewStep: ReviewStep,
  orderStatus: OrderStatus,
  orderSummary: OrderSummary,
  inspector: Inspector,
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
    const shippingStep = yield* new ShippingStep('shippingStep')
    const paymentStep = yield* new PaymentStep('paymentStep')
    const reviewStep = yield* new ReviewStep('reviewStep')
    const orderStatus = yield* new OrderStatus('orderStatus')
    const orderSummary = yield* new OrderSummary('orderSummary')
    const inspector = yield* new Inspector('inspector', MACHINE_DESCRIPTION)

    return {
      model: {
        checkout: checkoutMachine.initial,
        transitionLog: [],
        nextTransitionLogId: 0,
        cartStep,
        shippingStep,
        paymentStep,
        reviewStep,
        orderStatus,
        orderSummary,
        inspector,
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
        ...shippingStep.on<Model>({
          RequestedBack: stepMachine(Message.ClickedBack()),
          RequestedCancel: stepMachine(Message.ClickedCancel()),
          RequestedContinue: stepMachine(Message.ClickedContinue()),
        }),
        ...paymentStep.on<Model>({
          RequestedBack: stepMachine(Message.ClickedBack()),
          RequestedCancel: stepMachine(Message.ClickedCancel()),
          RequestedContinue: stepMachine(Message.ClickedContinue()),
          ToggledPaymentMethod: (model, { isSelected }) =>
            stepMachine(Message.ToggledPaymentMethod({ isSelected }))(model),
        }),
        ...reviewStep.on<Model>({
          RequestedBack: stepMachine(Message.ClickedBack()),
          RequestedCancel: stepMachine(Message.ClickedCancel()),
          RequestedPlaceOrder: stepMachine(Message.ClickedPlaceOrder()),
          ToggledPaymentMethod: (model, { isSelected }) =>
            stepMachine(Message.ToggledPaymentMethod({ isSelected }))(model),
          ToggledTermsAccepted: (model, { isAccepted }) =>
            stepMachine(Message.ToggledTermsAccepted({ isAccepted }))(model),
          UpdatedPromoCode: (model, { value }) =>
            stepMachine(Message.UpdatedPromoCode({ value }))(model),
          SubmittedPromoCode: stepMachine(Message.SubmittedPromoCode()),
        }),
        ...orderStatus.on<Model>({
          RequestedStartOver: stepMachine(Message.ClickedStartOver()),
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
).pipe(
  Layer.provide(
    Layer.mergeAll(
      CartStepLive,
      ShippingStepLive,
      PaymentStepLive,
      ReviewStepLive,
      OrderStatusLive,
      OrderSummaryLive,
      InspectorLive,
    ),
  ),
)

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

const checkoutContentView = (model: Model): Html =>
  CheckoutState.match(model.checkout, {
    Cart: state => model.cartStep.view({ state }),
    Shipping: () => model.shippingStep.view(),
    Payment: state => model.paymentStep.view({ state }),
    Review: state => model.reviewStep.view({ state }),
    Placing: state => model.orderStatus.view({ state }),
    Confirmed: state => model.orderStatus.view({ state }),
    Cancelled: state => model.orderStatus.view({ state }),
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
      checkoutContentView(model),
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
          model.inspector.view({
            activeStateTag: model.checkout._tag,
            transitionLog: model.transitionLog,
          }),
          progressView(model.checkout, h),
          h.div(
            [h.Class('mt-6 grid gap-6 sm:mt-8 lg:grid-cols-3 lg:items-start')],
            [
              checkoutPanelView(model, h),
              model.orderSummary.view({ state: model.checkout }),
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
})

// UPDATE

const PLACE_ORDER_DELAY = Duration.seconds(1)

const handleMachineMessage = (model: Model, message: Message) =>
  stepMachine(message)(model)
