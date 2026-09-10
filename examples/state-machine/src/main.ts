import {
  Array,
  Duration,
  Effect,
  Match,
  Number,
  Option,
  Schema,
  String,
  flow,
  pipe,
} from 'effect'
import { Command, Runtime, Update } from 'foldkit'
import { Machine } from 'foldkit/experimental'
import { otherwise, to, when } from 'foldkit/experimental/machine'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { RadioGroup } from '@foldkit/ui'

// MODEL

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

export const Model = Schema.Struct({
  checkout: CheckoutState,
  editionRadioGroup: RadioGroup.Model,
  transitionLog: Schema.Array(TransitionLogEntry),
  nextTransitionLogId: Schema.Number,
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
  GotEditionRadioGroupMessage: { message: RadioGroup.Message },
  ToggledTermsAccepted: { isAccepted: Schema.Boolean },
  UpdatedPromoCode: { value: Schema.String },
  SubmittedPromoCode: {},
  SucceededPlaceOrder: { orderId: Schema.String },
})

export type Message = typeof Message.Type

// COMMAND

const PLACE_ORDER_DELAY = Duration.seconds(1)

export const PlaceOrder = Command.define('PlaceOrder', {
  args: { isShippingRequired: Schema.Boolean },
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
  Match.value(promo).pipe(
    Match.tags({ AppliedPromo: appliedPromo => appliedPromo.discount }),
    Match.option,
  )

export const isReviewReady = (
  review: typeof CheckoutState.Review.Type,
): boolean => review.isPaymentMethodSelected && review.isTermsAccepted

export const reviewToMaybeDiscount = (
  review: typeof CheckoutState.Review.Type,
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
  initial: CheckoutState.Cart({ isShippingRequired: true }),
  shared: [
    Machine.forStates(['Cart', 'Shipping', 'Payment', 'Review']).on({
      ClickedCancel: to('Cancelled', ({ state }) => ({
        model: CheckoutState.Cancelled({
          isShippingRequired: state.isShippingRequired,
        }),
      })),
    }),
    Machine.forStates(['Confirmed', 'Cancelled']).on({
      ClickedStartOver: to('Cart', ({ state }) => ({
        model: CheckoutState.Cart({
          isShippingRequired: state.isShippingRequired,
        }),
      })),
    }),
  ],
  states: {
    Cart: {
      on: {
        SelectedEdition: to('Cart', ({ state, message }) => ({
          model: evo(state, {
            isShippingRequired: () => message.isShippingRequired,
          }),
        })),
        ClickedContinue: [
          when(
            state => state.isShippingRequired,
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
          model: evo(state, {
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
            state => state.isShippingRequired,
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
          model: evo(state, {
            isPaymentMethodSelected: () => message.isSelected,
          }),
        })),
        ToggledTermsAccepted: to('Review', ({ state, message }) => ({
          model: evo(state, { isTermsAccepted: () => message.isAccepted }),
        })),
        UpdatedPromoCode: to('Review', ({ state, message }) => ({
          model: evo(state, {
            promoCodeInput: () => message.value,
            promo: currentPromo =>
              currentPromo._tag === 'RejectedPromo'
                ? Promo.NoPromo()
                : currentPromo,
          }),
        })),
        SubmittedPromoCode: [
          when(
            reviewToMaybeDiscount,
            'Review',
            ({ state, guardValue: discount }) => ({
              model: evo(state, {
                promo: () => Promo.AppliedPromo({ discount }),
              }),
            }),
          ),
          otherwise(
            to('Review', ({ state }) => ({
              model: evo(state, { promo: () => Promo.RejectedPromo() }),
            })),
          ),
        ],
        ClickedPlaceOrder: [
          when(isReviewReady, 'Placing', ({ state }) => ({
            model: CheckoutState.Placing({
              isShippingRequired: state.isShippingRequired,
              maybeDiscount: promoToMaybeDiscount(state.promo),
            }),
            commands: [
              PlaceOrder({ isShippingRequired: state.isShippingRequired }),
            ],
          })),
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
        SucceededPlaceOrder: to('Confirmed', ({ state, message }) => ({
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
  Match.value(result).pipe(
    Match.tagsExhaustive({
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

const foldEditionRadioGroupOutMessage = RadioGroup.OutMessage.match<
  Update.Step<Model, Message>
>({
  Selected: ({ value }) =>
    stepMachine(
      Message.SelectedEdition({
        isShippingRequired: value === HARDCOVER_EDITION,
      }),
    ),
})

const foldEditionRadioGroup = Update.foldChild({
  update: EditionRadioGroup.update,
  read: (model: Model) => Option.some(model.editionRadioGroup),
  write: (model, nextEditionRadioGroup) =>
    evo(model, { editionRadioGroup: () => nextEditionRadioGroup }),
  toParentMessage: message => Message.GotEditionRadioGroupMessage({ message }),
  foldOutMessage: foldEditionRadioGroupOutMessage,
})

export const update = (model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.withReturnType<UpdateReturn>(),
    Match.tag('GotEditionRadioGroupMessage', ({ message }) =>
      foldEditionRadioGroup(model, message),
    ),
    Match.tag(
      'ClickedContinue',
      'ClickedBack',
      'ClickedCancel',
      'ClickedPlaceOrder',
      'ClickedStartOver',
      'ToggledPaymentMethod',
      'SelectedEdition',
      'ToggledTermsAccepted',
      'UpdatedPromoCode',
      'SubmittedPromoCode',
      'SucceededPlaceOrder',
      () => stepMachine(message)(model),
    ),
    Match.exhaustive,
  )
