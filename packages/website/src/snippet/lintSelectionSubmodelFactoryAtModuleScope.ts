import { RadioGroup } from '@foldkit/ui'

const sortRadioGroup = RadioGroup.create()

// ❌ Bad
// Re-creating the factory on each update gives it a fresh identity, so its
// internal selection state never persists.
const badUpdate = (model: Model, message: Message) => {
  const radioGroup = RadioGroup.create()
  return radioGroup.update(model.sort, message)
}

// ✅ Good
// Reuse the module-scope factory.
const goodUpdate = (model: Model, message: Message) =>
  sortRadioGroup.update(model.sort, message)
