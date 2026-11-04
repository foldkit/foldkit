return Update.combineSteps(model, [
  openDialog,
  ApplicationBlock.makeFieldsStep(() => ({
    isSubmitting: () => false,
  })),
])
