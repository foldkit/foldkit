import { Context, Effect, Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const OrderDraft = Schema.Struct({
  itemIds: Schema.Array(Schema.String),
})
export type OrderDraft = typeof OrderDraft.Type

export const Order = Schema.Struct({ id: Schema.String, total: Schema.Number })
export type Order = typeof Order.Type

export class Orders extends Context.Service<
  Orders,
  Readonly<{ place: (orderDraft: OrderDraft) => Effect.Effect<Order, string> }>
>()('Orders') {}

// These result Messages describe the checkout's domain outcomes.
export const Message = defineMessageUnion({
  ClickedPlaceOrder: {},
  SucceededSubmitOrder: { order: Order },
  FailedSubmitOrder: { error: Schema.String },
})

export const SubmitOrder = Command.define('SubmitOrder', {
  args: { orderDraft: OrderDraft },
  messages: [Message.SucceededSubmitOrder, Message.FailedSubmitOrder],
})
