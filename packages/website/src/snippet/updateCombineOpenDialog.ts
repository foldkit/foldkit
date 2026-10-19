return Update.combine(model, [
  openDialog,
  stepModel => ({
    model: modifyFields(stepModel, { isSubmitting: () => false }),
  }),
])
