const returnToCart = CheckoutDefinition.makeHandler(
  { from: 'Payment', on: 'ClickedBack' },
  ({ state }) => ({
    model: CheckoutState.Cart({
      isShippingRequired: state.isShippingRequired,
    }),
  }),
)

const paymentTransitions = CheckoutDefinition.makeTransitions('Payment', {
  on: {
    ClickedBack: [
      when(
        ({ state }) => state.isShippingRequired,
        'Shipping',
        () => ({ model: CheckoutState.Shipping() }),
      ),
      otherwise(to('Cart', returnToCart)),
    ],
  },
})
