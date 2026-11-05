import { makeFieldsStep } from './block'

return Update.combineSteps(model, [
  foldDialogClose,
  makeFieldsStep(() => ({
    isSubmitting: () => false,
  })),
])
