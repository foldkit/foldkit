const foldCheckout = Machine.fold({
  machine: checkoutMachine,
  read: (model: Model) => Option.some(model.checkout),
  write: (model, nextCheckout) => evo(model, { checkout: () => nextCheckout }),
})
