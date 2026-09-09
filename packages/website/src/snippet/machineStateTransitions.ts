const paymentTransitions: Machine.StateTransitions<
  CheckoutState,
  Message,
  'Payment'
> = {
  on: {
    ClickedBack: to('Cart', ({ state }) => ({
      model: CheckoutState.Cart({
        isShippingRequired: state.isShippingRequired,
      }),
    })),
  },
}
