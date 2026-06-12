import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { m, ts } from '../../schema/index.js'
import { defineMachine, otherwise, to, when } from '../statechart.js'

// STATE

const Cart = ts('Cart', { isShippingRequired: S.Boolean })
const ShippingAddress = ts('ShippingAddress')
const ShippingMethod = ts('ShippingMethod')
const Payment = ts('Payment', { isShippingRequired: S.Boolean })
const Review = ts('Review', {
  isShippingRequired: S.Boolean,
  isTermsAccepted: S.Boolean,
})
const Placing = ts('Placing')
const Confirmed = ts('Confirmed', { orderId: S.String })
const GiftWrap = ts('GiftWrap')

const CheckoutState = S.Union([
  Cart,
  ShippingAddress,
  ShippingMethod,
  Payment,
  Review,
  Placing,
  Confirmed,
  GiftWrap,
])
type CheckoutState = typeof CheckoutState.Type

// MESSAGE

const ClickedContinue = m('ClickedContinue')
const ClickedBack = m('ClickedBack')
const AcceptedTerms = m('AcceptedTerms')
const ClickedPlaceOrder = m('ClickedPlaceOrder')
const SucceededPlaceOrder = m('SucceededPlaceOrder', { orderId: S.String })

const CheckoutMessage = S.Union([
  ClickedContinue,
  ClickedBack,
  AcceptedTerms,
  ClickedPlaceOrder,
  SucceededPlaceOrder,
])
type CheckoutMessage = typeof CheckoutMessage.Type

// MACHINE

const checkoutMachine = defineMachine({
  state: CheckoutState,
  message: CheckoutMessage,
})({
  initial: Cart({ isShippingRequired: true }),
  states: {
    Cart: {
      on: {
        ClickedContinue: [
          when(
            state => state.isShippingRequired,
            to('ShippingAddress', () => ShippingAddress()),
          ),
          otherwise(
            to('Payment', state =>
              Payment({ isShippingRequired: state.isShippingRequired }),
            ),
          ),
        ],
      },
    },
    ShippingAddress: {
      on: {
        ClickedContinue: to('ShippingMethod', () => ShippingMethod()),
        ClickedBack: to('Cart', () => Cart({ isShippingRequired: true })),
      },
    },
    ShippingMethod: {
      on: {
        ClickedContinue: to('Payment', () =>
          Payment({ isShippingRequired: true }),
        ),
        ClickedBack: to('ShippingAddress', () => ShippingAddress()),
      },
    },
    Payment: {
      on: {
        ClickedContinue: to('Review', state =>
          Review({
            isShippingRequired: state.isShippingRequired,
            isTermsAccepted: false,
          }),
        ),
        ClickedBack: [
          when(
            state => state.isShippingRequired,
            to('ShippingMethod', () => ShippingMethod()),
          ),
          otherwise(
            to('Cart', state =>
              Cart({ isShippingRequired: state.isShippingRequired }),
            ),
          ),
        ],
      },
    },
    Review: {
      on: {
        AcceptedTerms: to('Review', state =>
          Review({
            isShippingRequired: state.isShippingRequired,
            isTermsAccepted: true,
          }),
        ),
        ClickedBack: to('Payment', state =>
          Payment({ isShippingRequired: state.isShippingRequired }),
        ),
        ClickedPlaceOrder: [
          when(
            state => state.isTermsAccepted,
            to('Placing', () => Placing()),
          ),
        ],
      },
    },
    Placing: {
      on: {
        SucceededPlaceOrder: to('Confirmed', (_state, message) =>
          Confirmed({ orderId: message.orderId }),
        ),
      },
    },
    GiftWrap: {
      on: {
        ClickedContinue: to('Review', () =>
          Review({ isShippingRequired: true, isTermsAccepted: false }),
        ),
      },
    },
  },
})

// TESTS

describe('checkout wizard machine', () => {
  it('skips the shipping steps for digital only carts, forward and back', () => {
    const digitalCart = Cart({ isShippingRequired: false })

    const [payment] = checkoutMachine.transition(digitalCart, ClickedContinue())
    expect(payment).toStrictEqual(Payment({ isShippingRequired: false }))

    const [backToCart] = checkoutMachine.transition(payment, ClickedBack())
    expect(backToCart).toStrictEqual(Cart({ isShippingRequired: false }))
  })

  it('walks the full physical goods path', () => {
    const [address] = checkoutMachine.transition(
      Cart({ isShippingRequired: true }),
      ClickedContinue(),
    )
    expect(address).toStrictEqual(ShippingAddress())

    const [method] = checkoutMachine.transition(address, ClickedContinue())
    const [payment] = checkoutMachine.transition(method, ClickedContinue())
    expect(payment).toStrictEqual(Payment({ isShippingRequired: true }))

    const [backToMethod] = checkoutMachine.transition(payment, ClickedBack())
    expect(backToMethod).toStrictEqual(ShippingMethod())

    const [review] = checkoutMachine.transition(payment, ClickedContinue())
    const [accepted] = checkoutMachine.transition(review, AcceptedTerms())
    const [placing] = checkoutMachine.transition(accepted, ClickedPlaceOrder())
    expect(placing).toStrictEqual(Placing())

    const [confirmed] = checkoutMachine.transition(
      placing,
      SucceededPlaceOrder({ orderId: 'order-9' }),
    )
    expect(confirmed).toStrictEqual(Confirmed({ orderId: 'order-9' }))
  })

  it('refuses to place an order before the terms are accepted', () => {
    const review = Review({ isShippingRequired: true, isTermsAccepted: false })
    const result = checkoutMachine.step(review, ClickedPlaceOrder())

    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Review',
      messageTag: 'ClickedPlaceOrder',
      state: review,
    })
  })

  it('catches the orphaned GiftWrap step left behind by a flow change', () => {
    expect(checkoutMachine.unreachableStates()).toEqual(['GiftWrap'])
    expect(checkoutMachine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'GiftWrap',
          messageTag: 'ClickedContinue',
          target: 'Review',
          guard: { _tag: 'Unguarded' },
        },
        reason: 'UnreachableSource',
      },
    ])
  })

  it('emits the flow diagram reviewers actually look at', () => {
    expect(checkoutMachine.toMermaid()).toBe(
      [
        'stateDiagram-v2',
        '  Cart',
        '  ShippingAddress',
        '  ShippingMethod',
        '  Payment',
        '  Review',
        '  Placing',
        '  Confirmed',
        '  GiftWrap',
        '  [*] --> Cart',
        '  Cart --> ShippingAddress: ClickedContinue [when 1]',
        '  Cart --> Payment: ClickedContinue [otherwise]',
        '  ShippingAddress --> ShippingMethod: ClickedContinue',
        '  ShippingAddress --> Cart: ClickedBack',
        '  ShippingMethod --> Payment: ClickedContinue',
        '  ShippingMethod --> ShippingAddress: ClickedBack',
        '  Payment --> Review: ClickedContinue',
        '  Payment --> ShippingMethod: ClickedBack [when 1]',
        '  Payment --> Cart: ClickedBack [otherwise]',
        '  Review --> Review: AcceptedTerms',
        '  Review --> Payment: ClickedBack',
        '  Review --> Placing: ClickedPlaceOrder [when 1]',
        '  Placing --> Confirmed: SucceededPlaceOrder',
        '  GiftWrap --> Review: ClickedContinue',
      ].join('\n'),
    )
  })
})
