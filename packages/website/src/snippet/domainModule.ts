// domain/cart.ts
import { Array, Option, Schema } from 'effect'
import { evo } from 'foldkit/struct'

import { CartItem, Item } from './item'

export const Cart = Schema.Array(CartItem)
export type Cart = typeof Cart.Type

export const addItem =
  (item: Item) =>
  (cart: Cart): Cart => {
    const existing = Array.findFirst(
      cart,
      cartItem => cartItem.item.id === item.id,
    )

    return Option.match(existing, {
      onNone: () => [...cart, { item, quantity: 1 }],
      onSome: () =>
        Array.map(cart, cartItem =>
          cartItem.item.id === item.id
            ? evo(cartItem, { quantity: quantity => quantity + 1 })
            : cartItem,
        ),
    })
  }

export const removeItem =
  (itemId: string) =>
  (cart: Cart): Cart =>
    Array.filter(cart, cartItem => cartItem.item.id !== itemId)

export const totalItems = (cart: Cart): number =>
  Array.reduce(cart, 0, (total, { quantity }) => total + quantity)
