import { Duration, Effect, Schema } from 'effect'

import { ApplicationBlock } from './definition'
import { Message } from './message'

const PLACE_ORDER_DELAY = Duration.seconds(1)

export const PlaceOrder = ApplicationBlock.makeCommand('PlaceOrder', {
  args: { isShippingRequired: Schema.Boolean },
  messages: [Message.CompletedPlaceOrder],
  handler: function* () {
    return ({ isShippingRequired }) =>
      Effect.gen(function* () {
        yield* Effect.sleep(PLACE_ORDER_DELAY)
        return Message.CompletedPlaceOrder({
          orderId: isShippingRequired ? 'SHIP-1001' : 'DIGI-1001',
        })
      })
  },
})

export const EffectsLayer = PlaceOrder.layer
