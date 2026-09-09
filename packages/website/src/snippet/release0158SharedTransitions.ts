shared: [
  Machine.forStates(['Cart', 'Shipping', 'Payment', 'Review']).on({
    ClickedCancel: to('Cancelled', ({ state }) => ({
      model: CheckoutState.Cancelled({
        isShippingRequired: state.isShippingRequired,
      }),
    })),
  }),
]
