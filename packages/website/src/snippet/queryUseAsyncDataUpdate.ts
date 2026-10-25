const OrderData = AsyncData.Schema(Order, Schema.String)

const Model = Schema.Struct({
  orderDraft: OrderDraft,
  order: OrderData.schema,
  route: ApplicationRoute,
})

const update = ApplicationComposition.makeUpdate({
  ClickedPlaceOrder: model => ({
    model: modifyFields(model, {
      order: () => OrderData.Loading(),
    }),
    commands: [SubmitOrder({ orderDraft: model.orderDraft })],
  }),
  // Success changes both the request state and the application route.
  SucceededSubmitOrder: (model, { order }) => ({
    model: modifyFields(model, {
      order: () => OrderData.Success({ data: order }),
      route: () => ApplicationRoute.OrderConfirmation({ orderId: order.id }),
    }),
  }),
  // Failure stays in checkout with the domain error available to the view.
  FailedSubmitOrder: (model, { error }) => ({
    model: modifyFields(model, {
      order: () => OrderData.Failure({ error }),
    }),
  }),
})
