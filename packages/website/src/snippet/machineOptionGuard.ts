SubmittedPromoCode: [
  when(
    (_state, message) => findDiscount(message.code),
    'Review',
    ({ state, guardValue: discount }) => ({
      model: applyDiscount(state, discount),
    }),
  ),
  otherwise(to('Review', ({ state }) => ({ model: rejectPromo(state) }))),
]
