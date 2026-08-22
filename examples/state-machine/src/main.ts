import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number,
  Option,
  Schema as S,
  String,
  flow,
  pipe,
} from 'effect'
import { Command, Runtime, Update } from 'foldkit'
import { Machine } from 'foldkit/experimental'
import { otherwise, to, when } from 'foldkit/experimental/machine'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { RadioGroup } from '@foldkit/ui'

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

export const TransitionLogEntry = S.Struct({
  id: S.Number,
  summary: S.String,
})
export type TransitionLogEntry = typeof TransitionLogEntry.Type

const EDITION_RADIO_GROUP_ID = 'edition'

export const HARDCOVER_EDITION = 'Hardcover'
export const EBOOK_EDITION = 'E-book'

export const EDITIONS: ReadonlyArray<string> = [
  HARDCOVER_EDITION,
  EBOOK_EDITION,
]

export const editionName = (isShippingRequired: boolean): string =>
  isShippingRequired ? HARDCOVER_EDITION : EBOOK_EDITION

export const EditionRadioGroup = RadioGroup.create()

export const Model = S.Struct({
  checkout: CheckoutState,
  editionRadioGroup: RadioGroup.Model,
  transitionLog: S.Array(TransitionLogEntry),
  nextTransitionLogId: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedContinue: {},
  ClickedBack: {},
  ClickedCancel: {},
  ClickedPlaceOrder: {},
  ClickedStartOver: {},
  ToggledPaymentMethod: { isSelected: S.Boolean },
  SelectedEdition: { isShippingRequired: S.Boolean },
  GotEditionRadioGroupMessage: { message: RadioGroup.Message },
  ToggledTermsAccepted: { isAccepted: S.Boolean },
  UpdatedPromoCode: { value: S.String },
  SubmittedPromoCode: {},
  SucceededPlaceOrder: { orderId: S.String },
})

export type Message = typeof Message.Type

// COMMAND

const PLACE_ORDER_DELAY = Duration.seconds(1)

export const PlaceOrder = Command.define('PlaceOrder', {
  args: { isShippingRequired: S.Boolean },
  messages: [Message.SucceededPlaceOrder],
  execute: ({ isShippingRequired }) =>
    Effect.gen(function* () {
      yield* Effect.sleep(PLACE_ORDER_DELAY)
      return Message.SucceededPlaceOrder({
        orderId: isShippingRequired ? 'SHIP-1001' : 'DIGI-1001',
      })
    }),
})

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
        SelectedEdition: to('Cart', ({ state, message }) =>
          evo(state, { isShippingRequired: () => message.isShippingRequired }),
        ),
        ClickedContinue: [
          when(
            state => state.isShippingRequired,
            'Shipping',
            ({ state }) =>
              Shipping({ isShippingRequired: state.isShippingRequired }),
          ),
          otherwise(
            to('Payment', ({ state }) =>
              Payment({
                isPaymentMethodSelected: false,
                isShippingRequired: state.isShippingRequired,
              }),
            ),
          ),
        ],
        ClickedCancel: to('Cancelled', ({ state }) =>
          Cancelled({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Shipping: {
      on: {
        ClickedContinue: to('Payment', ({ state }) =>
          Payment({
            isPaymentMethodSelected: false,
            isShippingRequired: state.isShippingRequired,
          }),
        ),
        ClickedBack: to('Cart', ({ state }) =>
          Cart({ isShippingRequired: state.isShippingRequired }),
        ),
        ClickedCancel: to('Cancelled', ({ state }) =>
          Cancelled({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Payment: {
      on: {
        ToggledPaymentMethod: to('Payment', ({ state, message }) =>
          evo(state, { isPaymentMethodSelected: () => message.isSelected }),
        ),
        ClickedContinue: to('Review', ({ state }) =>
          Review({
            isPaymentMethodSelected: state.isPaymentMethodSelected,
            isShippingRequired: state.isShippingRequired,
            isTermsAccepted: false,
            promo: NoPromo(),
            promoCodeInput: '',
          }),
        ),
        ClickedBack: [
          when(
            state => state.isShippingRequired,
            'Shipping',
            ({ state }) =>
              Shipping({ isShippingRequired: state.isShippingRequired }),
          ),
          otherwise(
            to('Cart', ({ state }) =>
              Cart({ isShippingRequired: state.isShippingRequired }),
            ),
          ),
        ],
        ClickedCancel: to('Cancelled', ({ state }) =>
          Cancelled({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Review: {
      on: {
        ToggledPaymentMethod: to('Review', ({ state, message }) =>
          evo(state, { isPaymentMethodSelected: () => message.isSelected }),
        ),
        ToggledTermsAccepted: to('Review', ({ state, message }) =>
          evo(state, { isTermsAccepted: () => message.isAccepted }),
        ),
        UpdatedPromoCode: to('Review', ({ state, message }) =>
          evo(state, {
            promoCodeInput: () => message.value,
            promo: currentPromo =>
              currentPromo._tag === 'RejectedPromo' ? NoPromo() : currentPromo,
          }),
        ),
        SubmittedPromoCode: [
          when(
            reviewToMaybeDiscount,
            'Review',
            ({ state, guardValue: discount }) =>
              evo(state, { promo: () => AppliedPromo({ discount }) }),
          ),
          otherwise(
            to('Review', ({ state }) =>
              evo(state, { promo: () => RejectedPromo() }),
            ),
          ),
        ],
        ClickedPlaceOrder: [
          when(
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
        ClickedBack: to('Payment', ({ state }) =>
          Payment({
            isPaymentMethodSelected: state.isPaymentMethodSelected,
            isShippingRequired: state.isShippingRequired,
          }),
        ),
        ClickedCancel: to('Cancelled', ({ state }) =>
          Cancelled({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Placing: {
      on: {
        SucceededPlaceOrder: to('Confirmed', ({ state, message }) =>
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
        ClickedStartOver: to('Cart', ({ state }) =>
          Cart({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
    Cancelled: {
      on: {
        ClickedStartOver: to('Cart', ({ state }) =>
          Cart({ isShippingRequired: state.isShippingRequired }),
        ),
      },
    },
  },
})

// INIT

export const initialModel = Model.make({
  checkout: checkoutMachine.initial,
  editionRadioGroup: RadioGroup.init({ id: EDITION_RADIO_GROUP_ID }),
  transitionLog: [],
  nextTransitionLogId: 0,
})

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: initialModel,
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const TRANSITION_LOG_LIMIT = 20

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

const stepMachine =
  (message: Message) =>
  (model: Model): UpdateReturn => {
    const result = checkoutMachine.step(model.checkout, message)

    const { state: nextCheckout } = result

    const transitionCommands = M.value(result).pipe(
      M.tagsExhaustive({
        Transitioned: ({ commands }) => commands,
        Ignored: () => [],
      }),
    )

    const transitionLogEntry: TransitionLogEntry = {
      id: model.nextTransitionLogId,
      summary: resultToTransitionSummary(result),
    }

    return {
      model: evo(model, {
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

const foldEditionRadioGroupOutMessage = M.type<RadioGroup.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected: ({ value }) =>
      stepMachine(
        Message.SelectedEdition({
          isShippingRequired: value === HARDCOVER_EDITION,
        }),
      ),
  }),
)

const foldEditionRadioGroup = Update.foldChild({
  update: EditionRadioGroup.update,
  read: (model: Model) => Option.some(model.editionRadioGroup),
  write: (model, nextEditionRadioGroup) =>
    evo(model, { editionRadioGroup: () => nextEditionRadioGroup }),
  toParentMessage: message => Message.GotEditionRadioGroupMessage({ message }),
  foldOutMessage: foldEditionRadioGroupOutMessage,
})

export const update = (model: Model, message: Message) => {
  const runMachine = () => stepMachine(message)(model)

  return Message.match<UpdateReturn>(message, {
    ClickedContinue: runMachine,
    ClickedBack: runMachine,
    ClickedCancel: runMachine,
    ClickedPlaceOrder: runMachine,
    ClickedStartOver: runMachine,
    ToggledPaymentMethod: runMachine,
    SelectedEdition: runMachine,
    GotEditionRadioGroupMessage: ({ message }) =>
      foldEditionRadioGroup(model, message),
    ToggledTermsAccepted: runMachine,
    UpdatedPromoCode: runMachine,
    SubmittedPromoCode: runMachine,
    SucceededPlaceOrder: runMachine,
  })
}
