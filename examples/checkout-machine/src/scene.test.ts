import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { PlaceOrder, SucceededPlaceOrder, initialModel, update } from './main'
import { view } from './view'

describe('scene', () => {
  test('initial view shows the hardcover order and state machine inspector', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('heading', { name: 'Your order' })).toExist(),
      Scene.expect(Scene.role('radio', { name: 'Hardcover' })).toBeChecked(),
      Scene.expect(
        Scene.role('heading', { name: 'State machine inspector' }),
      ).toExist(),
      Scene.expect(Scene.text('stateDiagram-v2', { exact: false })).toExist(),
    )
  })

  test('digital order skips Shipping and can be confirmed', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('radio', { name: 'E-book' })),
      Scene.expect(Scene.role('radio', { name: 'E-book' })).toBeChecked(),
      Scene.click(Scene.role('button', { name: 'Continue to payment' })),
      Scene.expect(Scene.role('heading', { name: 'Payment' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Review order' }),
      ).toBeDisabled(),
      Scene.click(Scene.role('checkbox', { name: 'Mastercard •••• 4242' })),
      Scene.expect(
        Scene.role('button', { name: 'Review order' }),
      ).toBeEnabled(),
      Scene.click(Scene.role('button', { name: 'Review order' })),
      Scene.expect(
        Scene.role('heading', { name: 'Review and place order' }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Place order · $30.31' }),
      ).toBeDisabled(),
      Scene.click(Scene.role('checkbox', { name: 'Accept terms of sale' })),
      Scene.expect(
        Scene.role('button', { name: 'Place order · $30.31' }),
      ).toBeEnabled(),
      Scene.click(Scene.role('button', { name: 'Place order · $30.31' })),
      Scene.Command.expectExact(PlaceOrder({ isShippingRequired: false })),
      Scene.expect(
        Scene.role('heading', { name: 'Processing your order' }),
      ).toExist(),
      Scene.Command.resolve(
        PlaceOrder,
        SucceededPlaceOrder({ orderId: 'DIGI-1001' }),
      ),
      Scene.expect(Scene.text('Order DIGI-1001 confirmed')).toExist(),
    )
  })

  test('an applied promo code discounts the order total', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('radio', { name: 'E-book' })),
      Scene.click(Scene.role('button', { name: 'Continue to payment' })),
      Scene.click(Scene.role('checkbox', { name: 'Mastercard •••• 4242' })),
      Scene.click(Scene.role('button', { name: 'Review order' })),
      Scene.type(Scene.label('Promo code'), 'reader10'),
      Scene.click(Scene.role('button', { name: 'Apply' })),
      Scene.expect(Scene.text('READER10 applied · 10% off')).toExist(),
      Scene.expect(Scene.text('Discount · READER10')).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Place order · $27.28' }),
      ).toExist(),
      Scene.type(Scene.label('Promo code'), 'bogus'),
      Scene.click(Scene.role('button', { name: 'Apply' })),
      Scene.expect(Scene.text("That code isn't recognized.")).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Place order · $30.31' }),
      ).toExist(),
    )
  })
})
