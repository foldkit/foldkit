return Update.combineSteps(model, [
  foldDialogClose,
  ApplicationBlock.makeFieldsStep(() => ({
    isSubmitting: () => false,
  })),
])
