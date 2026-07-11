import {
  Array,
  Duration,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'
import { Command, Runtime } from 'foldkit'
import { Machine } from 'foldkit/experimental'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// MODEL

export const Discount = S.Struct({
  code: S.String,
  percentOff: S.Number,
})

export const NoPromo = ts('NoPromo')
export const AppliedPromo = ts('AppliedPromo', { discount: Discount })
export const RejectedPromo = ts('RejectedPromo')

export const Promo = S.Union([NoPromo, AppliedPromo, RejectedPromo])

export const Cart = ts('Cart', { isShippingRequired: S.Boolean })
export const Shipping = ts('Shipping', { isShippingRequired: S.Boolean })
export const Payment = ts('Payment', {
  isPaymentMethodSelected: S.Boolean,
  isShippingRequired: S.Boolean,
})
export const Review = ts('Review', {
  isPaymentMethodSelected: S.Boolean,
  isShippingRequired: S.Boolean,
  isTermsAccepted: S.Boolean,
  promo: Promo,
  promoCodeInput: S.String,
})
export const Placing = ts('Placing', {
  isShippingRequired: S.Boolean,
  maybeDiscount: S.Option(Discount),
})
export const Confirmed = ts('Confirmed', {
  isShippingRequired: S.Boolean,
  maybeDiscount: S.Option(Discount),
  orderId: S.String,
})
export const Cancelled = ts('Cancelled', {
  isShippingRequired: S.Boolean,
})
export const CheckoutState = S.Union([
  Cart,
  Shipping,
  Payment,
  Review,
  Placing,
  Confirmed,
  Cancelled,
])

export const Model = S.Struct({
  checkout: CheckoutState,
  maybeLastTransitionSummary: S.Option(S.String),
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedContinue = m('ClickedContinue')
export const ClickedBack = m('ClickedBack')
export const ClickedCancel = m('ClickedCancel')
export const ClickedPlaceOrder = m('ClickedPlaceOrder')
export const ClickedStartOver = m('ClickedStartOver')
export const ToggledPaymentMethod = m('ToggledPaymentMethod', {
  isSelected: S.Boolean,
})
export const SelectedEdition = m('SelectedEdition', {
  isShippingRequired: S.Boolean,
})
export const ToggledTermsAccepted = m('ToggledTermsAccepted', {
  isAccepted: S.Boolean,
})
export const UpdatedPromoCode = m('UpdatedPromoCode', { value: S.String })
export const SubmittedPromoCode = m('SubmittedPromoCode')
export const SucceededPlaceOrder = m('SucceededPlaceOrder', {
  orderId: S.String,
})

export const Message = S.Union([
  ClickedContinue,
  ClickedBack,
  ClickedCancel,
  ClickedPlaceOrder,
  ClickedStartOver,
  ToggledPaymentMethod,
  SelectedEdition,
  ToggledTermsAccepted,
  UpdatedPromoCode,
  SubmittedPromoCode,
  SucceededPlaceOrder,
])
export type Message = typeof Message.Type

// COMMAND

const PLACE_ORDER_DELAY = Duration.seconds(1)

export const PlaceOrder = Command.define(
  'PlaceOrder',
  { isShippingRequired: S.Boolean },
  SucceededPlaceOrder,
)(({ isShippingRequired }) =>
  Effect.gen(function* () {
    yield* Effect.sleep(PLACE_ORDER_DELAY)
    return SucceededPlaceOrder({
      orderId: isShippingRequired ? 'SHIP-1001' : 'DIGI-1001',
    })
  }),
)

// MACHINE

const PROMO_DISCOUNTS: ReadonlyArray<typeof Discount.Type> = [
  { code: 'READER10', percentOff: 10 },
  { code: 'SIGNAL20', percentOff: 20 },
]

export const promoToMaybeDiscount = (
  promo: typeof Promo.Type,
): Option.Option<typeof Discount.Type> =>
  M.value(promo).pipe(
    M.tags({ AppliedPromo: appliedPromo => appliedPromo.discount }),
    M.option,
  )

export const isReviewReady = (review: typeof Review.Type): boolean =>
  review.isPaymentMethodSelected && review.isTermsAccepted

export const reviewToMaybeDiscount = (
  review: typeof Review.Type,
): Option.Option<typeof Discount.Type> => {
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

export const checkoutMachine = Machine.define({
  state: CheckoutState,
  message: Message,
})({
  initial: Cart({ isShippingRequired: true }),
  states: {
    Cart: {
      on: {
        SelectedEdition: Machine.to('Cart', ({ state, message }) =>
          evo(state, { isShippingRequired: () => message.isShippingRequired }),
        ),
        ClickedContinue: [
          Machine.when(
            state => state.isShippingRequired,
            'Shipping',
            ({ state }) =>
              Shipping({ isShippingRequired: state.isShippingRequired }),
          ),
          Machine.otherwise(
            Machine.to('Payment', ({ state }) =>
              Payment({
                isPaymentMethodSelected: false,
                isShippingRequired: state.isShippingRequired,
              }),
            ),
          ),
        ],
        ClickedCancel: Machine.to('Cancelled', ({ state }) =>
          Cancelled({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Shipping: {
      on: {
        ClickedContinue: Machine.to('Payment', ({ state }) =>
          Payment({
            isPaymentMethodSelected: false,
            isShippingRequired: state.isShippingRequired,
          }),
        ),
        ClickedBack: Machine.to('Cart', ({ state }) =>
          Cart({ isShippingRequired: state.isShippingRequired }),
        ),
        ClickedCancel: Machine.to('Cancelled', ({ state }) =>
          Cancelled({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Payment: {
      on: {
        ToggledPaymentMethod: Machine.to('Payment', ({ state, message }) =>
          evo(state, { isPaymentMethodSelected: () => message.isSelected }),
        ),
        ClickedContinue: Machine.to('Review', ({ state }) =>
          Review({
            isPaymentMethodSelected: state.isPaymentMethodSelected,
            isShippingRequired: state.isShippingRequired,
            isTermsAccepted: false,
            promo: NoPromo(),
            promoCodeInput: '',
          }),
        ),
        ClickedBack: [
          Machine.when(
            state => state.isShippingRequired,
            'Shipping',
            ({ state }) =>
              Shipping({ isShippingRequired: state.isShippingRequired }),
          ),
          Machine.otherwise(
            Machine.to('Cart', ({ state }) =>
              Cart({ isShippingRequired: state.isShippingRequired }),
            ),
          ),
        ],
        ClickedCancel: Machine.to('Cancelled', ({ state }) =>
          Cancelled({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Review: {
      on: {
        ToggledPaymentMethod: Machine.to('Review', ({ state, message }) =>
          evo(state, { isPaymentMethodSelected: () => message.isSelected }),
        ),
        ToggledTermsAccepted: Machine.to('Review', ({ state, message }) =>
          evo(state, { isTermsAccepted: () => message.isAccepted }),
        ),
        UpdatedPromoCode: Machine.to('Review', ({ state, message }) =>
          evo(state, {
            promoCodeInput: () => message.value,
            promo: currentPromo =>
              currentPromo._tag === 'RejectedPromo' ? NoPromo() : currentPromo,
          }),
        ),
        SubmittedPromoCode: [
          Machine.when(
            reviewToMaybeDiscount,
            'Review',
            ({ state, guardValue: discount }) =>
              evo(state, { promo: () => AppliedPromo({ discount }) }),
          ),
          Machine.otherwise(
            Machine.to('Review', ({ state }) =>
              evo(state, { promo: () => RejectedPromo() }),
            ),
          ),
        ],
        ClickedPlaceOrder: [
          Machine.when(
            isReviewReady,
            'Placing',
            ({ state }) =>
              Placing({
                isShippingRequired: state.isShippingRequired,
                maybeDiscount: promoToMaybeDiscount(state.promo),
              }),
            ({ state }) => [
              PlaceOrder({ isShippingRequired: state.isShippingRequired }),
            ],
          ),
        ],
        ClickedBack: Machine.to('Payment', ({ state }) =>
          Payment({
            isPaymentMethodSelected: state.isPaymentMethodSelected,
            isShippingRequired: state.isShippingRequired,
          }),
        ),
        ClickedCancel: Machine.to('Cancelled', ({ state }) =>
          Cancelled({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Placing: {
      on: {
        SucceededPlaceOrder: Machine.to('Confirmed', ({ state, message }) =>
          Confirmed({
            isShippingRequired: state.isShippingRequired,
            maybeDiscount: state.maybeDiscount,
            orderId: message.orderId,
          }),
        ),
      },
    },
    Confirmed: {
      on: {
        ClickedStartOver: Machine.to('Cart', ({ state }) =>
          Cart({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Cancelled: {
      on: {
        ClickedStartOver: Machine.to('Cart', ({ state }) =>
          Cart({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
  },
})

// INIT

export const initialModel: Model = {
  checkout: checkoutMachine.initial,
  maybeLastTransitionSummary: Option.none(),
}

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  initialModel,
  [],
]

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const resultToTransitionSummary = (
  result: Machine.TransitionResult<typeof CheckoutState.Type, Message>,
): string =>
  M.value(result).pipe(
    M.tagsExhaustive({
      Transitioned: ({ from, messageTag, target }) =>
        `${from} -> ${target} on ${messageTag}`,
      Ignored: ({ messageTag, stateTag }) =>
        `${messageTag} ignored in ${stateTag}`,
    }),
  )

export const update = (model: Model, message: Message): UpdateReturn => {
  const result = checkoutMachine.step(model.checkout, message)

  const { state: nextCheckout } = result

  const transitionCommands = M.value(result).pipe(
    M.tagsExhaustive({
      Transitioned: ({ commands }) => commands,
      Ignored: () => [],
    }),
  )

  const nextMaybeLastTransitionSummary = Option.some(
    resultToTransitionSummary(result),
  )

  return [
    evo(model, {
      checkout: () => nextCheckout,
      maybeLastTransitionSummary: () => nextMaybeLastTransitionSummary,
    }),
    transitionCommands,
  ]
}
