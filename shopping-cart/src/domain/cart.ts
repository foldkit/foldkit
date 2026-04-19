import { Array, Number, Option, Predicate, Schema, pipe } from 'effect'
import { evo } from 'foldkit/struct'

import { CartItem, Item } from './item'

export const Cart = Schema.Array(CartItem)
export type Cart = typeof Cart.Type

const hasItemId =
  (itemId: string) =>
  (cartItem: CartItem): boolean =>
    cartItem.item.id === itemId

const mapCartItem = (itemId: string, f: (cartItem: CartItem) => CartItem) =>
  Array.map<Cart, CartItem>(cartItem =>
    hasItemId(itemId)(cartItem) ? f(cartItem) : cartItem,
  )

export const addItem =
  (item: Item) =>
  (cart: Cart): Cart => {
    const existingCartItem = Array.findFirst(cart, hasItemId(item.id))

    return Option.match(existingCartItem, {
      onNone: () => [...cart, { item, quantity: 1 }],
      onSome: () =>
        mapCartItem(
          item.id,
          evo({
            quantity: Number.increment,
          }),
        )(cart),
    })
  }

export const removeItem =
  (itemId: string) =>
  (cart: Cart): Cart =>
    Array.filter(cart, Predicate.not(hasItemId(itemId)))

export const changeQuantity = (itemId: string, quantity: number) =>
  quantity <= 0
    ? removeItem(itemId)
    : mapCartItem(
        itemId,
        evo({
          quantity: () => quantity,
        }),
      )

export const itemQuantity =
  (itemId: string) =>
  (cart: Cart): number =>
    pipe(
      cart,
      Array.findFirst<CartItem>(hasItemId(itemId)),
      Option.match({
        onNone: () => 0,
        onSome: ({ quantity }) => quantity,
      }),
    )

export const totalItems = (cart: Cart) =>
  Array.reduce(cart, 0, (total, { quantity }) => total + quantity)
