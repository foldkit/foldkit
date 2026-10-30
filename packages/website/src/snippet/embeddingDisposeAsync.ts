import { Runtime } from 'foldkit'

import { makeElement as makeCartElement } from './cart'
import { makeElement as makeCheckoutElement } from './checkout'

const container = document.getElementById('widget-slot')
if (container === null) {
  throw new Error('Missing widget container')
}

let handle = Runtime.embed(makeCartElement(container))

// Replace the cart with the checkout in the same container. dispose would
// return before the cart's cleanup has finished, so wait for it first.
export const showCheckout = async () => {
  await handle.disposeAsync()
  handle = Runtime.embed(makeCheckoutElement(container))
}
