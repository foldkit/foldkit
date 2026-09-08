to(
  'Placing',
  ({ state }) => CheckoutState.Placing({ order: orderFromReview(state) }),
  ({ state }) => [PlaceOrder({ order: orderFromReview(state) })],
)
