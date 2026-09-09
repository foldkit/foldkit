return Update.combine(model, [
  openDialog,
  stepModel => ({
    model: evo(stepModel, { isSubmitting: () => false }),
  }),
])
