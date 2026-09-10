import { expect, test } from 'vitest'

import { CheckoutState, Message, checkoutMachine } from './machineDefinition'

test('a digital order skips Shipping', () => {
  const transition = checkoutMachine.transition(
    CheckoutState.Cart({ isShippingRequired: false }),
    Message.ClickedContinue(),
  )

  expect(transition.model).toEqual(
    CheckoutState.Payment({ isShippingRequired: false }),
  )
})

test('every declared state and Edge is reachable', () => {
  expect(checkoutMachine.unreachableStates()).toEqual([])
  expect(checkoutMachine.deadTransitions()).toEqual([])
})
