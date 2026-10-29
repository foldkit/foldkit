const CheckoutDefinition = Machine.makeDefinition({
  State: CheckoutState,
  Message,
  Context: Schema.Struct({ inventory: Inventory }),
})

const checkoutMachine = CheckoutDefinition.makeMachine({
  initial: initialCheckout,
  states: checkoutTransitions,
})
