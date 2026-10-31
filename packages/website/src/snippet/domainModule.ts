import { Array, Option, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'

// domain/item.ts
export const Item = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  price: Schema.Number,
})
export type Item = typeof Item.Type

// domain/cart.ts
export const CartItem = Schema.Struct({ item: Item, quantity: Schema.Number })
export type CartItem = typeof CartItem.Type

export const Cart = Schema.Array(CartItem)
export type Cart = typeof Cart.Type

export const addItem =
  (item: Item) =>
  (cart: Cart): Cart => {
    const maybeExisting = Array.findFirst(
      cart,
      cartItem => cartItem.item.id === item.id,
    )

    return Option.match(maybeExisting, {
      onNone: () => Array.append(cart, { item, quantity: 1 }),
      onSome: () =>
        Array.map(cart, cartItem =>
          cartItem.item.id === item.id
            ? modifyFields(cartItem, { quantity: quantity => quantity + 1 })
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
