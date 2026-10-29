const maybeDiscount = CheckoutDefinition.makeGuard(
  { from: 'Review', on: 'SubmittedPromoCode' },
  ({ state }) => findDiscount(state.promoCodeInput),
)

const applyDiscountWhenFound = CheckoutDefinition.makeHandler(
  maybeDiscount,
  ({ state, guardValue: discount }) => ({
    model: applyDiscount(state, discount),
  }),
)

SubmittedPromoCode: [
  when(maybeDiscount, 'Review', applyDiscountWhenFound),
  otherwise(to('Review', ({ state }) => ({ model: rejectPromo(state) }))),
]
