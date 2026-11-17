import { Runtime } from 'foldkit'

import { makeElement as makeCartElement } from './cart'
import { makeElement as makeCheckoutElement } from './checkout'

const container = document.getElementById('widget-slot')
if (container === null) {
  throw new Error('Missing widget container')
}

const cartHandle = Runtime.embed(makeCartElement(container))

export const showCheckout = async () => {
  await cartHandle.disposeAsync()
  return Runtime.embed(makeCheckoutElement(container))
}
