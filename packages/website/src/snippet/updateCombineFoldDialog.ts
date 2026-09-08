return Update.combine(model, [
  foldDialogClose,
  stepModel => ({
    model: evo(stepModel, { isSubmitting: () => false }),
  }),
])
