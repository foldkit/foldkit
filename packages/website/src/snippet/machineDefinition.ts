import { Schema } from 'effect'
import { Machine } from 'foldkit/experimental'
import { otherwise, to, when } from 'foldkit/experimental/machine'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// MODEL

export const CheckoutState = defineTaggedUnion({
  Cart: { isShippingRequired: Schema.Boolean },
  Shipping: {},
  Payment: { isShippingRequired: Schema.Boolean },
  Review: { isShippingRequired: Schema.Boolean },
  Cancelled: {},
})
export type CheckoutState = typeof CheckoutState.Type

// MESSAGE

export const Message = defineMessageUnion({
  SelectedEdition: { isShippingRequired: Schema.Boolean },
  ClickedContinue: {},
  ClickedBack: {},
  ClickedCancel: {},
  ToggledHelp: { isOpen: Schema.Boolean },
})
export type Message = typeof Message.Type

// MACHINE

export const checkoutMachine = Machine.define({
  state: CheckoutState,
  message: Message,
})({
  initial: CheckoutState.Cart({ isShippingRequired: true }),
  shared: [
    Machine.forStates(['Cart', 'Shipping', 'Payment', 'Review']).on({
      ClickedCancel: to('Cancelled', () => ({
        model: CheckoutState.Cancelled(),
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
            () => ({ model: CheckoutState.Shipping() }),
          ),
          otherwise(
            to('Payment', ({ state }) => ({
              model: CheckoutState.Payment({
                isShippingRequired: state.isShippingRequired,
              }),
            })),
          ),
        ],
      },
    },
    Shipping: {
      on: {
        ClickedContinue: to('Payment', () => ({
          model: CheckoutState.Payment({ isShippingRequired: true }),
        })),
        ClickedBack: to('Cart', () => ({
          model: CheckoutState.Cart({ isShippingRequired: true }),
        })),
      },
    },
    Payment: {
      on: {
        ClickedContinue: to('Review', ({ state }) => ({
          model: CheckoutState.Review({
            isShippingRequired: state.isShippingRequired,
          }),
        })),
        ClickedBack: [
          when(
            state => state.isShippingRequired,
            'Shipping',
            () => ({ model: CheckoutState.Shipping() }),
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
        ClickedBack: to('Payment', ({ state }) => ({
          model: CheckoutState.Payment({
            isShippingRequired: state.isShippingRequired,
          }),
        })),
      },
    },
  },
})
