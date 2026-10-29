const paymentTransitions = CheckoutDefinition.makeTransitions('Payment', {
  on: {
    ClickedBack: to('Cart', ({ state }) => ({
      model: CheckoutState.Cart({
        isShippingRequired: state.isShippingRequired,
      }),
    })),
  },
})
