return Update.combine(model, [
  foldDialogClose,
  stepModel => ({
    model: modifyFields(stepModel, { isSubmitting: () => false }),
  }),
])
