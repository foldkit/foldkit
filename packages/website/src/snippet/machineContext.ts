const checkoutMachine = Machine.define({
  state: CheckoutState,
  message: Message,
  context: Schema.Struct({ inventory: Inventory }),
})({
  initial: initialCheckout,
  states: checkoutTransitions,
})
