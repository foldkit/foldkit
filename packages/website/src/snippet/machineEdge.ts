ClickedPlaceOrder: to('Placing', ({ state }) => ({
  model: CheckoutState.Placing({ order: state.order }),
  commands: [PlaceOrder({ order: state.order })],
}))
