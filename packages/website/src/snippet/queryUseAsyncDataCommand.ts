// These result Messages describe the checkout's domain outcomes.
const Message = defineMessageUnion({
  ClickedPlaceOrder: {},
  SucceededSubmitOrder: { order: Order },
  FailedSubmitOrder: { error: Schema.String },
})
type Message = typeof Message.Type

const SubmitOrder = Command.define('SubmitOrder', {
  args: { orderDraft: OrderDraft },
  messages: [Message.SucceededSubmitOrder, Message.FailedSubmitOrder],
  execute: ({ orderDraft }) =>
    Orders.place(orderDraft).pipe(
      Effect.map(order => Message.SucceededSubmitOrder({ order })),
      Effect.catch(error =>
        Effect.succeed(Message.FailedSubmitOrder({ error })),
      ),
    ),
})
