import {
  Command,
  click,
  expect,
  given,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { RadioGroup } from '@foldkit/ui'

import { PlaceOrder, SucceededPlaceOrder, initialModel, update } from './main'
import { view } from './view'

const resolveFocusOption = Command.resolve(
  RadioGroup.FocusOption,
  RadioGroup.CompletedFocusOption(),
)

describe('scene', () => {
  test('initial view shows the hardcover order and state machine inspector', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(role('heading', { name: 'Your order' })).toExist(),
      expect(role('radio', { name: 'Hardcover' })).toBeChecked(),
      expect(role('heading', { name: 'State machine inspector' })).toExist(),
      expect(text('stateDiagram-v2', { exact: false })).toExist(),
    )
  })

  test('digital order skips Shipping and can be confirmed', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('radio', { name: 'E-book' })),
      resolveFocusOption,
      expect(role('radio', { name: 'E-book' })).toBeChecked(),
      click(role('button', { name: 'Continue to payment' })),
      expect(role('heading', { name: 'Payment' })).toExist(),
      expect(role('button', { name: 'Review order' })).toBeDisabled(),
      click(role('checkbox', { name: 'Mastercard •••• 4242' })),
      expect(role('button', { name: 'Review order' })).toBeEnabled(),
      click(role('button', { name: 'Review order' })),
      expect(role('heading', { name: 'Review and place order' })).toExist(),
      expect(role('button', { name: 'Place order · $30.31' })).toBeDisabled(),
      click(role('checkbox', { name: 'Accept terms of sale' })),
      expect(role('button', { name: 'Place order · $30.31' })).toBeEnabled(),
      click(role('button', { name: 'Place order · $30.31' })),
      Command.expectExact(PlaceOrder({ isShippingRequired: false })),
      expect(role('heading', { name: 'Processing your order' })).toExist(),
      Command.resolve(
        PlaceOrder,
        SucceededPlaceOrder({ orderId: 'DIGI-1001' }),
      ),
      expect(text('Order DIGI-1001 confirmed')).toExist(),
    )
  })

  test('an applied promo code discounts the order total', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('radio', { name: 'E-book' })),
      resolveFocusOption,
      click(role('button', { name: 'Continue to payment' })),
      click(role('checkbox', { name: 'Mastercard •••• 4242' })),
      click(role('button', { name: 'Review order' })),
      type(label('Promo code'), 'reader10'),
      click(role('button', { name: 'Apply' })),
      expect(text('READER10 applied · 10% off')).toExist(),
      expect(text('Discount · READER10')).toExist(),
      expect(role('button', { name: 'Place order · $27.28' })).toExist(),
      type(label('Promo code'), 'bogus'),
      click(role('button', { name: 'Apply' })),
      expect(text("That code isn't recognized.")).toExist(),
      expect(role('button', { name: 'Place order · $30.31' })).toExist(),
    )
  })
})
