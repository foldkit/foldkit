import { makeFieldsStep } from './block'

return Update.combineSteps(model, [
  openDialog,
  makeFieldsStep(() => ({
    isSubmitting: () => false,
  })),
])
