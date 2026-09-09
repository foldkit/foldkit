to('Placing', ({ state }) => {
  const nextOrder = orderFromReview(state)

  return {
    model: CheckoutState.Placing({ order: nextOrder }),
    commands: [PlaceOrder({ order: nextOrder })],
  }
})
