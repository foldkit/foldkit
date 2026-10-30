import { Effect, Schema } from 'effect'
import { AsyncData, Block } from 'foldkit'
import { defineRouteUnion } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'

import {
  Message,
  Order,
  OrderDraft,
  Orders,
  SubmitOrder,
} from './queryUseAsyncDataCommand'

const ApplicationRoute = defineRouteUnion({
  Checkout: {},
  OrderConfirmation: { orderId: Schema.String },
})

const OrderData = AsyncData.Schema(Order, Schema.String)

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({
    orderDraft: OrderDraft,
    order: OrderData.schema,
    route: ApplicationRoute,
  }),
  Message,
  Command: [SubmitOrder],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const orders = yield* Orders

    return {
      model: {
        orderDraft: OrderDraft.make({ itemIds: [] }),
        order: OrderData.Idle(),
        route: ApplicationRoute.Checkout(),
      },
      update: {
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
            route: () =>
              ApplicationRoute.OrderConfirmation({ orderId: order.id }),
          }),
        }),
        // Failure stays in checkout with the domain error available to the view.
        FailedSubmitOrder: (model, { error }) => ({
          model: modifyFields(model, {
            order: () => OrderData.Failure({ error }),
          }),
        }),
      },
      commands: {
        SubmitOrder: ({ orderDraft }) =>
          orders.place(orderDraft).pipe(
            Effect.map(order => Message.SucceededSubmitOrder({ order })),
            Effect.catch(error =>
              Effect.succeed(Message.FailedSubmitOrder({ error })),
            ),
          ),
      },
    }
  }),
)
