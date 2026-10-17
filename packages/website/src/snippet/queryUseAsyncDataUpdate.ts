const OrderData = AsyncData.Schema(Order, Schema.String)

const Model = Schema.Struct({
  orderDraft: OrderDraft,
  order: OrderData.schema,
  route: ApplicationRoute,
})
type Model = typeof Model.Type

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedPlaceOrder: () => ({
      model: modifyFields(model, {
        order: () => OrderData.Loading(),
      }),
      commands: [SubmitOrder({ orderDraft: model.orderDraft })],
    }),
    // Success changes both the request state and the application route.
    SucceededSubmitOrder: ({ order }) => ({
      model: modifyFields(model, {
        order: () => OrderData.Success({ data: order }),
        route: () => ApplicationRoute.OrderConfirmation({ orderId: order.id }),
      }),
    }),
    // Failure stays in checkout with the domain error available to the view.
    FailedSubmitOrder: ({ error }) => ({
      model: modifyFields(model, {
        order: () => OrderData.Failure({ error }),
      }),
    }),
  }),
)
